import { z } from 'zod';

/** A calendar date without a time zone, e.g. `2026-11-14`. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format')
  // Date silently rolls 2026-02-30 over to March, so check that the date survives a round trip.
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date');

/**
 * Adds the rule shared by every half-open date range `[start, end)`: the end comes after the start.
 * ISO dates compare correctly as strings, so no parsing is needed.
 */
export function withDateRangeOrder<T extends z.ZodTypeAny>(
  schema: T,
  startKey: string,
  endKey: string,
) {
  return schema.refine((value: Record<string, string>) => value[endKey]! > value[startKey]!, {
    message: `${endKey} must be after ${startKey}`,
    path: [endKey],
  });
}
