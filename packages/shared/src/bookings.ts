import { z } from 'zod';
import { isoDateSchema, withDateRangeOrder } from './dates';

export const BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Statuses that occupy a room. Must match the exclusion constraint's WHERE clause. */
export const ACTIVE_BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
] as const satisfies readonly BookingStatus[];

export const createBookingRequestSchema = withDateRangeOrder(
  z.object({
    roomId: z.string().uuid(),
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.number().int().positive(),
    guestName: z.string().trim().min(1).max(120),
    guestEmail: z.string().trim().email().max(254),
    guestPhone: z.string().trim().max(40).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
  'checkIn',
  'checkOut',
);
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const availabilityQuerySchema = withDateRangeOrder(
  z.object({
    from: isoDateSchema,
    to: isoDateSchema,
  }),
  'from',
  'to',
);
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
