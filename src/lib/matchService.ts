import { findByIsrc, findFirstByQuery } from './appleMusicService';
import type { AppleMusicResource, AppleMusicSongAttributes } from './types/appleMusic';
import type { SpotifyTrack } from './types/spotify';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MatchConfidence = 'exact' | 'high' | 'low' | 'none';

export interface MatchInput {
  spotify: SpotifyTrack;
  storefront: string;
}

export interface AppleSongLite {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  durationMs?: number;
  /** Already substituted to a 120x120 jpg URL. Optional — Apple may omit. */
  artworkUrl?: string;
  previewUrl?: string;
  /** https://music.apple.com/{storefront}/song/{id} */
  catalogUrl: string;
}

export interface MatchResult {
  spotify: SpotifyTrack;
  apple: AppleSongLite | null;
  confidence: MatchConfidence;
  /** Top alternatives for manual override in the UI. Always <= 5. */
  candidates: AppleSongLite[];
  /** Why we picked (or didn't): 'isrc', 'fuzzy', 'no-results', etc. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Tunable thresholds
// ---------------------------------------------------------------------------

// Score thresholds: tuned conservatively. ISRC hits skip these entirely.
//   >= HIGH_THRESHOLD → 'high'  (auto-pick safely)
//   >= LOW_THRESHOLD  → 'low'   (still surface, but flag for review)
//   <  LOW_THRESHOLD  → 'none'  (don't pick anything)
const HIGH_THRESHOLD = 0.85;
const LOW_THRESHOLD = 0.6;

// Punish duration mismatches. Spotify and Apple ISRCs sometimes differ on a
// re-recorded version that's 30s shorter — we want that to fail high-confidence.
const DURATION_TOLERANCE_MS = 8_000;
const DURATION_PENALTY = 0.7;

const MAX_CANDIDATES = 5;
const SEARCH_LIMIT = 10;

// ---------------------------------------------------------------------------
// Fuzzy matching primitives (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Lowercases, strips common decorations, removes punctuation, collapses
 * whitespace. Intentionally simple — Latin-1 only is fine for MVP, but the
 * tokenizer treats CJK characters as a single token gracefully.
 */
export function normalize(input: string): string {
  let s = input.toLowerCase();

  // Common parenthetical/dash suffixes that pollute fuzzy matches.
  // Order matters: remove "- live at ..." before stripping all dashes.
  s = s.replace(
    /\s*[-–—]\s*(?:remaster(?:ed)?|live|mono|stereo|extended|edit|version|mix|deluxe|bonus|radio|single)\b[^()]*$/gi,
    ' ',
  );
  s = s.replace(/\((?:feat\.?|with|featuring)[^)]*\)/gi, ' ');
  s = s.replace(
    /\((?:remaster(?:ed)?|live|mono|stereo|extended|edit|version|mix|deluxe|bonus|radio|single)[^)]*\)/gi,
    ' ',
  );

  // "feat." / "ft." outside parens — strip from the comma onwards if present.
  s = s.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, '');

  // Drop standalone year tags like "2009 remaster".
  s = s.replace(/\b(?:19|20)\d{2}\s+remaster(?:ed)?\b/gi, ' ');

  // Punctuation → space (preserve word boundaries).
  s = s.replace(/[\p{P}\p{S}]+/gu, ' ');

  return s.replace(/\s+/g, ' ').trim();
}

export function tokenize(input: string): string[] {
  const norm = normalize(input);
  if (!norm) return [];
  return norm.split(' ');
}

/** Jaccard set similarity: |A ∩ B| / |A ∪ B|. Returns 0 if both sides empty. */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Score a candidate against a Spotify track. Returns a number in [0, 1]. */
export function score(spotify: SpotifyTrack, candidate: AppleSongLite): number {
  const left = tokenize(`${spotify.name} ${spotify.artists.join(' ')}`);
  const right = tokenize(`${candidate.name} ${candidate.artistName}`);
  let s = jaccard(left, right);

  if (
    candidate.durationMs &&
    Math.abs(candidate.durationMs - spotify.durationMs) > DURATION_TOLERANCE_MS
  ) {
    s *= DURATION_PENALTY;
  }
  return s;
}

function confidenceFromScore(s: number): MatchConfidence {
  if (s >= HIGH_THRESHOLD) return 'high';
  if (s >= LOW_THRESHOLD) return 'low';
  return 'none';
}

