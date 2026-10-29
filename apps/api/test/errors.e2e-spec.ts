import type { INestApplication } from '@nestjs/common';
import { apiErrorSchema, type ApiError } from '@booking-flow/shared';
import request, { type Response } from 'supertest';
import { createTestApp } from './create-test-app';
import { LEAKY_ERROR_MESSAGE } from './probe.controller';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const validBooking = {
  roomId: '00000000-0000-4000-8000-000000000000',
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  guests: 2,
  guestName: 'Ada Lovelace',
  guestEmail: 'ada@example.com',
};

/** Parses strictly, so unexpected fields (stack traces, internals) fail the test too. */
function expectApiError(res: Response): ApiError {
  const body = apiErrorSchema.strict().parse(res.body);
  expect(body.statusCode).toBe(res.status);
  expect(body.requestId).toBe(res.headers['x-request-id']);
  return body;
}

describe('Error handling', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ZodValidationPipe', () => {
    it('passes valid input through', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/test-probe/validate')
        .send({ ...validBooking, guestName: '  Ada Lovelace  ' })
        .expect(201);

      expect(res.body).toEqual(validBooking);
    });

    it('returns 400 VALIDATION_FAILED with the field issues', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/test-probe/validate')
        .send({ ...validBooking, roomId: 'not-a-uuid', guests: 0, checkOut: '2026-11-30' })
        .expect(400);

      const body = expectApiError(res);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.path).toBe('/api/test-probe/validate');
      expect(body.issues?.map((issue) => issue.path).sort()).toEqual([
        'checkOut',
        'guests',
        'roomId',
      ]);
    });

    it('reports missing fields by name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/test-probe/validate')
        .send({})
        .expect(400);

      expect(expectApiError(res).issues).toEqual(
        expect.arrayContaining([{ path: 'guestEmail', message: 'Required' }]),
      );
    });
  });

  describe('exception filter', () => {
    it('maps an unknown route to 404 NOT_FOUND', async () => {
      const res = await request(app.getHttpServer()).get('/api/does-not-exist?q=1').expect(404);

      const body = expectApiError(res);
      expect(body.code).toBe('NOT_FOUND');
      expect(body.path).toBe('/api/does-not-exist');
    });

    it('maps unknown errors to 500 without leaking internals', async () => {
      const res = await request(app.getHttpServer()).get('/api/test-probe/crash').expect(500);

      const body = expectApiError(res);
      expect(body).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      expect(res.text).not.toContain(LEAKY_ERROR_MESSAGE);
    });

    it.each(['overlap', 'overlap-raw'])(
      'maps an exclusion violation (23P01) to 409 ROOM_NOT_AVAILABLE (%s)',
      async (route) => {
        const res = await request(app.getHttpServer()).post(`/api/test-probe/${route}`).expect(409);

        const body = expectApiError(res);
        expect(body.code).toBe('ROOM_NOT_AVAILABLE');
        expect(res.text).not.toContain('bookings_no_overlap_active');
      },
    );
  });

  describe('x-request-id', () => {
    it('reuses the incoming id on success and error responses', async () => {
      const ok = await request(app.getHttpServer())
        .get('/api/health')
        .set('x-request-id', 'client-req-123')
        .expect(200);
      expect(ok.headers['x-request-id']).toBe('client-req-123');

      const failed = await request(app.getHttpServer())
        .post('/api/test-probe/validate')
        .set('x-request-id', 'client-req-456')
        .send({})
        .expect(400);
      expect(failed.headers['x-request-id']).toBe('client-req-456');
      expect(expectApiError(failed).requestId).toBe('client-req-456');
    });

    it('generates a UUID when none is sent', async () => {
      const res = await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);

      expect(expectApiError(res).requestId).toMatch(UUID);
    });

    it('replaces an id that is too long or has unsafe characters', async () => {
      for (const unsafe of ['x'.repeat(129), 'abc def', '<script>']) {
        const res = await request(app.getHttpServer())
          .get('/api/does-not-exist')
          .set('x-request-id', unsafe)
          .expect(404);

        expect(expectApiError(res).requestId).toMatch(UUID);
      }
    });
  });
});
