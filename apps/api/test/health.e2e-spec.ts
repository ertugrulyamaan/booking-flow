import type { INestApplication } from '@nestjs/common';
import { apiErrorSchema } from '@booking-flow/shared';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Nothing listens on port 1, so every query fails fast with "can't reach database server".
const UNREACHABLE_DATABASE_URL =
  'postgresql://booking:unused@127.0.0.1:1/booking?connect_timeout=2';

describe('GET /api/health', () => {
  describe('database up', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.body).toEqual({ status: 'ok', database: 'up' });
      expect(res.headers['x-request-id']).toEqual(expect.any(String));
    });
  });

  describe('database down', () => {
    let app: INestApplication;

    beforeAll(async () => {
      // The app must still boot: PrismaService logs the failed connect instead of throwing.
      app = await createTestApp((builder) =>
        builder
          .overrideProvider(PrismaService)
          .useValue(new PrismaService(UNREACHABLE_DATABASE_URL)),
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 503 with the shared error shape', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(503);

      expect(apiErrorSchema.strict().parse(res.body)).toMatchObject({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        path: '/api/health',
        requestId: res.headers['x-request-id'],
      });
    });
  });
});
