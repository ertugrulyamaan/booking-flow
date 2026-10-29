export const TEST_DATABASE_NAME = 'booking_test';

/** The e2e tests use the server from DATABASE_URL, but always the `booking_test` database on it. */
export function testDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env or export it.');
  }
  const url = new URL(raw);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}
