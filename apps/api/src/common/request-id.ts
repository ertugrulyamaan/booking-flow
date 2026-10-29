import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

// Incoming ids end up in logs and headers, so anything unusual is replaced instead of echoed.
const VALID_REQUEST_ID = /^[\w.:-]{1,128}$/;

/** Returns the id of this request, assigning one and setting the response header on first use. */
export function ensureRequestId(req: Request, res: Response): string {
  const existing = res.getHeader(REQUEST_ID_HEADER);
  if (typeof existing === 'string') return existing;

  const incoming = req.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  ensureRequestId(req, res);
  next();
}
