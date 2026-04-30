// Source-shape types for the NetEase Cloud Music endpoints we consume.
// Intentionally minimal — only the fields `neteaseService` actually reads.
// The live JSON has dozens of additional fields (privilege/audio/quality
// metadata, etc.); modelling them all would couple us to NetEase's churn
// without buying any safety, so we let the rest stay `unknown` at the type
// boundary and walk defensively at runtime.

/** Subset of the `/api/v6/playlist/detail` response we read. */
export interface NeteasePlaylistDetailResponse {
  code: number;
  playlist: {
    id: number;
    name: string;
    coverImgUrl?: string;
    trackCount: number;
    creator?: { nickname?: string };
    /**
     * The complete ordered ID list. v6 only ships full track objects for the
     * first ~10 entries in `tracks[]`, so we ignore those and re-fetch every
     * track via `/api/song/detail` to keep one mapping path.
     */
    trackIds: { id: number }[];
  };
}

/** Subset of the `/api/song/detail` response we read. */
export interface NeteaseSongDetailResponse {
  code: number;
  songs: NeteaseRawSong[];
}

export interface NeteaseRawSong {
  id: number;
  name: string;
  artists: { name: string }[];
  album?: { name?: string; picUrl?: string };
  /** Duration in milliseconds. */
  duration: number;
}
