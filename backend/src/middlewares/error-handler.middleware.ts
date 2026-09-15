import { STATUS_CODES } from 'node:http';
import type { ErrorRequestHandler } from 'express';

interface HttpError {
  status?: unknown;
  expose?: unknown;
}

/** Client errors raised by Express middleware (body-parser: malformed JSON, too large, …). */
function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;
  const { status, expose } = err as HttpError;
  return expose === true && typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}

/** Last-resort handler: logs the error, never leaks internals to the client. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const clientStatus = clientErrorStatus(err);
  if (clientStatus !== null) {
    if (!res.headersSent) res.status(clientStatus).json({ error: STATUS_CODES[clientStatus] ?? 'Bad Request' });
    return;
  }

  console.error('[backend] unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal Server Error' });
};
