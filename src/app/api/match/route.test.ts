import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the matcher so the route test exercises only body validation +
// response shaping. The matcher itself is covered by matchService.test.ts.
vi.mock('@/lib/matchService', () => ({
  matchMany: vi.fn(),
}));

import { matchMany } from '@/lib/matchService';
import { POST } from './route';

const matchManyMock = vi.mocked(matchMany);

const validTrack = {
  sourceType: 'spotify' as const,
  id: 'spotify-1',
  name: 'Hello',
  artists: ['Adele'],
  durationMs: 295000,
};

function postWith(body: unknown): NextRequest {
  return new NextRequest('https://test/api/match', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/match', () => {
  beforeEach(() => {
    matchManyMock.mockReset();
  });
  afterEach(() => {
    matchManyMock.mockReset();
  });

  it('returns 400 when body is not a JSON object', async () => {
    // Send malformed JSON
    const req = new NextRequest('https://test/api/match', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '%%not-json%%',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(matchManyMock).not.toHaveBeenCalled();
  });

  it('returns 400 when storefront is missing', async () => {
    const res = await POST(postWith({ tracks: [validTrack] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/storefront/);
  });

  it('returns 400 when tracks is empty', async () => {
    const res = await POST(postWith({ tracks: [], storefront: 'us' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/tracks/);
  });

  it('returns 400 when a track is missing required fields', async () => {
    const broken = { id: 'x', name: 'no artists field' };
    const res = await POST(postWith({ tracks: [broken], storefront: 'us' }));
    expect(res.status).toBe(400);
    expect(matchManyMock).not.toHaveBeenCalled();
  });

  it('returns 400 when over the per-request track cap', async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({
      ...validTrack,
      id: `t${i}`,
    }));
    const res = await POST(postWith({ tracks: many, storefront: 'us' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/Too many|500/);
  });

  it('happy path: forwards tracks + storefront to matchMany and wraps the result', async () => {
    matchManyMock.mockResolvedValue([
      {
        source: validTrack,
        apple: {
          id: 'apple-1',
          name: 'Hello',
          artistName: 'Adele',
          catalogUrl: 'https://music.apple.com/us/song/apple-1',
        },
        confidence: 'high',
        candidates: [],
        reason: 'fuzzy',
      },
    ]);
    const res = await POST(postWith({ tracks: [validTrack], storefront: 'us' }));
    expect(res.status).toBe(200);
    // Third arg is the AbortSignal forwarded from `req.signal`. We don't
    // construct one in the test harness, so just assert the call shape and
    // ignore signal identity.
    expect(matchManyMock).toHaveBeenCalledWith([validTrack], 'us', expect.anything());
    const body = (await res.json()) as { matches: Array<{ confidence: string }> };
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0]?.confidence).toBe('high');
  });
});
