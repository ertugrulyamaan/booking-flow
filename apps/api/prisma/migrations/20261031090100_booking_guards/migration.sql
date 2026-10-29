-- Rules Prisma's schema language cannot express. See docs/data-model.md and ADR-003.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_capacity_check" CHECK ("capacity" > 0),
  ADD CONSTRAINT "rooms_base_price_check" CHECK ("base_price" >= 0);

ALTER TABLE "room_blocks"
  ADD CONSTRAINT "room_blocks_dates_check" CHECK ("end_date" > "start_date");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_dates_check" CHECK ("check_out" > "check_in"),
  ADD CONSTRAINT "bookings_guests_check" CHECK ("guests" > 0),
  ADD CONSTRAINT "bookings_pending_expires_check"
    CHECK ("status" <> 'PENDING' OR "expires_at" IS NOT NULL);

-- Two active bookings for the same room can never overlap. Dates are half-open [check_in, check_out),
-- so a check-out and the next check-in on the same day do not conflict.
-- The WHERE clause must match ACTIVE_BOOKING_STATUSES in packages/shared.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_active"
  EXCLUDE USING gist (
    "room_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'APPROVED'));
