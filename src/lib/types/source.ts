// Source-agnostic playlist + track types. Spotify and NetEase services both
// produce these. Match logic and UI consume these without knowing the source.

export type SourceType = 'spotify' | 'netease';

export interface SourceTrack {
  /** Which platform this track came from. */
  sourceType: SourceType;
  /** Source-native ID, stringified to avoid JS number-precision risk for
   *  large NetEase IDs (~11-digit decimals are safe but we standardize on
   *  string for consistency across sources). */
  id: string;
  name: string;
  /** Multiple artists are common; preserve order. */
  artists: string[];
  durationMs: number;
  albumName?: string;
  /** HTTP(S) artwork URL if the source provides one. */
  coverUrl?: string;
  /** 30s preview clip URL (Spotify embed gives this; NetEase does not). */
  previewUrl?: string;
  /** International Standard Recording Code if available. Spotify embed
   *  strips this; reserved here for future sources / matching paths. */
  isrc?: string;
}

export interface SourcePlaylist {
  sourceType: SourceType;
  id: string;
  name: string;
  owner: { displayName: string };
  totalTracks: number;
  coverUrl?: string;
  tracks: SourceTrack[];
}
