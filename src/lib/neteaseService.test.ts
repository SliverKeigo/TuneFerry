import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import playlistFixture from './__fixtures__/netease-playlist-v6.json' with { type: 'json' };
import songDetailFixture from './__fixtures__/netease-song-detail.json' with { type: 'json' };
import { HttpError } from './httpError';
import { extractPlaylistId, fetchPublicPlaylist } from './neteaseService';

// ---------------------------------------------------------------------------
// extractPlaylistId
// ---------------------------------------------------------------------------

describe('extractPlaylistId', () => {
  it('parses a canonical music.163.com URL', () => {
    expect(extractPlaylistId('https://music.163.com/playlist?id=12345')).toBe('12345');
  });

  it('parses a legacy hash-routed URL', () => {
    // The `#/playlist?id=...` form puts the query in the fragment; standard
    // URL parsers would miss it, so this asserts our hash-stripping path.
    expect(extractPlaylistId('https://music.163.com/#/playlist?id=12345')).toBe('12345');
  });

  it('parses the y.music.163.com mobile URL', () => {
    expect(extractPlaylistId('https://y.music.163.com/m/playlist?id=12345')).toBe('12345');
  });

  it('parses the /m/ mobile-path URL', () => {
    // Note: the host has no `m.` subdomain; `m/` is a path segment under
    // music.163.com. Distinct from the y.music.163.com mobile subdomain.
    expect(extractPlaylistId('https://music.163.com/m/playlist?id=12345')).toBe('12345');
  });

  it('rejects a URL on an unrelated host', () => {
    // Without a hostname check, `?id=<digits>` on any domain would parse —
    // pin the function to NetEase URLs only.
    expect(() => extractPlaylistId('https://example.com/playlist?id=12345')).toThrow(HttpError);
    expect(() => extractPlaylistId('https://example.com/playlist?id=12345')).toThrow(
      /Not a NetEase playlist URL/,
    );
  });

  it('still accepts the y.music.163.com mobile subdomain after host check', () => {
    // Sanity-check that the new host validation hasn't broken legitimate
    // music.163.com subdomains.
    expect(extractPlaylistId('https://y.music.163.com/m/playlist?id=12345')).toBe('12345');
  });

  it('returns a bare numeric id unchanged', () => {
    expect(extractPlaylistId('12345')).toBe('12345');
    expect(extractPlaylistId('  13860798511  ')).toBe('13860798511');
  });

  it('throws HttpError(400) on garbage input', () => {
    expect(() => extractPlaylistId('not-a-url')).toThrow(HttpError);
    expect(() => extractPlaylistId('not-a-url')).toThrow(/Could not parse/);
  });

  it('throws HttpError(400) on a URL without an id param', () => {
    expect(() => extractPlaylistId('https://music.163.com/playlist')).toThrow(HttpError);
  });

  it('throws HttpError(400) on an empty string', () => {
    expect(() => extractPlaylistId('')).toThrow(HttpError);
    expect(() => extractPlaylistId('   ')).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// fetchPublicPlaylist (mocked fetch)
// ---------------------------------------------------------------------------

const PLAYLIST_ID = '13860798511';

/** Build a synthetic playlist-detail response with `n` track IDs.
 *  Used by the batching test where the real fixture's 58 ids isn't enough
 *  to exercise multi-chunk slicing. */
function makePlaylistFixtureWithIds(n: number): unknown {
  const trackIds = Array.from({ length: n }, (_, i) => ({ id: 1_000_000 + i }));
  return {
    code: 200,
    playlist: {
      id: 999_999,
      name: 'Synthetic',
      coverImgUrl: 'https://example.com/cover.jpg',
      trackCount: n,
      creator: { nickname: 'Tester' },
      trackIds,
    },
  };
}

/** Build a song/detail response of length `n` with predictable IDs. */
function makeSongDetailFixture(startId: number, count: number): unknown {
  const songs = Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Song ${startId + i}`,
    artists: [{ name: 'Artist' }],
    album: { name: 'Album', picUrl: 'https://example.com/p.jpg' },
    duration: 200_000,
  }));
  return { code: 200, songs };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('fetchPublicPlaylist', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('parses the v6 + song/detail fixtures into a SourcePlaylist', async () => {
    // The real v6 fixture has 58 trackIds. Our service ignores v6's `tracks[]`
    // and re-fetches via song/detail, so we mock a song/detail response that
    // covers all 58 ids by repeating the 2-song fixture. (Order doesn't
    // matter for these assertions; we only check shape + sourceType.)
    const trackIds = playlistFixture.playlist.trackIds;
    const fixtureSongs = songDetailFixture.songs;
    const trackCount = trackIds.length;
    const songs = Array.from({ length: trackCount }, (_, i) => {
      const template = fixtureSongs[i % fixtureSongs.length];
      const trackIdEntry = trackIds[i];
      if (!template || !trackIdEntry) throw new Error('fixture index out of range');
      return { ...template, id: trackIdEntry.id };
    });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(playlistFixture))
      .mockResolvedValueOnce(jsonResponse({ code: 200, songs }));

    const playlist = await fetchPublicPlaylist(PLAYLIST_ID);

    expect(playlist.sourceType).toBe('netease');
    expect(playlist.id).toBe(String(playlistFixture.playlist.id));
    expect(typeof playlist.id).toBe('string');
    expect(playlist.name).toBe(playlistFixture.playlist.name);
    expect(playlist.owner.displayName).toBe(playlistFixture.playlist.creator.nickname);
    expect(playlist.coverUrl).toBe(playlistFixture.playlist.coverImgUrl);
    expect(playlist.totalTracks).toBe(playlistFixture.playlist.trackCount);
    expect(playlist.tracks).toHaveLength(trackCount);

    for (const track of playlist.tracks) {
      expect(track.sourceType).toBe('netease');
      expect(typeof track.id).toBe('string');
      expect(track.previewUrl).toBeUndefined();
      expect(track.isrc).toBeUndefined();
    }

    // First track from the song/detail fixture, mapped through normalizeSong.
    const first = playlist.tracks[0];
    const fixtureFirst = songDetailFixture.songs[0];
    if (!first || !fixtureFirst) throw new Error('expected first track + fixture song');
    expect(first.name).toBe(fixtureFirst.name);
    expect(first.artists).toEqual([fixtureFirst.artists[0]?.name]);
    expect(first.durationMs).toBe(fixtureFirst.duration);
    expect(first.albumName).toBe(fixtureFirst.album.name);
    expect(first.coverUrl).toBe(fixtureFirst.album.picUrl);
  });

  it('sends desktop UA + Referer headers on every fetch', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(makePlaylistFixtureWithIds(2)))
      .mockResolvedValueOnce(jsonResponse(makeSongDetailFixture(1_000_000, 2)));

    await fetchPublicPlaylist(PLAYLIST_ID);

    for (const call of fetchMock.mock.calls) {
      const init = (call[1] ?? {}) as { headers?: Record<string, string> };
      const headers = new Headers(init.headers);
      expect(headers.get('user-agent')).toMatch(/Mozilla\/5\.0/);
      expect(headers.get('referer')).toBe('https://music.163.com/');
    }

    // Lock down the exact v6 URL build so a future template typo (e.g.
    // dropping `?id=` or mis-spelling the path) is caught here.
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `https://music.163.com/api/v6/playlist/detail?id=${PLAYLIST_ID}`,
    );
  });

  it('throws HttpError(404) when v6 returns code !== 200 (private/missing)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 401, playlist: null }));

    await expect(fetchPublicPlaylist(PLAYLIST_ID)).rejects.toMatchObject({
      status: 404,
      message: expect.stringMatching(/not found or private/),
    });
    // We must NOT issue a song/detail call when the playlist is gated.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws HttpError(429) when fetch returns 429', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }));

    await expect(fetchPublicPlaylist(PLAYLIST_ID)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/rate-limited/),
    });
  });

  it('throws HttpError(502) on a generic non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }));

    await expect(fetchPublicPlaylist(PLAYLIST_ID)).rejects.toMatchObject({
      status: 502,
      message: expect.stringMatching(/returned 503/),
    });
  });

  it('batches large trackIds into chunks of 100', async () => {
    // 250 ids → 3 song-detail batches: 100, 100, 50.
    fetchMock.mockResolvedValueOnce(jsonResponse(makePlaylistFixtureWithIds(250)));
    fetchMock.mockResolvedValueOnce(jsonResponse(makeSongDetailFixture(1_000_000, 100)));
    fetchMock.mockResolvedValueOnce(jsonResponse(makeSongDetailFixture(1_000_100, 100)));
    fetchMock.mockResolvedValueOnce(jsonResponse(makeSongDetailFixture(1_000_200, 50)));

    const playlist = await fetchPublicPlaylist(PLAYLIST_ID);

    // 1 v6 call + 3 song/detail calls.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(playlist.tracks).toHaveLength(250);

    // Verify the song/detail URLs pass `ids` as a JSON-array-shaped,
    // URI-encoded string. The encoded brackets must be `%5B` / `%5D` and
    // commas `%2C`.
    const songDetailUrls = fetchMock.mock.calls.slice(1).map((c) => String(c[0]));
    for (const url of songDetailUrls) {
      expect(url).toContain('/api/song/detail?ids=%5B');
      expect(url).toContain('%5D');
      expect(url).toContain('%2C');
    }
  });

  it('honors AbortSignal — aborting before v6 completes throws AbortError', async () => {
    const controller = new AbortController();

    // Implement fetch as a hand-rolled abort-aware promise so we can verify
    // the signal is actually plumbed through (a passive resolved-Response
    // mock would never observe the abort).
    fetchMock.mockImplementation((_url, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const promise = fetchPublicPlaylist(PLAYLIST_ID, controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    // Only the v6 call should have been issued; song/detail must be skipped.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles a playlist with zero trackIds without issuing song/detail', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makePlaylistFixtureWithIds(0)));

    const playlist = await fetchPublicPlaylist(PLAYLIST_ID);
    expect(playlist.tracks).toEqual([]);
    // No song/detail call when there are no IDs to look up.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws HttpError(502) when song/detail returns a non-200 code', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(makePlaylistFixtureWithIds(2)))
      .mockResolvedValueOnce(jsonResponse({ code: 500, songs: [] }));

    await expect(fetchPublicPlaylist(PLAYLIST_ID)).rejects.toMatchObject({
      status: 502,
      message: expect.stringMatching(/song\/detail returned code 500/),
    });
  });
});
