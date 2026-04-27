import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { HttpError } from './httpError';
import { pickHeader, pickInt, pickQuery, withErrorHandler } from './nextHandler';

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

describe('pickQuery', () => {
  it('returns the value when present', () => {
    const req = new NextRequest('https://test/x?term=adele&limit=10');
    expect(pickQuery(req, 'term')).toBe('adele');
    expect(pickQuery(req, 'limit')).toBe('10');
  });

  it('returns undefined when missing', () => {
    const req = new NextRequest('https://test/x?term=adele');
    expect(pickQuery(req, 'storefront')).toBeUndefined();
  });

  it('treats empty string as undefined', () => {
    const req = new NextRequest('https://test/x?term=');
    expect(pickQuery(req, 'term')).toBeUndefined();
  });
});

describe('pickHeader', () => {
  it('reads case-insensitively', () => {
    const req = new NextRequest('https://test/x', {
      headers: { 'X-Music-User-Token': 'abc123' },
    });
    expect(pickHeader(req, 'x-music-user-token')).toBe('abc123');
    expect(pickHeader(req, 'X-Music-User-Token')).toBe('abc123');
  });

  it('returns undefined when header is absent', () => {
    const req = new NextRequest('https://test/x');
    expect(pickHeader(req, 'x-missing')).toBeUndefined();
  });
});

describe('pickInt', () => {
  it('parses a numeric string', () => {
    expect(pickInt('25')).toBe(25);
    expect(pickInt('0')).toBe(0);
    expect(pickInt('-5')).toBe(-5);
  });

  it('returns undefined for invalid input', () => {
    expect(pickInt(undefined)).toBeUndefined();
    expect(pickInt('')).toBeUndefined();
    expect(pickInt('abc')).toBeUndefined();
  });

  it('handles edge numerics consistently', () => {
    // Number('Infinity') is finite=false; should return undefined
    expect(pickInt('Infinity')).toBeUndefined();
    expect(pickInt('NaN')).toBeUndefined();
  });
});
