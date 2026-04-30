import { findFirstByQuery } from './appleMusicService';
import type { AppleMusicResource, AppleMusicSongAttributes } from './types/appleMusic';
import type { SourceTrack } from './types/source';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

// Without ISRCs (the embed scrape strips them) every match is fuzzy. The
// `'high'` tier replaces the old `'exact'` tier; we never hit a deterministic
// identifier match anymore.
export type MatchConfidence = 'high' | 'low' | 'none';

export interface MatchInput {
  source: SourceTrack;
  storefront: string;
  /**
   * Aborts the underlying Apple Music search. Lets `matchMany` short-circuit
   * the rest of a 100-track playlist when the client disconnects, instead of
   * burning developer-token quota on results nobody is waiting for.
   */
  signal?: AbortSignal;
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
  source: SourceTrack;
  apple: AppleSongLite | null;
  confidence: MatchConfidence;
  /** Top alternatives for manual override in the UI. Always <= 5. */
  candidates: AppleSongLite[];
  /** Why we picked (or didn't): 'fuzzy', 'no-results', 'low-score'. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Tunable thresholds
// ---------------------------------------------------------------------------

// Score thresholds:
//   >= HIGH_THRESHOLD → 'high'  (auto-pick safely)
//   >= LOW_THRESHOLD  → 'low'   (still surface, but flag for review)
//   <  LOW_THRESHOLD  → 'none'  (don't pick anything)
const HIGH_THRESHOLD = 0.85;
const LOW_THRESHOLD = 0.6;

// Punish duration mismatches. Catches re-recorded versions, radio edits, etc.
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

/** Score a candidate against a source track. Returns a number in [0, 1]. */
export function score(source: SourceTrack, candidate: AppleSongLite): number {
  const left = tokenize(`${source.name} ${source.artists.join(' ')}`);
  const right = tokenize(`${candidate.name} ${candidate.artistName}`);
  let s = jaccard(left, right);

  if (
    candidate.durationMs &&
    Math.abs(candidate.durationMs - source.durationMs) > DURATION_TOLERANCE_MS
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
 * Match a single source track against the Apple Music catalog.
 *
 * Strategy: fuzzy text search ranked by `score()` and the duration-aware
 * threshold ladder above. Sources like the Spotify embed scrape have no ISRC,
 * so this is the only path — the old deterministic ISRC branch is gone.
 *
 * Upstream errors (429 rate-limit, 5xx, network) degrade to a `'none'` match
 * with `reason: 'upstream-error'` so a single bad track doesn't fail the
 * whole `matchMany` run for a 91-track playlist.
 */
export async function matchOne(input: MatchInput): Promise<MatchResult> {
  const { source, storefront, signal } = input;
  signal?.throwIfAborted();

  const primaryArtist = source.artists[0] ?? '';
  const term = `${source.name} ${primaryArtist}`.trim();
  let songs: AppleMusicResource<AppleMusicSongAttributes>[];
  try {
    songs = await findFirstByQuery({ query: term, storefront, limit: SEARCH_LIMIT, signal });
  } catch (err) {
    // Re-throw cancellation so `matchMany` can stop, instead of swallowing it
    // as just another upstream error.
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return {
      source,
      apple: null,
      confidence: 'none',
      candidates: [],
      reason: `upstream-error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (songs.length === 0) {
    return {
      source,
      apple: null,
      confidence: 'none',
      candidates: [],
      reason: 'no-results',
    };
  }

  const scored = songs
    .map((r) => toAppleSongLite(r, storefront))
    .filter((s): s is AppleSongLite => s !== null)
    .map((lite) => ({ lite, s: score(source, lite) }))
    .sort((a, b) => b.s - a.s);

  if (scored.length === 0) {
    return {
      source,
      apple: null,
      confidence: 'none',
      candidates: [],
      reason: 'no-results',
    };
  }

  const top = scored[0];
  if (!top) {
    // Unreachable given the length check above; keeps strict TS happy.
    return { source, apple: null, confidence: 'none', candidates: [], reason: 'no-results' };
  }
  const confidence = confidenceFromScore(top.s);
  const allCandidates = scored.map((x) => x.lite);

  if (confidence === 'none') {
    return {
      source,
      apple: null,
      confidence: 'none',
      candidates: allCandidates.slice(0, MAX_CANDIDATES),
      reason: 'low-score',
    };
  }

  return {
    source,
    apple: top.lite,
    confidence,
    candidates: allCandidates.slice(1, MAX_CANDIDATES + 1),
    reason: 'fuzzy',
  };
}

/** Tunable inter-request gap for `matchMany`. Apple started returning 429
 * "Too Many Requests" around ~50 rapid catalog/search hits; 120ms keeps a
 * 91-track playlist comfortably under their threshold while still finishing
 * in ~11s. Bump if 429s come back. */
const MATCH_THROTTLE_MS = 120;

/**
 * Sleep that wakes early on abort. Without this the throttle delay between
 * tracks would still tick out fully even after the client disconnected.
 */
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Run `matchOne` over an array of tracks serially with a small inter-request
 * delay. Apple's catalog endpoint rate-limits us if we sustain more than
 * ~50 hits with no gap. `matchOne` itself absorbs upstream errors so one
 * 429 won't fail the whole batch.
 *
 * Pass `signal` to abort mid-run when the upstream caller disappears (e.g.
 * the user switched storefront and the in-flight request was cancelled).
 */
export async function matchMany(
  tracks: SourceTrack[],
  storefront: string,
  signal?: AbortSignal,
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t) continue;
    if (i > 0) await sleep(MATCH_THROTTLE_MS, signal);
    signal?.throwIfAborted();
    results.push(await matchOne({ source: t, storefront, signal }));
  }
  return results;
}
