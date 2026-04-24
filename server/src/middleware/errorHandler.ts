import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { message: 'Route not found', status: 404 },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express' error-handling signature requires four args even if we don't use `next`.
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { message: err.message, status: err.status, details: err.details },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  res.status(500).json({
    error: { message, status: 500 },
  });
}
