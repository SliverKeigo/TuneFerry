import { HttpError } from './httpError';
import { getDeveloperToken } from './developerTokenService';
import type {
  AppleMusicLibraryPlaylistsResponse,
  AppleMusicLibrarySearchResponse,
  AppleMusicSearchResponse,
  LibraryAddResourceType,
} from './types/appleMusic';

const APPLE_MUSIC_API_BASE = 'https://api.music.apple.com/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  musicUserToken?: string;
  body?: unknown;
}

async function appleFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const developerToken = getDeveloperToken();
  const url = new URL(`${APPLE_MUSIC_API_BASE}${path}`);

  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`,
    Accept: 'application/json',
  };
  if (opts.musicUserToken) {
    headers['Music-User-Token'] = opts.musicUserToken;
  }
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text().catch(() => null);
    }
    throw new HttpError(
      response.status,
      `Apple Music API error (${response.status})`,
      payload,
    );
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function requireMusicUserToken(token: string | undefined): string {
  if (!token) {
    throw new HttpError(
      401,
      'Missing Music User Token. Connect Apple Music in the client and send the token via the `x-music-user-token` header.',
    );
  }
  return token;
}

export async function searchCatalog(params: {
  term: string;
  storefront?: string;
  types?: string;
  limit?: number;
}): Promise<AppleMusicSearchResponse> {
  const storefront = params.storefront?.trim() || 'us';
  const types = params.types?.trim() || 'songs,albums,artists,playlists';
  return appleFetch<AppleMusicSearchResponse>(`/catalog/${storefront}/search`, {
    query: {
      term: params.term,
      types,
      limit: params.limit ?? 25,
    },
  });
}

export async function searchLibrary(params: {
  term: string;
  types?: string;
  limit?: number;
  musicUserToken: string | undefined;
}): Promise<AppleMusicLibrarySearchResponse> {
  const userToken = requireMusicUserToken(params.musicUserToken);
  const types = params.types?.trim() || 'library-songs,library-albums,library-artists,library-playlists';
  return appleFetch<AppleMusicLibrarySearchResponse>('/me/library/search', {
    query: {
      term: params.term,
      types,
      limit: params.limit ?? 25,
    },
    musicUserToken: userToken,
  });
}

export async function addToLibrary(params: {
  type: LibraryAddResourceType;
  ids: string[];
  musicUserToken: string | undefined;
}): Promise<void> {
  const userToken = requireMusicUserToken(params.musicUserToken);
  if (!params.ids.length) {
    throw new HttpError(400, 'ids must be a non-empty array');
  }

  const query = `ids%5B${encodeURIComponent(params.type)}%5D=${params.ids
    .map((id) => encodeURIComponent(id))
    .join(',')}`;

  const developerToken = getDeveloperToken();
  const response = await fetch(`${APPLE_MUSIC_API_BASE}/me/library?${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': userToken,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text().catch(() => null);
    }
    throw new HttpError(
      response.status,
      `Failed to add to library (${response.status})`,
      payload,
    );
  }
}

export async function getLibraryPlaylists(params: {
  musicUserToken: string | undefined;
  limit?: number;
  offset?: number;
}): Promise<AppleMusicLibraryPlaylistsResponse> {
  const userToken = requireMusicUserToken(params.musicUserToken);
  return appleFetch<AppleMusicLibraryPlaylistsResponse>('/me/library/playlists', {
    query: {
      limit: params.limit ?? 100,
      offset: params.offset,
    },
    musicUserToken: userToken,
  });
}

/**
 * POST /v1/me/library/playlists — pre-declared extension point. Not wired to
 * a route yet; Organizer features will consume this.
 */
export async function createLibraryPlaylist(params: {
  name: string;
  description?: string;
  trackIds?: string[];
  musicUserToken: string | undefined;
}): Promise<unknown> {
  const userToken = requireMusicUserToken(params.musicUserToken);
  const body: Record<string, unknown> = {
    attributes: {
      name: params.name,
      ...(params.description ? { description: params.description } : {}),
    },
  };
  if (params.trackIds?.length) {
    body.relationships = {
      tracks: {
        data: params.trackIds.map((id) => ({ id, type: 'songs' })),
      },
    };
  }
  return appleFetch('/me/library/playlists', {
    method: 'POST',
    body,
    musicUserToken: userToken,
  });
}
