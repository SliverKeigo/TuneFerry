// Minimal Apple Music API response shapes. Only what we touch — full schema
// lives at https://developer.apple.com/documentation/applemusicapi.

export interface AppleMusicArtwork {
  url: string;
  width?: number;
  height?: number;
  bgColor?: string;
  textColor1?: string;
  textColor2?: string;
  textColor3?: string;
  textColor4?: string;
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
  isrc?: string;
  previews?: { url: string }[];
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

export interface LibraryPlaylistAttributes {
  name: string;
  artwork?: AppleMusicArtwork;
  description?: { short?: string; standard?: string };
  canEdit?: boolean;
  hasCatalog?: boolean;
  dateAdded?: string;
  playParams?: Record<string, unknown>;
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

export interface AppleMusicLibrarySearchResponse {
  results: Record<
    string,
    {
      href?: string;
      next?: string;
      data: AppleMusicResource[];
    }
  >;
}

export interface AppleMusicLibraryPlaylistsResponse {
  data: AppleMusicResource<LibraryPlaylistAttributes>[];
  next?: string;
}

export type LibraryAddResourceType = 'songs' | 'albums' | 'playlists' | 'music-videos';
