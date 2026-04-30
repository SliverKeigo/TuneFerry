import type { SourceType } from '@/lib/types/source';

// Pure router: classifies a user input as Spotify vs NetEase and pulls out
// the playlist ID. Does NOT validate; the per-source service (spotify's
// `extractPlaylistId`, netease's `extractPlaylistId`) does final validation
// before hitting the network. Detector is intentionally lenient — its only
// job is to pick the right API endpoint.
//
// We avoid throwing here so the caller (import page) can fall through to a
// single "unrecognized source" toast on `null`. Pure function, no I/O.

export interface DetectedSource {
  sourceType: SourceType;
  /** Numeric/string ID extracted from the URL or bare-id input. */
  id: string;
  /** Original (trimmed) input — passed through unchanged for the API call. */
  input: string;
}

/** 22-char base62 — Spotify's canonical playlist ID shape. We accept the
 *  full base62 alphabet; the Spotify service does its own stricter check. */
const SPOTIFY_BARE_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/** ≥6 digits — NetEase numeric playlist IDs are typically 9–11 digits. The
 *  6-digit lower bound rules out short numerics that could be anything (a
 *  PIN, a year, …) while still accepting any plausible NetEase ID. */
const NETEASE_BARE_ID_PATTERN = /^\d{6,}$/;

const SPOTIFY_PLAYLIST_PATH = /\/playlist\/([^/?#]+)/;

/**
 * Detect which streaming source an input belongs to and pull out its ID.
 *
 * Supported inputs:
 *   - Spotify URLs: `open.spotify.com/playlist/<22-char-id>?si=...`
 *     (also locale-prefixed `/intl-ja/playlist/...` and `/embed/playlist/...`)
 *   - Spotify bare IDs: 22-char base62
 *   - NetEase URLs: `music.163.com/playlist?id=<digits>`,
 *     `music.163.com/#/playlist?id=...` (legacy hash routing),
 *     `y.music.163.com/m/playlist?id=...`
 *   - NetEase bare IDs: pure-digit string ≥ 6 chars
 *
 * Returns `null` if no source pattern matches. Caller should show an
 * "unrecognized source" error in that case.
 */
export function detectSource(input: string): DetectedSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ---- URL-based detection -------------------------------------------------
  // Try parsing the input as a URL first. We do this before the bare-ID
  // checks because a URL like `https://open.spotify.com/...` should never
  // accidentally match the bare-ID regexes.
  const url = tryParseUrl(trimmed);
  if (url) {
    const host = url.hostname.toLowerCase();

    // Spotify: any open.spotify.com / spotify.com host with a /playlist/<id>
    // segment (locale prefixes like /intl-ja/ are handled by the regex which
    // just looks for `/playlist/<id>` anywhere in the path).
    if (host === 'spotify.com' || host === 'open.spotify.com' || host.endsWith('.spotify.com')) {
      const match = url.pathname.match(SPOTIFY_PLAYLIST_PATH);
      if (match?.[1]) {
        return { sourceType: 'spotify', id: match[1], input: trimmed };
      }
    }

    // NetEase: `music.163.com` and any subdomain (e.g. `y.music.163.com`).
    if (host === 'music.163.com' || host.endsWith('.music.163.com')) {
      const id = extractNeteaseIdFromUrl(url, trimmed);
      if (id) {
        return { sourceType: 'netease', id, input: trimmed };
      }
    }
  }

  // ---- Bare ID detection ---------------------------------------------------
  // Order matters: pure-digit check first, since a 22-char base62 string
  // can't be all digits long enough to overlap (Spotify IDs always include
  // letters — but we still favor digits-first for explicit precedence).
  if (NETEASE_BARE_ID_PATTERN.test(trimmed)) {
    return { sourceType: 'netease', id: trimmed, input: trimmed };
  }
  if (SPOTIFY_BARE_ID_PATTERN.test(trimmed)) {
    return { sourceType: 'spotify', id: trimmed, input: trimmed };
  }

  return null;
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Pull the `id` query param out of a NetEase URL. Handles the legacy hash-
 * routing form (`music.163.com/#/playlist?id=...`) where the query lives
 * inside the URL fragment and `URLSearchParams` won't see it. Mirrors the
 * fragment-stripping logic in `neteaseService.extractPlaylistId`.
 */
function extractNeteaseIdFromUrl(url: URL, original: string): string | null {
  const direct = url.searchParams.get('id');
  if (direct && /^\d+$/.test(direct)) return direct;

  // Hash routing: query param hides inside the fragment. Look for `id=`
  // anywhere after the `#`.
  const hashIndex = original.indexOf('#');
  if (hashIndex >= 0) {
    const afterHash = original.slice(hashIndex + 1);
    const queryStart = afterHash.indexOf('?');
    if (queryStart >= 0) {
      const params = new URLSearchParams(afterHash.slice(queryStart + 1));
      const fragId = params.get('id');
      if (fragId && /^\d+$/.test(fragId)) return fragId;
    }
  }

  return null;
}
