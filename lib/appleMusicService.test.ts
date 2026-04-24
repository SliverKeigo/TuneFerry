import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addToLibrary, searchCatalog } from './appleMusicService';

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

  it('addToLibrary (hand-built fetch) also sends Origin + User-Agent', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    await addToLibrary({ type: 'songs', ids: ['1'], musicUserToken: 'u' });
    const h = lastCallHeaders();
    expect(h.get('origin')).toBe('https://music.apple.com');
    expect(h.get('user-agent')).toMatch(/Mozilla\/5\.0/);
    expect(h.get('music-user-token')).toBe('u');
  });
});
