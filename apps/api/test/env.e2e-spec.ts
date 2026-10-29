import { EnvValidationError, validateEnv } from '../src/config/env';

describe('validateEnv', () => {
  const valid = { DATABASE_URL: 'postgresql://booking:secret@localhost:5432/booking' };

  it('applies defaults', () => {
    expect(validateEnv(valid)).toEqual({
      NODE_ENV: 'development',
      DATABASE_URL: valid.DATABASE_URL,
      API_PORT: 3001,
      PENDING_TTL_MINUTES: 1440,
    });
  });

  it('names every bad variable without printing values', () => {
    const run = () =>
      validateEnv({
        DATABASE_URL: 'mysql://root:secret@db/x',
        API_PORT: 'abc',
        PENDING_TTL_MINUTES: '0',
      });

    expect(run).toThrow(EnvValidationError);
    expect(run).toThrow(/DATABASE_URL: must be a postgresql:\/\/ connection string/);
    expect(run).toThrow(/API_PORT: /);
    expect(run).toThrow(/PENDING_TTL_MINUTES: /);
    expect(run).not.toThrow(/secret/);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL: is required');
  });
});
