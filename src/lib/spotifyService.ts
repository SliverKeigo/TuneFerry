import { HttpError } from './httpError';
import type { SourcePlaylist, SourceTrack } from './types/source';

// We scrape Spotify's public embed page rather than calling the Web API.
// Why: the Web API now requires a Premium subscription on every read path,
// which kills the free use-case TuneFerry exists for. The embed page is
// public, server-rendered, and ships the full track list as JSON inside
// `<script id="__NEXT_DATA__">`. Same risk profile as our WebPlay-scraped
// Apple Music token: ToS gray, can break any time Spotify reshapes the
// embed bundle, but works *today* with no auth, no token, no rate budget.

const SPOTIFY_EMBED_BASE = 'https://open.spotify.com/embed/playlist';

// Some CDNs/edge layers serve a stripped HTML to non-browser UAs. Pin a
// realistic desktop UA so we get the same payload a real iframe would.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

// ---------------------------------------------------------------------------
// Playlist URL parsing
// ---------------------------------------------------------------------------

/**
 * Accepts either a bare Spotify playlist id or any of the URL formats Spotify
 * shares (open.spotify.com, spotify:playlist:..., embed/playlist/..., links
 * with ?si= tracking, locale prefixes like /intl-ja/...).
 *
 * Throws `HttpError(400, ...)` for unparsable input — keeping all "user
 * supplied a bad string" failures in one place lets the route layer just
 * delegate without an extra null-check.
 */
export function extractPlaylistId(idOrUrl: string): string {
  const trimmed = idOrUrl.trim();
  if (!trimmed) {
    throw new HttpError(400, 'Spotify playlist id or URL is required.');
  }
  if (SPOTIFY_ID_PATTERN.test(trimmed)) return trimmed;

  // spotify:playlist:<id>
  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]{22})$/);
  if (uriMatch?.[1]) return uriMatch[1];

  // Any open.spotify.com URL: /playlist/<id>, /embed/playlist/<id>,
  // and locale-prefixed variants like /intl-ja/playlist/<id>.
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const idx = segments.indexOf('playlist');
    const candidate = idx >= 0 ? segments[idx + 1] : undefined;
    if (candidate && SPOTIFY_ID_PATTERN.test(candidate)) return candidate;
  } catch {
    // Fall through to the generic error below.
  }

  throw new HttpError(400, `Could not parse Spotify playlist id from: ${idOrUrl}`);
}

// ---------------------------------------------------------------------------
// Embed payload typing — only the fields we read.
// ---------------------------------------------------------------------------

// The schema below is intentionally permissive. Spotify can (and does) shift
// fields around inside `state.data.entity` between embed bundle versions; we
// type only the leaves we actually pull out and walk defensively at runtime.

interface RawEmbedAudioPreview {
  url?: string;
  format?: string;
}

interface RawEmbedTrack {
  uri?: string;
  title?: string;
  subtitle?: string;
  duration?: number;
  audioPreview?: RawEmbedAudioPreview;
  entityType?: string;
}

interface RawEmbedCoverArtSource {
  url?: string;
  width?: number;
  height?: number;
}

interface RawEmbedCoverArt {
  sources?: RawEmbedCoverArtSource[];
}

interface RawEmbedEntity {
  type?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  coverArt?: RawEmbedCoverArt;
  trackList?: RawEmbedTrack[];
}

// ---------------------------------------------------------------------------
// Defensive object walking
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Walks a chain of property names and returns the leaf or `undefined` if any
 * intermediate hop is missing / not an object. Used because the embed payload
 * is deeply nested (`props.pageProps.state.data.entity`) and any of those
 * could move when Spotify ships a new bundle.
 */
function deepGet(root: unknown, path: readonly string[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Track + image normalization
// ---------------------------------------------------------------------------

/**
 * Splits the embed's joined `subtitle` artist string into individual names.
 * Spotify uses ", " in display, but some playlists round-trip with " / " or
 * " & " from external sources. Empty fragments are dropped.
 */
function splitArtists(subtitle: string | undefined): string[] {
  if (!subtitle) return [];
  return subtitle
    .split(/,\s*|\s*\/\s*|\s*&\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeTrack(raw: RawEmbedTrack): SourceTrack | null {
  if (raw.entityType !== 'track') return null;
  if (typeof raw.uri !== 'string' || !raw.uri) return null;

  const id = String(raw.uri.split(':').pop() ?? raw.uri);
  return {
    sourceType: 'spotify',
    id,
    name: raw.title ?? '',
    artists: splitArtists(raw.subtitle),
    durationMs: typeof raw.duration === 'number' ? raw.duration : 0,
    previewUrl: raw.audioPreview?.url,
  };
}

/**
 * Picks a usable image URL out of `entity.coverArt.sources[]`. Spotify orders
 * sources by size; we just take the first one that has a string URL. Returns
 * undefined if none look usable rather than throwing — playlists without art
 * are uncommon but legal.
 */
function pickCoverImageUrl(entity: RawEmbedEntity): string | undefined {
  const sources = entity.coverArt?.sources;
  if (!Array.isArray(sources)) return undefined;
  for (const source of sources) {
    if (source && typeof source.url === 'string' && source.url.length > 0) {
      return source.url;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Embed scrape
// ---------------------------------------------------------------------------

// Anchored on the script id so we don't accidentally grab a different inline
// script. `[\s\S]+?` (lazy, any-character) handles the multiline JSON body
// without depending on the `s` regex flag.
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/;

/**
 * Fetches a public Spotify playlist by scraping its embed iframe page.
 *
 * Implementation: GET the embed HTML → extract `<script id="__NEXT_DATA__">`
 * → JSON.parse → walk to `props.pageProps.state.data.entity` → map
 * `trackList`. Any structural failure raises an `HttpError` so the route
 * handler doesn't have to care which step blew up.
 */
export async function fetchPublicPlaylistViaEmbed(idOrUrl: string): Promise<SourcePlaylist> {
  const id = extractPlaylistId(idOrUrl);

  const response = await fetch(`${SPOTIFY_EMBED_BASE}/${id}`, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new HttpError(502, `Failed to fetch Spotify embed page (${response.status})`);
  }
  const html = await response.text();

  const match = html.match(NEXT_DATA_PATTERN);
  if (!match || !match[1]) {
    throw new HttpError(502, 'Spotify embed shape changed — could not locate __NEXT_DATA__');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(match[1]);
  } catch {
    throw new HttpError(502, 'Failed to parse Spotify embed payload');
  }

  const entity = deepGet(payload, ['props', 'pageProps', 'state', 'data', 'entity']) as
    | RawEmbedEntity
    | undefined;

  if (!entity || typeof entity !== 'object' || entity.type !== 'playlist') {
    throw new HttpError(404, 'Playlist not found or shape unexpected');
  }

  const trackList = Array.isArray(entity.trackList) ? entity.trackList : [];
  const tracks: SourceTrack[] = [];
  for (const raw of trackList) {
    const t = normalizeTrack(raw);
    if (t) tracks.push(t);
  }

  return {
    sourceType: 'spotify',
    id,
    name: entity.name ?? '',
    // The embed exposes only an owner display name (as `subtitle`), not an id.
    // SourcePlaylist's owner shape is intentionally id-less for cross-source symmetry.
    owner: { displayName: entity.subtitle ?? '' },
    coverUrl: pickCoverImageUrl(entity),
    // Embed truncates large playlists (≤100 user / ≤50 algorithmic). We don't
    // get a real total back, so report what we actually returned. Callers
    // should surface this honestly to the user.
    totalTracks: tracks.length,
    tracks,
  };
}
