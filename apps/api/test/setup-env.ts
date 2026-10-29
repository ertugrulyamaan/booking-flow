import { testDatabaseUrl } from './test-database';

// Runs before each test file, so the app under test never touches the development database.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