// ---------------------------------------------------------------------------
// Apple Music resource → AppleSongLite
// ---------------------------------------------------------------------------

/**
 * Apple's artwork URLs are templated as `https://.../{w}x{h}{c}.jpg`. We
 * substitute a small fixed thumbnail size — the playlist UI shows ~50px tiles.
 */
function resolveArtwork(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace('{w}', '120').replace('{h}', '120').replace('{c}', 'cc').replace('{f}', 'jpg');
}

function toAppleSongLite(
  resource: AppleMusicResource<AppleMusicSongAttributes>,
  storefront: string,
): AppleSongLite | null {
  const attrs = resource.attributes;
  if (!attrs) return null;
  return {
    id: resource.id,
    name: attrs.name,
    artistName: attrs.artistName,
    albumName: attrs.albumName,
    durationMs: attrs.durationInMillis,
    artworkUrl: resolveArtwork(attrs.artwork?.url),
    previewUrl: attrs.previews?.[0]?.url,
    catalogUrl: attrs.url ?? `https://music.apple.com/${storefront}/song/${resource.id}`,
  };
}

// ---------------------------------------------------------------------------
// Match logic
// ---------------------------------------------------------------------------

/**
 * Match a single Spotify track against the Apple Music catalog.
 *
 * Strategy:
 *  1. If `spotify.isrc` is present, query Apple by ISRC. Any hit is 'exact'.
 *  2. Else fall back to a fuzzy text search ranked by `score()` and the
 *     duration-aware threshold ladder above.
 */
export async function matchOne(input: MatchInput): Promise<MatchResult> {
  const { spotify, storefront } = input;

  // ── Path 1: deterministic ISRC lookup ────────────────────────────────────
  if (spotify.isrc) {
    const songs = await findByIsrc({ isrc: spotify.isrc, storefront });
    if (songs.length > 0) {
      const lites = songs
        .map((r) => toAppleSongLite(r, storefront))
        .filter((s): s is AppleSongLite => s !== null);
      if (lites.length > 0) {
        const [first, ...rest] = lites;
        return {
          spotify,
          apple: first ?? null,
          confidence: 'exact',
          candidates: rest.slice(0, MAX_CANDIDATES),
          reason: 'isrc',
        };
      }
    }
    // ISRC miss falls through to fuzzy.
  }

  // ── Path 2: fuzzy text search ────────────────────────────────────────────
  const primaryArtist = spotify.artists[0] ?? '';
  const term = `${spotify.name} ${primaryArtist}`.trim();
  const songs = await findFirstByQuery({ query: term, storefront, limit: SEARCH_LIMIT });
  if (songs.length === 0) {
    return {
      spotify,
      apple: null,
      confidence: 'none',
      candidates: [],
      reason: 'no-results',
    };
  }

  const scored = songs
    .map((r) => toAppleSongLite(r, storefront))
    .filter((s): s is AppleSongLite => s !== null)
    .map((lite) => ({ lite, s: score(spotify, lite) }))
    .sort((a, b) => b.s - a.s);

  if (scored.length === 0) {
    return {
      spotify,
      apple: null,
      confidence: 'none',
      candidates: [],
      reason: 'no-results',
    };
  }

  const top = scored[0];
  if (!top) {
    // Unreachable given the length check above; keeps strict TS happy.
    return { spotify, apple: null, confidence: 'none', candidates: [], reason: 'no-results' };
  }
  const confidence = confidenceFromScore(top.s);
  const allCandidates = scored.map((x) => x.lite);

  if (confidence === 'none') {
    return {
      spotify,
      apple: null,
      confidence: 'none',
      candidates: allCandidates.slice(0, MAX_CANDIDATES),
      reason: 'low-score',
    };
  }

  return {
    spotify,
    apple: top.lite,
    confidence,
    candidates: allCandidates.slice(1, MAX_CANDIDATES + 1),
    reason: 'fuzzy',
  };
}

/**
 * Run `matchOne` over an array of tracks serially. Apple's catalog endpoint
 * is fast and we don't want to look like a scraper — concurrency can land
 * later if the wizard demands it.
 */
export async function matchMany(
  tracks: SpotifyTrack[],
  storefront: string,
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  for (const t of tracks) {
    results.push(await matchOne({ spotify: t, storefront }));
  }
  return results;
}
