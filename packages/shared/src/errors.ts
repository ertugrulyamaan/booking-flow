import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'ROOM_NOT_AVAILABLE',
  'BOOKING_NOT_PENDING',
  'IDEMPOTENCY_KEY_REUSED',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'BAD_REQUEST',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** One problem with the request input. `path` is the dotted field path, e.g. `checkOut`. */
export const apiErrorIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type ApiErrorIssue = z.infer<typeof apiErrorIssueSchema>;

/** Body of every non-2xx API response. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: errorCodeSchema,
  message: z.string(),
  /** Present when `code` is `VALIDATION_FAILED`. */
  issues: z.array(apiErrorIssueSchema).optional(),
  requestId: z.string(),
  path: z.string(),
  timestamp: z.string().datetime(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
