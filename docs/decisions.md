# Decision log

Short architecture decision records. Each one says what was chosen, why, and what was given up.

## ADR-001: pnpm workspaces, no Turborepo

**Decision:** A pnpm workspace with `apps/api`, `apps/web` and `packages/shared`.

**Why:** One install, one lockfile, and the shared package is linked locally. With two apps, Turborepo's task cache would save little CI time while adding another tool to configure and explain.

**Revisit when:** CI time grows noticeably, or more packages are added.

## ADR-002: Pending requests hold dates and expire

**Decision:** A booking request starts as `PENDING`, occupies the room immediately, and expires at `expires_at` unless an admin approves or rejects it first.

**Why:** Small hotels usually confirm requests by hand, so a request-and-approval flow is realistic. Holding the dates while the request is pending gives the guest a clear answer ("these dates are yours until the hotel replies"). It also creates the interesting engineering problems: expiry, the expire-vs-approve race, and cleanup before insert.

**Trade-off:** One slow admin can keep dates blocked until the hold expires. `PENDING_TTL` limits this.

**Alternative considered:** Only approved bookings occupy the room, and many requests can wait for the same dates. That is simpler, but the guest learns about a conflict only after the hotel looks at it.

## ADR-003: Double booking is prevented by an exclusion constraint

**Decision:** A PostgreSQL `EXCLUDE USING gist` constraint on `(room_id, daterange(check_in, check_out, '[)'))` for active statuses, added in a raw SQL migration.

**Why:** The rule lives in the database, so every code path is covered, including ones written later, scripts, and manual SQL. An application-level "check, then insert" has a race window between the check and the insert.

**Alternative:** `SELECT ... FOR UPDATE` on the room row before inserting. It works, but every code path that writes bookings has to remember to take the lock. A spike comparing the two approaches is planned for week 1.

## ADR-004: Shared zod schemas

**Decision:** Request and response schemas live in `packages/shared` as zod schemas. The web app and the API import the same schema.

**Why:** One source of truth for validation rules such as "check-out is after check-in" or "guests is a positive integer". Types are inferred from the schemas, so the two sides cannot drift apart.

## ADR-005: No online payments

**Decision:** The project has no payment step.

**Why:** Small hotels often take payment at check-in or by bank transfer after confirmation. Payments would add a large, unrelated domain. The project still needs a slow, unreliable external dependency to demonstrate timeouts and retries; guest notifications play that role.

## ADR-006: Single language

**Decision:** No i18n library. The UI is in English.

**Why:** Translations add files and routing complexity without adding to the engineering story. The structure keeps user-facing strings in one place, so adding i18n later stays straightforward.
