import { HttpStatus, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ApiException } from './api.exception';

/** Usage: `@Body(new ZodValidationPipe(createBookingRequestSchema)) body: CreateBookingRequest` */
export class ZodValidationPipe<T extends z.ZodTypeAny> implements PipeTransform<
  unknown,
  z.output<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_FAILED',
      'Request validation failed',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
}
