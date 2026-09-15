import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/middlewares/error-handler.middleware.js';

function mockResponse(headersSent: boolean) {
  const res = { headersSent, status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('logs the error and responds with a generic 500', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse(false);
    const error = new Error('db password is hunter2');

    errorHandler(error, {} as Request, res as unknown as Response, vi.fn() as NextFunction);

    expect(log).toHaveBeenCalledWith(expect.any(String), error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('does not try to write a response that has already been sent', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse(true);

    errorHandler(new Error('late'), {} as Request, res as unknown as Response, vi.fn() as NextFunction);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'Bad Request'],
    [413, 'Payload Too Large'],
  ])('passes through client error %i raised by Express middleware', (status, message) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse(false);
    const error = Object.assign(new Error('Unexpected end of JSON input'), { status, expose: true });

    errorHandler(error, {} as Request, res as unknown as Response, vi.fn() as NextFunction);

    expect(log).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: message });
  });

  it('does not trust a status on an error that is not marked as exposable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse(false);

    errorHandler(Object.assign(new Error('x'), { status: 400 }), {} as Request, res as unknown as Response, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
