// Lean shapes for Spotify data we extract from the public embed iframe
// (`https://open.spotify.com/embed/playlist/{id}`). The embed page server-renders
// its data as JSON inside `<script id="__NEXT_DATA__">`, which is what we
// parse — no Web API, no OAuth, no Premium required.
//
// Trade-off: the embed payload is leaner than the API. We do NOT get ISRCs or
// album names, so downstream matching is fuzzy-only. Track lists are also
// capped at the embed's display limit (≤100 for user playlists, ≤50 for some
// algorithmic ones) — there's nothing we can do about that from this side.

/** Single track normalized for the matcher. */
export interface SpotifyTrack {
  /** Spotify track id (base62, 22 chars). Extracted from `uri`. */
  id: string;
  name: string;
  /**
   * Artist names in display order. The embed gives us a single comma-joined
   * `subtitle` string; we split on common separators (`, `, ` / `, ` & `) so
   * downstream code can keep treating artists as a list.
   */
  artists: string[];
  durationMs: number;
  /** Optional 30-sec MP3 preview Spotify ships in the embed payload. */
  audioPreviewUrl?: string;
  /** Canonical open.spotify.com URL for the track. */
  spotifyUrl: string;
}

/** A playlist with its full unrolled track list (capped by the embed). */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: { id: string; displayName: string };
  imageUrl?: string;
  /**
   * Number of tracks we actually got. The embed doesn't tell us the playlist's
   * real total when it's capped (it only renders the first N), so this is
   * effectively `tracks.length`. Treat as a lower bound, not an authoritative count.
   */
  totalTracks: number;
  tracks: SpotifyTrack[];
}
