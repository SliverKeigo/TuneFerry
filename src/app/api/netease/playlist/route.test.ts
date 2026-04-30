import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the NetEase service so the route test stays offline + deterministic.
vi.mock('@/lib/neteaseService', () => ({
  fetchPublicPlaylist: vi.fn(),
}));

import { fetchPublicPlaylist } from '@/lib/neteaseService';
import { GET } from './route';

const fetchMock = vi.mocked(fetchPublicPlaylist);

describe('GET /api/netease/playlist', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('400s when neither `url` nor `id` is provided', async () => {
    const res = await GET(new NextRequest('https://test/api/netease/playlist'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(400);
    expect(body.error.message).toMatch(/url|id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes `id` through to the service and returns the playlist as JSON', async () => {
    fetchMock.mockResolvedValue({
      sourceType: 'netease',
      id: '12345',
      name: '我的歌单',
      owner: { displayName: 'someone' },
      totalTracks: 1,
      tracks: [
        {
          sourceType: 'netease',
          id: 't1',
          name: '夜空中最亮的星',
          artists: ['逃跑计划'],
          durationMs: 252000,
        },
      ],
    });
    const res = await GET(new NextRequest('https://test/api/netease/playlist?id=12345'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; tracks: unknown[] };
    expect(body.id).toBe('12345');
    expect(body.tracks).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    // First arg is the raw id; second arg is the AbortSignal threaded from req.
    expect(fetchMock.mock.calls[0]?.[0]).toBe('12345');
  });

  it('falls back to `id` when only `url` is provided', async () => {
    fetchMock.mockResolvedValue({
      sourceType: 'netease',
      id: '12345',
      name: '',
      owner: { displayName: '' },
      totalTracks: 0,
      tracks: [],
    });
    await GET(
      new NextRequest(
        'https://test/api/netease/playlist?url=https%3A%2F%2Fmusic.163.com%2Fplaylist%3Fid%3D12345',
      ),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://music.163.com/playlist?id=12345');
  });

  it('forwards HttpError(404) from the service through the standard envelope', async () => {
    const { HttpError } = await import('@/lib/httpError');
    fetchMock.mockRejectedValue(new HttpError(404, 'Playlist not found or private'));
    const res = await GET(new NextRequest('https://test/api/netease/playlist?id=missing'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(404);
    expect(body.error.message).toMatch(/not found|private/);
  });

  it('forwards HttpError(429) when NetEase rate-limits the upstream call', async () => {
    const { HttpError } = await import('@/lib/httpError');
    fetchMock.mockRejectedValue(new HttpError(429, 'NetEase rate-limited the request'));
    const res = await GET(new NextRequest('https://test/api/netease/playlist?id=12345'));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(429);
    expect(body.error.message).toMatch(/rate/i);
  });

  it('forwards HttpError(502) when the upstream NetEase call fails', async () => {
    const { HttpError } = await import('@/lib/httpError');
    fetchMock.mockRejectedValue(new HttpError(502, 'NetEase request returned 500'));
    const res = await GET(new NextRequest('https://test/api/netease/playlist?id=12345'));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(502);
    expect(body.error.message).toMatch(/NetEase/);
  });

  it('returns a 500 envelope when the service throws a non-HttpError', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    const res = await GET(new NextRequest('https://test/api/netease/playlist?id=12345'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(500);
    expect(body.error.message).toBe('boom');
  });
});
