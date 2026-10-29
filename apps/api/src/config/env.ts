import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string({ required_error: 'is required' })
    .regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  /** How long a PENDING booking holds its dates before it expires. */
  PENDING_TTL_MINUTES: z.coerce.number().int().positive().default(1440),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
}

/** Used by ConfigModule. Lists every bad variable by name; values are never printed. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new EnvValidationError(`Invalid environment variables:\n${lines.join('\n')}`);
}
