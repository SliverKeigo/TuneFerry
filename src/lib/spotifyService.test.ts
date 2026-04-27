import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';
import {
  __resetAppTokenCacheForTests,
  extractPlaylistId,
  getAppToken,
  signState,
  verifyState,
} from './spotifyService';

// Spotify env vars aren't set in CI; populate them per test so the OAuth
// helpers don't throw config errors. Each suite restores afterwards.
async function withSpotifyEnv<T>(fn: () => T | Promise<T>): Promise<T> {
  const prev = {
    cid: env.spotifyClientId,
    cs: env.spotifyClientSecret,
    redir: env.spotifyRedirectUri,
    secret: env.spotifyStateSecret,
  };
  env.spotifyClientId = 'test-client-id';
  env.spotifyClientSecret = 'test-client-secret';
  env.spotifyRedirectUri = 'http://localhost:3000/api/spotify/auth/callback';
  env.spotifyStateSecret = 'super-secret-test-key';
  try {
    return await fn();
  } finally {
    env.spotifyClientId = prev.cid;
    env.spotifyClientSecret = prev.cs;
    env.spotifyRedirectUri = prev.redir;
    env.spotifyStateSecret = prev.secret;
  }
}

describe('extractPlaylistId', () => {
  const valid = '37i9dQZF1DXcBWIGoYBM5M';

  it('returns a bare 22-char id unchanged', () => {
    expect(extractPlaylistId(valid)).toBe(valid);
  });

  it('parses a canonical open.spotify.com URL with ?si= tracking', () => {
    const url = `https://open.spotify.com/playlist/${valid}?si=abcdef1234567890`;
    expect(extractPlaylistId(url)).toBe(valid);
  });

  it('parses an open.spotify.com URL with a locale prefix (intl-ja)', () => {
    const url = `https://open.spotify.com/intl-ja/playlist/${valid}`;
    expect(extractPlaylistId(url)).toBe(valid);
  });

  it('parses a spotify: URI', () => {
    expect(extractPlaylistId(`spotify:playlist:${valid}`)).toBe(valid);
  });

  it('returns null for garbage input', () => {
    expect(extractPlaylistId('not a url')).toBeNull();
    expect(extractPlaylistId('')).toBeNull();
    expect(extractPlaylistId('https://example.com/album/123')).toBeNull();
  });

  it('rejects an id of the wrong length', () => {
    expect(extractPlaylistId('tooshort')).toBeNull();
    expect(extractPlaylistId('a'.repeat(21))).toBeNull();
    expect(extractPlaylistId('a'.repeat(23))).toBeNull();
  });
});

describe('signState / verifyState', () => {
  it('round-trips a payload', async () => {
    await withSpotifyEnv(() => {
      const payload = { nonce: 'abc123', ts: Date.now() };
      const token = signState(payload);
      const decoded = verifyState(token);
      expect(decoded).toEqual(payload);
    });
  });

  it('rejects a tampered body', async () => {
    await withSpotifyEnv(() => {
      const token = signState({ nonce: 'abc', ts: Date.now() });
      const [body, sig] = token.split('.');
      // Flip a character in the body — sig will no longer match.
      const tampered = `${body?.slice(0, -1)}X.${sig}`;
      expect(verifyState(tampered)).toBeNull();
    });
  });

  it('rejects a tampered signature', async () => {
    await withSpotifyEnv(() => {
      const token = signState({ nonce: 'abc', ts: Date.now() });
      const [body, sig] = token.split('.');
      const tampered = `${body}.${sig?.slice(0, -1)}X`;
      expect(verifyState(tampered)).toBeNull();
    });
  });

  it('rejects a state older than maxAgeMs', async () => {
    await withSpotifyEnv(() => {
      const token = signState({ nonce: 'abc', ts: Date.now() - 10_000 });
      expect(verifyState(token, 1_000)).toBeNull();
    });
  });

  it('rejects a malformed token (no dot separator)', async () => {
    await withSpotifyEnv(() => {
      expect(verifyState('not-a-real-token')).toBeNull();
    });
  });
});

describe('getAppToken cache', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    __resetAppTokenCacheForTests();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    __resetAppTokenCacheForTests();
  });

  it('caches the token across calls until it expires', async () => {
    await withSpotifyEnv(async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: 'tok-1', token_type: 'Bearer', expires_in: 3600 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
      const a = await getAppToken();
      const b = await getAppToken();
      expect(a).toBe('tok-1');
      expect(b).toBe('tok-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches after the cache is reset (proxy for expiry)', async () => {
    await withSpotifyEnv(async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'tok-1', token_type: 'Bearer', expires_in: 3600 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'tok-2', token_type: 'Bearer', expires_in: 3600 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
      expect(await getAppToken()).toBe('tok-1');
      __resetAppTokenCacheForTests();
      expect(await getAppToken()).toBe('tok-2');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
