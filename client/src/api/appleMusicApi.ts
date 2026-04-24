import type {
  AppleMusicLibraryPlaylistsResponse,
  AppleMusicLibrarySearchResponse,
  AppleMusicSearchResponse,
  ApiErrorShape,
  LibraryAddResourceType,
} from '../types/appleMusic';

// We rely on Vite's dev-server proxy (`/api` -> backend). In production the
// client and server are assumed to be served from the same origin.
const API_BASE = '';

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
  let payload: ApiErrorShape | null = null;
  try {
    payload = (await res.json()) as ApiErrorShape;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(
    res.status,
    payload?.error?.message ?? `Request failed (${res.status})`,
    payload?.error?.details,
  );
}

export async function fetchDeveloperToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/apple-music/developer-token`);
  const { developerToken } = await handle<{ developerToken: string }>(res);
  return developerToken;
}

export async function searchCatalog(params: {
  term: string;
  storefront?: string;
  types?: string;
  limit?: number;
}): Promise<AppleMusicSearchResponse> {
  const qs = new URLSearchParams({ term: params.term });
  if (params.storefront) qs.set('storefront', params.storefront);
  if (params.types) qs.set('types', params.types);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/api/apple-music/catalog/search?${qs.toString()}`);
  return handle<AppleMusicSearchResponse>(res);
}

export async function searchLibrary(params: {
  term: string;
  musicUserToken: string;
  types?: string;
  limit?: number;
}): Promise<AppleMusicLibrarySearchResponse> {
  const qs = new URLSearchParams({ term: params.term });
  if (params.types) qs.set('types', params.types);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/api/apple-music/me/library/search?${qs.toString()}`, {
    headers: { 'x-music-user-token': params.musicUserToken },
  });
  return handle<AppleMusicLibrarySearchResponse>(res);
}

export async function addToLibrary(params: {
  type: LibraryAddResourceType;
  ids: string[];
  musicUserToken: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/apple-music/me/library`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-music-user-token': params.musicUserToken,
    },
    body: JSON.stringify({ type: params.type, ids: params.ids }),
  });
  await handle<{ ok: true }>(res);
}

export async function fetchLibraryPlaylists(params: {
  musicUserToken: string;
  limit?: number;
  offset?: number;
}): Promise<AppleMusicLibraryPlaylistsResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const url = `${API_BASE}/api/apple-music/me/library/playlists${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: { 'x-music-user-token': params.musicUserToken },
  });
  return handle<AppleMusicLibraryPlaylistsResponse>(res);
}
