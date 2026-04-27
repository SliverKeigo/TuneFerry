import type { ApiErrorShape, AppleMusicSearchResponse } from '../types/appleMusic';

// Same-origin in both dev and production (Next.js App Router serves /api/* itself).
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
