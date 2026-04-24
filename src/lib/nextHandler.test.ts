import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { HttpError } from './httpError';
import { withErrorHandler } from './nextHandler';

describe('withErrorHandler', () => {
  it('passes through a successful response untouched', async () => {
    const wrapped = withErrorHandler(async () => NextResponse.json({ ok: true }));
    const res = await wrapped(new NextRequest('https://test/x'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('converts HttpError into the standard error envelope with matching status', async () => {
    const wrapped = withErrorHandler(async () => {
      throw new HttpError(400, 'bad', { foo: 'bar' });
    });
    const res = await wrapped(new NextRequest('https://test/x'));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: { message: 'bad', status: 400, details: { foo: 'bar' } },
    });
  });

  it('returns 500 on a generic Error', async () => {
    const wrapped = withErrorHandler(async () => {
      throw new Error('boom');
    });
    const res = await wrapped(new NextRequest('https://test/x'));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: { message: 'boom', status: 500 },
    });
  });

  it('returns 500 with a default message when a non-Error is thrown', async () => {
    const wrapped = withErrorHandler(async () => {
      throw 'not-an-error';
    });
    const res = await wrapped(new NextRequest('https://test/x'));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: { message: 'Internal server error', status: 500 },
    });
  });
});
