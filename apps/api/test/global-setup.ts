import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_NAME, testDatabaseUrl } from './test-database';

const API_ROOT = join(__dirname, '..');

/** Recreates, migrates and seeds `booking_test` once per run, so every run starts from the same rows. */
export default async function globalSetup(): Promise<void> {
  const serverUrl = process.env.DATABASE_URL;
  const testUrl = testDatabaseUrl();

  const admin = new PrismaClient({ datasourceUrl: serverUrl });
  try {
    // Identifiers cannot be bound as parameters; the name is a constant, never user input.
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
  } finally {
    await admin.$disconnect();
  }

  const env = {
    ...process.env,
    DATABASE_URL: testUrl,
    NODE_ENV: 'test',
    SEED_ROOMS: '5',
    SEED_BOOKINGS: '100',
    SEED_RANDOM_SEED: '42',
  };
  run('prisma', ['migrate', 'deploy'], env);
  run('tsx', ['prisma/seed.ts'], env);
}

function run(bin: string, args: string[], env: NodeJS.ProcessEnv): void {
  execFileSync(join(API_ROOT, 'node_modules', '.bin', bin), args, {
    cwd: API_ROOT,
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
