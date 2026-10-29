import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorIssue, ErrorCode } from '@booking-flow/shared';

/** An error whose status, code and message are safe to send to the client as they are. */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly issues?: ApiErrorIssue[],
  ) {
    super(message, status);
  }
}
