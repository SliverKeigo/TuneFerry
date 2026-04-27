// Lean shapes for the Spotify Web API responses we touch. Full schemas live
// at https://developer.spotify.com/documentation/web-api — we only model what
// our services consume so a future API change can't silently widen our types.

/** Single track normalized for the matcher. */
export interface SpotifyTrack {
  /** Spotify track id (base62, 22 chars). */
  id: string;
  name: string;
  /** Artist names in display order. Joined with ", " by callers when needed. */
  artists: string[];
  album: string;
  /** External `external_ids.isrc` — the deterministic match key. */
  isrc?: string;
  durationMs: number;
  previewUrl?: string;
  /** Canonical open.spotify.com URL for the track. */
  spotifyUrl: string;
}

/** A playlist with its full unrolled track list. */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: { id: string; displayName: string };
  imageUrl?: string;
  totalTracks: number;
  tracks: SpotifyTrack[];
}

/** Tokens returned by Spotify's /api/token endpoint, normalized for storage. */
export interface SpotifyTokens {
  accessToken: string;
  /** Only present after the initial Authorization Code exchange (and rare rotations). */
  refreshToken?: string;
  /** Absolute expiry as epoch ms — easier to reason about than `expires_in` deltas. */
  expiresAt: number;
  /** Space-separated scope string echoed by Spotify. */
  scope: string;
}

/** A page of the user's own playlists for the wizard's playlist picker. */
export interface SpotifyPagedPlaylists {
  items: { id: string; name: string; totalTracks: number; imageUrl?: string }[];
  total: number;
  /** Next-page URL Spotify returns, or `null` when we've reached the end. */
  next: string | null;
}
