import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findFirstByQuery, searchCatalog } from './appleMusicService';

// Apple's servers reject requests missing `Origin` when the Developer Token's
// `root_https_origin` claim is set (the case for WebPlay-scraped tokens). If
// anyone strips the header in a future refactor Apple returns 401 even though
// the request is otherwise valid. Lock that contract here.

describe('appleMusicService headers', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response('{"results":{}}', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function lastCallHeaders(): Headers {
    const call = fetchMock.mock.calls.at(-1);
    if (!call) throw new Error('fetch was not called');
    const init = (call[1] ?? {}) as { headers?: Record<string, string> };
    return new Headers(init.headers);
  }

  it('searchCatalog sends Origin: https://music.apple.com', async () => {
    await searchCatalog({ term: 'adele' });
    const h = lastCallHeaders();
    expect(h.get('origin')).toBe('https://music.apple.com');
    expect(h.get('authorization')).toMatch(/^Bearer /);
  });

  it('searchCatalog sends a desktop User-Agent (defends against UA sniffing)', async () => {
    await searchCatalog({ term: 'adele' });
    const ua = lastCallHeaders().get('user-agent');
    expect(ua).toBeTruthy();
    expect(ua).toMatch(/Mozilla\/5\.0/);
  });

  it('searchCatalog encodes term + storefront + types into the URL', async () => {
    await searchCatalog({ term: '半生雪', storefront: 'hk', types: 'songs', limit: 5 });
    const url = fetchMock.mock.calls.at(-1)?.[0] as URL;
    expect(url.toString()).toContain('amp-api.music.apple.com/v1/catalog/hk/search');
    expect(url.searchParams.get('term')).toBe('半生雪');
    expect(url.searchParams.get('types')).toBe('songs');
    expect(url.searchParams.get('limit')).toBe('5');
  });
});

describe('findFirstByQuery', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('returns the songs[].data array when results are present', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: {
            songs: {
              data: [
                { id: '1', type: 'songs', attributes: { name: 'Hello', artistName: 'Adele' } },
                {
                  id: '2',
                  type: 'songs',
                  attributes: { name: 'Hello (Live)', artistName: 'Adele' },
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );
    const out = await findFirstByQuery({ query: 'adele hello' });
    expect(out.length).toBe(2);
    expect(out[0]?.id).toBe('1');
    expect(out[0]?.attributes?.name).toBe('Hello');
  });

  it('returns an empty array when there are no song hits', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: {} }), { status: 200 }));
    const out = await findFirstByQuery({ query: 'no-such-song-zzz' });
    expect(out).toEqual([]);
  });

  it('passes types=songs and a default limit of 10 to searchCatalog', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: {} }), { status: 200 }));
    await findFirstByQuery({ query: 'foo' });
    const url = fetchMock.mock.calls.at(-1)?.[0] as URL;
    expect(url.searchParams.get('types')).toBe('songs');
    expect(url.searchParams.get('limit')).toBe('10');
  });
});
