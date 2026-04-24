import { HttpError } from './httpError';
import type { LibraryAddResourceType } from './types/appleMusic';

export const LIBRARY_ADD_TYPES: readonly LibraryAddResourceType[] = [
  'songs',
  'albums',
  'playlists',
  'music-videos',
];

const LIBRARY_ADD_TYPE_SET: ReadonlySet<LibraryAddResourceType> = new Set(LIBRARY_ADD_TYPES);

export interface AddToLibraryInput {
  type: LibraryAddResourceType;
  ids: string[];
}

/**
 * Validates the body of POST /api/apple-music/me/library. Throws an HttpError
 * with status 400 on any problem so callers can let `withErrorHandler` format it.
 */
export function parseAddToLibraryBody(raw: unknown): AddToLibraryInput {
  if (raw == null || typeof raw !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const { type, ids } = raw as { type?: unknown; ids?: unknown };

  if (typeof type !== 'string' || !LIBRARY_ADD_TYPE_SET.has(type as LibraryAddResourceType)) {
    throw new HttpError(
      400,
      `Invalid body.type. Expected one of: ${LIBRARY_ADD_TYPES.join(', ')}`,
    );
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, 'Invalid body.ids. Expected a non-empty array of strings.');
  }
  if (!ids.every((id) => typeof id === 'string' && id.length > 0)) {
    throw new HttpError(400, 'Invalid body.ids. Every id must be a non-empty string.');
  }

  return { type: type as LibraryAddResourceType, ids: ids as string[] };
}
