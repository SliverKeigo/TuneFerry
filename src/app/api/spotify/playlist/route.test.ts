import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the embed scraper so the route test stays offline + deterministic.
vi.mock('@/lib/spotifyService', () => ({
  fetchPublicPlaylistViaEmbed: vi.fn(),
}));

import { fetchPublicPlaylistViaEmbed } from '@/lib/spotifyService';
import { GET } from './route';

const fetchMock = vi.mocked(fetchPublicPlaylistViaEmbed);

describe('GET /api/spotify/playlist', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('400s when neither `url` nor `id` is provided', async () => {
    const res = await GET(new NextRequest('https://test/api/spotify/playlist'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(400);
    expect(body.error.message).toMatch(/url|id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes `url` through to the scraper and returns the playlist as JSON', async () => {
    fetchMock.mockResolvedValue({
      sourceType: 'spotify',
      id: 'abc123',
      name: 'My Playlist',
      owner: { displayName: 'someone' },
      totalTracks: 1,
      tracks: [
        {
          sourceType: 'spotify',
          id: 't1',
          name: 'Hello',
          artists: ['Adele'],
          durationMs: 295000,
        },
      ],
    });
    const res = await GET(
      new NextRequest(
        'https://test/api/spotify/playlist?url=https%3A%2F%2Fopen.spotify.com%2Fplaylist%2Fabc123',
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; tracks: unknown[] };
    expect(body.id).toBe('abc123');
    expect(body.tracks).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('https://open.spotify.com/playlist/abc123');
  });

  it('falls back to `id` when `url` is absent', async () => {
    fetchMock.mockResolvedValue({
      sourceType: 'spotify',
      id: 'abc123',
      name: '',
      owner: { displayName: '' },
      totalTracks: 0,
      tracks: [],
    });
    await GET(new NextRequest('https://test/api/spotify/playlist?id=abc123'));
    expect(fetchMock).toHaveBeenCalledWith('abc123');
  });

  it('forwards HttpError from the scraper through the standard envelope', async () => {
    const { HttpError } = await import('@/lib/httpError');
    fetchMock.mockRejectedValue(new HttpError(404, 'Playlist not found or shape unexpected'));
    const res = await GET(new NextRequest('https://test/api/spotify/playlist?id=missing'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string; status: number } };
    expect(body.error.status).toBe(404);
    expect(body.error.message).toMatch(/not found/);
  });
});
