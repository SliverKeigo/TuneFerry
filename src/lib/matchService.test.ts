import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';
import { jaccard, matchOne, normalize, score, tokenize } from './matchService';
import type { AppleSongLite } from './matchService';
import type { SourceTrack } from './types/source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sourceFixture(overrides: Partial<SourceTrack> = {}): SourceTrack {
  return {
    sourceType: 'spotify',
    id: '6rqhFgbbKwnb9MLmUQDhG6',
    name: 'Hey Jude',
    artists: ['The Beatles'],
    durationMs: 425_000,
    ...overrides,
  };
}

function appleSongResource(overrides: {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  durationInMillis?: number;
  url?: string;
}) {
  return {
    id: overrides.id,
    type: 'songs',
    attributes: {
      name: overrides.name,
      artistName: overrides.artistName,
      albumName: overrides.albumName ?? overrides.name,
      durationInMillis: overrides.durationInMillis ?? 425_000,
      url: overrides.url ?? `https://music.apple.com/us/song/${overrides.id}`,
      artwork: { url: 'https://example.com/{w}x{h}{c}.{f}', width: 1000, height: 1000 },
    },
  };
}

function appleSongLite(overrides: Partial<AppleSongLite> = {}): AppleSongLite {
  return {
    id: '1',
    name: 'Hey Jude',
    artistName: 'The Beatles',
    albumName: 'Hey Jude',
    durationMs: 425_000,
    catalogUrl: 'https://music.apple.com/us/song/1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalize / tokenize / jaccard
// ---------------------------------------------------------------------------

describe('normalize', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalize('  Hey   Jude  ')).toBe('hey jude');
  });

  it('strips parenthetical "(Remastered 2009)"', () => {
    expect(normalize('Hey Jude (Remastered 2009)')).toBe('hey jude');
  });

  it('strips "- Live at ..." dash suffix', () => {
    expect(normalize('Hey Jude - Live at Wembley')).toBe('hey jude');
  });

  it('strips "(feat. X)"', () => {
    expect(normalize('Old Town Road (feat. Billy Ray Cyrus)')).toBe('old town road');
  });

  it('drops trailing "feat. X" outside parens', () => {
    expect(normalize('Old Town Road feat. Billy Ray Cyrus')).toBe('old town road');
  });

  it('removes punctuation', () => {
    expect(normalize("Don't Stop Me Now!")).toBe('don t stop me now');
  });
});

describe('tokenize / jaccard', () => {
  it('tokenize splits on whitespace after normalize', () => {
    expect(tokenize('Hey, Jude!')).toEqual(['hey', 'jude']);
  });

  it('jaccard returns 1 for identical sets', () => {
    expect(jaccard(['a', 'b'], ['b', 'a'])).toBe(1);
  });

  it('jaccard returns 0 for disjoint sets', () => {
    expect(jaccard(['a'], ['b'])).toBe(0);
  });

  it('jaccard handles partial overlap', () => {
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5);
  });
});

describe('score', () => {
  it('returns ~1 for an exact name+artist match within duration tolerance', () => {
    const s = score(sourceFixture(), appleSongLite());
    expect(s).toBeGreaterThanOrEqual(0.95);
  });

  it('penalises a >8s duration mismatch by 0.7', () => {
    const baseScore = score(sourceFixture(), appleSongLite());
    const penalised = score(sourceFixture(), appleSongLite({ durationMs: 425_000 + 30_000 }));
    expect(penalised).toBeCloseTo(baseScore * 0.7, 2);
  });

  it('drops sharply when artist name is wrong', () => {
    const s = score(sourceFixture(), appleSongLite({ artistName: 'Some Cover Band' }));
    expect(s).toBeLessThan(0.7);
  });
});

// ---------------------------------------------------------------------------
// matchOne (mocked Apple endpoint)
// ---------------------------------------------------------------------------

describe('matchOne', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let prevDeveloperToken: string | undefined;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    // appleFetch reads the developer token from env (already loaded). Override
    // it in-memory so we never have to touch real Apple credentials in tests.
    prevDeveloperToken = env.prebakedDeveloperToken;
    env.prebakedDeveloperToken = 'test-developer-token';
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    env.prebakedDeveloperToken = prevDeveloperToken;
  });

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('high-confidence fuzzy hit', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: {
          songs: {
            data: [
              appleSongResource({ id: '42', name: 'Hey Jude', artistName: 'The Beatles' }),
              appleSongResource({
                id: '43',
                name: 'Hey Jude (Cover)',
                artistName: 'Random Artist',
                durationInMillis: 200_000,
              }),
            ],
          },
        },
      }),
    );

    const result = await matchOne({ source: sourceFixture(), storefront: 'us' });
    expect(result.confidence).toBe('high');
    expect(result.reason).toBe('fuzzy');
    expect(result.apple?.id).toBe('42');
    // Exactly one fuzzy search call — there's no ISRC pre-flight anymore.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('/catalog/us/search');
  });

  it('low-confidence when artist is partly off (e.g. cover band)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: {
          songs: {
            data: [
              appleSongResource({
                id: '99',
                name: 'Hey Jude',
                artistName: 'The Beatles Cover',
                durationInMillis: 425_000,
              }),
            ],
          },
        },
      }),
    );

    const result = await matchOne({ source: sourceFixture(), storefront: 'us' });
    // Tokens: source=[hey,jude,the,beatles] vs apple=[hey,jude,the,beatles,cover]
    // intersection=4, union=5 → 0.8 → 'low' (>= 0.6, < 0.85).
    expect(result.confidence).toBe('low');
    expect(result.apple?.id).toBe('99');
  });

  it('no results from Apple → confidence "none"', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: { songs: { data: [] } } }));

    const result = await matchOne({ source: sourceFixture(), storefront: 'us' });
    expect(result.confidence).toBe('none');
    expect(result.apple).toBeNull();
    expect(result.reason).toBe('no-results');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
