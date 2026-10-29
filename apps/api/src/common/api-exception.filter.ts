import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError, ErrorCode } from '@booking-flow/shared';
import type { Request, Response } from 'express';
import { ApiException } from './api.exception';
import { PG_EXCLUSION_VIOLATION, postgresErrorCode } from './postgres-error';
import { ensureRequestId } from './request-id';

type ErrorDetails = Pick<ApiError, 'statusCode' | 'code' | 'message' | 'issues'>;

const INTERNAL_ERROR: ErrorDetails = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'INTERNAL_ERROR',
  message: 'Internal server error',
};

/** Turns every exception into the shared `ApiError` body. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = ensureRequestId(req, res);
    const details = toErrorDetails(exception);

    if (!(exception instanceof HttpException) && details.code === 'INTERNAL_ERROR') {
      this.logger.error(
        `${req.method} ${req.path} failed (requestId=${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiError = {
      ...details,
      requestId,
      path: req.path,
      timestamp: new Date().toISOString(),
    };
    res.status(details.statusCode).json(body);
  }
}

function toErrorDetails(exception: unknown): ErrorDetails {
  if (exception instanceof ApiException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      ...(exception.issues && { issues: exception.issues }),
    };
  }
  if (postgresErrorCode(exception) === PG_EXCLUSION_VIOLATION) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: 'ROOM_NOT_AVAILABLE',
      message: 'The room is not available for the selected dates',
    };
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    if (statusCode >= 500) return { ...INTERNAL_ERROR, statusCode };
    return { statusCode, code: codeForClientError(statusCode), message: exception.message };
  }
  return INTERNAL_ERROR;
}

function codeForClientError(statusCode: number): ErrorCode {
  switch (statusCode) {
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'BAD_REQUEST';
  }
}
