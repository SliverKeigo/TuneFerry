import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './httpError';
import { extractPlaylistId, fetchPublicPlaylistViaEmbed } from './spotifyService';

// ---------------------------------------------------------------------------
// extractPlaylistId
// ---------------------------------------------------------------------------

describe('extractPlaylistId', () => {
  const valid = '37i9dQZF1DXcBWIGoYBM5M';

  it('returns a bare 22-char id unchanged', () => {
    expect(extractPlaylistId(valid)).toBe(valid);
  });

  it('parses a canonical open.spotify.com URL with ?si= tracking', () => {
    expect(
      extractPlaylistId(`https://open.spotify.com/playlist/${valid}?si=abcdef1234567890`),
    ).toBe(valid);
  });

  it('parses an embed-style URL', () => {
    expect(extractPlaylistId(`https://open.spotify.com/embed/playlist/${valid}`)).toBe(valid);
  });

  it('parses an open.spotify.com URL with a locale prefix (intl-ja)', () => {
    expect(extractPlaylistId(`https://open.spotify.com/intl-ja/playlist/${valid}`)).toBe(valid);
  });

  it('parses a spotify: URI', () => {
    expect(extractPlaylistId(`spotify:playlist:${valid}`)).toBe(valid);
  });

  it('throws HttpError(400) on garbage input', () => {
    expect(() => extractPlaylistId('not a url')).toThrow(HttpError);
    expect(() => extractPlaylistId('')).toThrow(HttpError);
    expect(() => extractPlaylistId('https://example.com/album/123')).toThrow(HttpError);
  });

  it('throws HttpError(400) on an id of the wrong length', () => {
    expect(() => extractPlaylistId('tooshort')).toThrow(HttpError);
    expect(() => extractPlaylistId('a'.repeat(21))).toThrow(HttpError);
    expect(() => extractPlaylistId('a'.repeat(23))).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// fetchPublicPlaylistViaEmbed (mocked fetch)
// ---------------------------------------------------------------------------

const PLAYLIST_ID = '2mZkGiUygMLEzNnawpo0Ya';

/**
 * Wraps an embed `__NEXT_DATA__` payload in a minimal HTML envelope that
 * matches what Spotify actually serves. Keep the script id literal — that's
 * what the production regex anchors on.
 */
function htmlWithEmbedPayload(payload: unknown): string {
  return [
    '<!doctype html><html><head></head><body>',
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`,
    '</body></html>',
  ].join('');
}

function makeTrack(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    uri: 'spotify:track:0JikhiAm2PPQ03QxNQulyR',
    title: 'A Song',
    subtitle: 'An Artist',
    duration: 190_515,
    audioPreview: { format: 'MP3_96', url: 'https://p.scdn.co/mp3-preview/abc' },
    entityType: 'track',
    ...overrides,
  };
}

function makeEmbedPayload(entity: Record<string, unknown>): Record<string, unknown> {
  return {
    props: {
      pageProps: {
        state: {
          data: {
            entity,
          },
        },
      },
    },
  };
}

describe('fetchPublicPlaylistViaEmbed', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('parses a happy-path playlist with multiple tracks and an artist split', async () => {
    const payload = makeEmbedPayload({
      type: 'playlist',
      name: 'Test Mix',
      description: 'a description',
      subtitle: 'Owner Name',
      coverArt: {
        sources: [
          { url: 'https://i.scdn.co/cover/large.jpg', width: 640, height: 640 },
          { url: 'https://i.scdn.co/cover/small.jpg', width: 64, height: 64 },
        ],
      },
      trackList: [
        makeTrack({
          uri: 'spotify:track:1111111111111111111111',
          title: 'Solo Song',
          subtitle: 'Artist A',
        }),
        makeTrack({
          uri: 'spotify:track:2222222222222222222222',
          title: 'Collab',
          subtitle: 'Artist B, Artist C & Artist D',
        }),
        // Non-track entries (e.g. ads, podcasts) must be skipped silently.
        makeTrack({
          uri: 'spotify:episode:9999999999999999999999',
          title: 'A Podcast Episode',
          subtitle: 'A Show',
          entityType: 'episode',
        }),
      ],
    });
    fetchMock.mockResolvedValueOnce(new Response(htmlWithEmbedPayload(payload), { status: 200 }));

    const playlist = await fetchPublicPlaylistViaEmbed(PLAYLIST_ID);

    expect(playlist.sourceType).toBe('spotify');
    expect(playlist.id).toBe(PLAYLIST_ID);
    expect(playlist.name).toBe('Test Mix');
    expect(playlist.owner).toEqual({ displayName: 'Owner Name' });
    expect(playlist.coverUrl).toBe('https://i.scdn.co/cover/large.jpg');
    expect(playlist.totalTracks).toBe(2);
    expect(playlist.tracks).toHaveLength(2);

    const [first, second] = playlist.tracks;
    expect(first?.sourceType).toBe('spotify');
    expect(first?.id).toBe('1111111111111111111111');
    expect(typeof first?.id).toBe('string');
    expect(first?.name).toBe('Solo Song');
    expect(first?.artists).toEqual(['Artist A']);
    expect(first?.previewUrl).toBe('https://p.scdn.co/mp3-preview/abc');

    expect(second?.artists).toEqual(['Artist B', 'Artist C', 'Artist D']);

    // Verifies we hit the embed URL with a desktop UA.
    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toBe(`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}`);
    const init = (call?.[1] ?? {}) as { headers?: Record<string, string> };
    const headers = new Headers(init.headers);
    expect(headers.get('user-agent')).toMatch(/Mozilla\/5\.0/);
  });

  it('handles an empty trackList', async () => {
    const payload = makeEmbedPayload({
      type: 'playlist',
      name: 'Empty',
      subtitle: 'Owner',
      trackList: [],
    });
    fetchMock.mockResolvedValueOnce(new Response(htmlWithEmbedPayload(payload), { status: 200 }));

    const playlist = await fetchPublicPlaylistViaEmbed(PLAYLIST_ID);
    expect(playlist.tracks).toHaveLength(0);
    expect(playlist.totalTracks).toBe(0);
  });

  it('throws HttpError(502) when __NEXT_DATA__ is missing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<!doctype html><html><body>nope</body></html>', { status: 200 }),
    );

    await expect(fetchPublicPlaylistViaEmbed(PLAYLIST_ID)).rejects.toMatchObject({
      status: 502,
      message: expect.stringMatching(/shape changed/),
    });
  });

  it('throws HttpError(502) on a non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }));

    await expect(fetchPublicPlaylistViaEmbed(PLAYLIST_ID)).rejects.toMatchObject({
      status: 502,
      message: expect.stringMatching(/Failed to fetch/),
    });
  });

  it('throws HttpError(404) when the entity is not a playlist', async () => {
    const payload = makeEmbedPayload({
      type: 'album',
      name: 'Some Album',
      trackList: [],
    });
    fetchMock.mockResolvedValueOnce(new Response(htmlWithEmbedPayload(payload), { status: 200 }));

    await expect(fetchPublicPlaylistViaEmbed(PLAYLIST_ID)).rejects.toMatchObject({
      status: 404,
      message: expect.stringMatching(/not found or shape/),
    });
  });
});
