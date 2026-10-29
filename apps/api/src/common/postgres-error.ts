import { Prisma } from '@prisma/client';

export const PG_EXCLUSION_VIOLATION = '23P01';

/**
 * Returns the Postgres SQLSTATE behind a Prisma error, if there is one.
 * Raw queries report it as `meta.code` on a P2010 error. Model queries hit by a constraint Prisma
 * does not know about (the exclusion constraint) throw an unknown request error that only carries
 * the SQLSTATE in its message.
 */
export function postgresErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = error.meta?.code;
    return typeof code === 'string' ? code : undefined;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /code: "([0-9A-Z]{5})"/.exec(error.message)?.[1];
  }
  return undefined;
}
