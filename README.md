# booking-flow

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

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| API | NestJS (TypeScript strict) |
| Web | Next.js (App Router) |
| Database | PostgreSQL 16, Prisma + raw SQL migrations |
| Validation | zod, shared between web and API (`packages/shared`) |
| Tests | Jest, supertest, Playwright |
| Infra | Docker Compose, GitHub Actions |

## Roadmap

| Week | Focus | Status |
|---|---|---|
| 0 | Repo, data model draft, monorepo skeleton | 🟡 In progress |
| 1 | Schema, exclusion constraint, availability, concurrency test | ⬜ |
| 2 | Hold expiry, idempotency, rate limits, error model | ⬜ |
| 3 | Admin auth, availability page, booking form, Playwright → **MVP** | ⬜ |
| 4 | Deploy, measurements, README → **v1.0** | ⬜ |

Design notes: [`docs/data-model.md`](docs/data-model.md) · Decisions: [`docs/decisions.md`](docs/decisions.md)

## License

[MIT](LICENSE)
