# booking-flow

[![CI](https://github.com/ertugrulyamaan/booking-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/ertugrulyamaan/booking-flow/actions/workflows/ci.yml)

> 🚧 **Work in progress.** v1.0 is planned for late November 2026. See the [roadmap](#roadmap).

An end-to-end room booking flow for a small hotel, from the PostgreSQL schema to a production deploy.

A guest requests a room for a date range. The request **holds those dates** until the hotel approves or rejects it, or until the hold expires. The core guarantee is that **two active bookings for the same room can never overlap**. PostgreSQL enforces this with an exclusion constraint, so it holds even when application code has a bug or requests race.

## Goals

- Double booking is impossible at the database level, and a concurrency test proves it.
- Pending requests expire automatically, and the expire-vs-approve race is handled.
- Retries and double clicks are safe (`Idempotency-Key`).
- A slow, unreliable external dependency (notifications) is handled with timeouts, retries and an outbox.
- Every number in this README is measured, with the environment and commit hash next to it.

**Out of scope:** online payments, multiple properties, channel managers, i18n.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Monorepo   | pnpm workspaces                                     |
| API        | NestJS (TypeScript strict)                          |
| Web        | Next.js (App Router)                                |
| Database   | PostgreSQL 16, Prisma + raw SQL migrations          |
| Validation | zod, shared between web and API (`packages/shared`) |
| Tests      | Jest, supertest, Playwright                         |
| Infra      | Docker Compose, GitHub Actions                      |

## Getting started

Requirements: Node.js 24 (`.nvmrc`), pnpm via `corepack enable`, Docker.

```bash
cp .env.example .env
pnpm install                # also generates the Prisma client

# Database
docker compose up -d db                                  # PostgreSQL 16 on localhost:5432
pnpm --filter @booking-flow/api prisma:migrate:deploy    # schema + booking constraints
pnpm --filter @booking-flow/api prisma:seed              # resets and fills demo data
pnpm --filter @booking-flow/api db:check-guards          # 15 plain-SQL checks, all should print "ok"

# Apps
pnpm build
pnpm --filter @booking-flow/api start:dev   # http://localhost:3001/api/health
pnpm --filter @booking-flow/web dev         # http://localhost:3000
```

The seed is deterministic: the same parameters always produce the same rows. It **deletes all rooms and bookings** before inserting.

| Variable           | Default    | Meaning                       |
| ------------------ | ---------- | ----------------------------- |
| `SEED_ROOMS`       | `5`        | Number of rooms               |
| `SEED_BOOKINGS`    | `100`      | Number of bookings            |
| `SEED_RANDOM_SEED` | `42`       | Seed for the random generator |
| `SEED_START_DATE`  | today, UTC | First possible check-in date  |

```bash
SEED_ROOMS=50 SEED_BOOKINGS=20000 SEED_START_DATE=2026-11-01 pnpm --filter @booking-flow/api prisma:seed
```

| Command                                                 | What it does                                               |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm typecheck`                                        | Builds `packages/shared`, then type-checks every workspace |
| `pnpm build`                                            | Builds every workspace                                     |
| `pnpm test:e2e`                                         | API e2e tests against a fresh `booking_test` database      |
| `pnpm format` / `pnpm format:check`                     | Prettier                                                   |
| `pnpm --filter @booking-flow/api prisma:migrate:deploy` | Applies pending migrations                                 |
| `pnpm --filter @booking-flow/api prisma:seed`           | Resets and seeds the database                              |
| `pnpm --filter @booking-flow/api db:check-guards`       | Runs the booking guard checks inside the `db` container    |

## Roadmap

| Week | Focus                                                             | Status         |
| ---- | ----------------------------------------------------------------- | -------------- |
| 0    | Repo, data model draft, monorepo skeleton                         | ✅ Done        |
| 1    | Schema, exclusion constraint, availability, concurrency test      | 🟡 In progress |
| 2    | Hold expiry, idempotency, rate limits, error model                | ⬜             |
| 3    | Admin auth, availability page, booking form, Playwright → **MVP** | ⬜             |
| 4    | Deploy, measurements, README → **v1.0**                           | ⬜             |

Design notes: [`docs/data-model.md`](docs/data-model.md) · Decisions: [`docs/decisions.md`](docs/decisions.md)

## License

[MIT](LICENSE)
