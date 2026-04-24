import { Router } from 'express';
import { getDeveloperToken } from '../services/developerTokenService';
import {
  addToLibrary,
  getLibraryPlaylists,
  searchCatalog,
  searchLibrary,
} from '../services/appleMusicService';
import { HttpError } from '../utils/httpError';
import type { LibraryAddResourceType } from '../types/appleMusic';

const router: Router = Router();

const VALID_LIBRARY_ADD_TYPES: ReadonlySet<LibraryAddResourceType> = new Set([
  'songs',
  'albums',
  'playlists',
  'music-videos',
]);

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

router.get('/developer-token', (_req, res, next) => {
  try {
    const developerToken = getDeveloperToken();
    res.json({ developerToken });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog/search', async (req, res, next) => {
  try {
    const term = pickString(req.query.term);
    if (!term) throw new HttpError(400, 'Missing required query param: term');
    const data = await searchCatalog({
      term,
      storefront: pickString(req.query.storefront),
      types: pickString(req.query.types),
      limit: Number.isFinite(Number(req.query.limit))
        ? Number(req.query.limit)
        : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/me/library/search', async (req, res, next) => {
  try {
    const term = pickString(req.query.term);
    if (!term) throw new HttpError(400, 'Missing required query param: term');
    const musicUserToken = pickString(req.headers['x-music-user-token']);
    const data = await searchLibrary({
      term,
      types: pickString(req.query.types),
      limit: Number.isFinite(Number(req.query.limit))
        ? Number(req.query.limit)
        : undefined,
      musicUserToken,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/me/library', async (req, res, next) => {
  try {
    const { type, ids } = req.body ?? {};
    if (typeof type !== 'string' || !VALID_LIBRARY_ADD_TYPES.has(type as LibraryAddResourceType)) {
      throw new HttpError(
        400,
        `Invalid body.type. Expected one of: ${Array.from(VALID_LIBRARY_ADD_TYPES).join(', ')}`,
      );
    }
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
      throw new HttpError(400, 'Invalid body.ids. Expected a non-empty array of strings.');
    }
    const musicUserToken = pickString(req.headers['x-music-user-token']);
    await addToLibrary({
      type: type as LibraryAddResourceType,
      ids,
      musicUserToken,
    });
    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me/library/playlists', async (req, res, next) => {
  try {
    const musicUserToken = pickString(req.headers['x-music-user-token']);
    const data = await getLibraryPlaylists({
      musicUserToken,
      limit: Number.isFinite(Number(req.query.limit))
        ? Number(req.query.limit)
        : undefined,
      offset: Number.isFinite(Number(req.query.offset))
        ? Number(req.query.offset)
        : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export { router as appleMusicRouter };
