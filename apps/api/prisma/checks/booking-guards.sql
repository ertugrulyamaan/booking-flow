-- Exercises the booking guards with plain SQL, bypassing the application.
-- Everything runs in one transaction and is rolled back.
--
--   pnpm --filter @booking-flow/api db:check-guards

\set QUIET on
-- Only the NOTICE lines matter; hide the empty result rows of each SELECT.
\o /dev/null

BEGIN;

CREATE TEMP TABLE check_ctx AS
WITH room AS (
  INSERT INTO rooms (slug, name, description, capacity, base_price)
  VALUES ('guard-check-room', 'Guard check', 'Used by booking-guards.sql', 2, 100)
  RETURNING id
)
SELECT id AS room_id FROM room;

-- Inserts a booking for the check room. Returns the SQLSTATE it failed with, or NULL on success.
CREATE FUNCTION pg_temp.try_insert(
  p_check_in date,
  p_check_out date,
  p_status booking_status,
  p_expires_at timestamptz DEFAULT now() + interval '1 day'
) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO bookings (room_id, check_in, check_out, guests, guest_name, guest_email, status, expires_at)
  SELECT room_id, p_check_in, p_check_out, 1, 'Guard Check', 'guard@example.com', p_status, p_expires_at
  FROM check_ctx;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END;
$$;

CREATE FUNCTION pg_temp.expect(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL: % (expected %, got %)', label, coalesce(expected, 'success'), coalesce(actual, 'success');
  END IF;
  RAISE NOTICE 'ok: %', label;
END;
$$;

-- Baseline: a pending request for 10-12 Nov.
SELECT pg_temp.expect('first PENDING booking is accepted',
  pg_temp.try_insert('2026-11-10', '2026-11-12', 'PENDING'), NULL);

SELECT pg_temp.expect('overlapping PENDING is rejected (23P01)',
  pg_temp.try_insert('2026-11-11', '2026-11-13', 'PENDING'), '23P01');

SELECT pg_temp.expect('overlapping APPROVED is rejected (23P01)',
  pg_temp.try_insert('2026-11-09', '2026-11-11', 'APPROVED', NULL), '23P01');

SELECT pg_temp.expect('range inside an existing one is rejected (23P01)',
  pg_temp.try_insert('2026-11-10', '2026-11-11', 'PENDING'), '23P01');

SELECT pg_temp.expect('check-in on the previous check-out day is accepted ([) ranges)',
  pg_temp.try_insert('2026-11-12', '2026-11-14', 'APPROVED', NULL), NULL);

SELECT pg_temp.expect('check-out on the next check-in day is accepted ([) ranges)',
  pg_temp.try_insert('2026-11-08', '2026-11-10', 'PENDING'), NULL);

SELECT pg_temp.expect('inactive statuses may overlap (REJECTED)',
  pg_temp.try_insert('2026-11-10', '2026-11-12', 'REJECTED', NULL), NULL);

SELECT pg_temp.expect('inactive statuses may overlap (EXPIRED)',
  pg_temp.try_insert('2026-11-10', '2026-11-12', 'EXPIRED'), NULL);

SELECT pg_temp.expect('inactive statuses may overlap (CANCELLED)',
  pg_temp.try_insert('2026-11-10', '2026-11-12', 'CANCELLED', NULL), NULL);

-- The constraint does not know about time: an expired-but-unmarked PENDING row still blocks.
-- This is why the API expires stale rows before inserting.
SELECT pg_temp.expect('a PENDING booking whose hold has already passed is accepted',
  pg_temp.try_insert('2026-11-20', '2026-11-22', 'PENDING', now() - interval '1 hour'), NULL);

SELECT pg_temp.expect('that stale PENDING booking still blocks its dates (23P01)',
  pg_temp.try_insert('2026-11-21', '2026-11-23', 'PENDING'), '23P01');

UPDATE bookings SET status = 'EXPIRED'
WHERE room_id = (SELECT room_id FROM check_ctx) AND status = 'PENDING' AND expires_at <= now();

SELECT pg_temp.expect('after marking it EXPIRED, the dates are free again',
  pg_temp.try_insert('2026-11-21', '2026-11-23', 'PENDING'), NULL);

-- Reopening an inactive booking is also guarded, not only inserts.
DO $$
BEGIN
  UPDATE bookings SET status = 'APPROVED'
  WHERE room_id = (SELECT room_id FROM check_ctx) AND status = 'REJECTED';
  RAISE EXCEPTION 'FAIL: reactivating an overlapping REJECTED booking succeeded';
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'ok: reactivating an overlapping REJECTED booking is rejected (23P01)';
END;
$$;

SELECT pg_temp.expect('check_out must be after check_in (23514)',
  pg_temp.try_insert('2026-12-05', '2026-12-05', 'APPROVED', NULL), '23514');

SELECT pg_temp.expect('PENDING requires expires_at (23514)',
  pg_temp.try_insert('2026-12-10', '2026-12-12', 'PENDING', NULL), '23514');

ROLLBACK;
