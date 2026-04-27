// Frontend-side mirror of the Apple Music types we care about. Kept in sync
// with `lib/types/appleMusic.ts` but deliberately duplicated to avoid a
// shared-package build step for MVP.

export interface AppleMusicArtwork {
  url: string;
  width?: number;
  height?: number;
  bgColor?: string;
  textColor1?: string;
  textColor2?: string;
}

export interface AppleMusicResource<Attributes = Record<string, unknown>> {
  id: string;
  type: string;
  href?: string;
  attributes?: Attributes;
}

export interface AppleMusicSongAttributes {
  name: string;
  artistName: string;
  albumName?: string;
  artwork?: AppleMusicArtwork;
  durationInMillis?: number;
  genreNames?: string[];
  releaseDate?: string;
  url?: string;
}

export interface AppleMusicAlbumAttributes {
  name: string;
  artistName: string;
  artwork?: AppleMusicArtwork;
  trackCount?: number;
  releaseDate?: string;
  genreNames?: string[];
  url?: string;
}

export interface AppleMusicArtistAttributes {
  name: string;
  artwork?: AppleMusicArtwork;
  genreNames?: string[];
  url?: string;
}

export interface AppleMusicPlaylistAttributes {
  name: string;
  artwork?: AppleMusicArtwork;
  curatorName?: string;
  description?: { short?: string; standard?: string };
  playlistType?: 'user-shared' | 'editorial' | 'external' | 'personal-mix';
  url?: string;
}

export type CatalogSearchResultType = 'songs' | 'albums' | 'artists' | 'playlists' | 'music-videos';

export interface AppleMusicSearchResponse {
  results: Partial<
    Record<
      CatalogSearchResultType,
      {
        href?: string;
        next?: string;
        data: AppleMusicResource[];
      }
    >
  >;
}

export interface ApiErrorShape {
  error: {
    message: string;
    status: number;
    details?: unknown;
  };
}
