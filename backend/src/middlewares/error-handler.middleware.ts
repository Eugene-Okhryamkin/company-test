import type { ErrorRequestHandler } from 'express';

/** Last-resort handler: logs the error, never leaks internals to the client. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[backend] unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal Server Error' });
};
