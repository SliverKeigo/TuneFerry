import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, fetchLibraryPlaylists, searchLibrary } from '../api/appleMusicApi';
import * as Icon from '../components/icons';
import {
  Artwork,
  type ArtworkKind,
  Button,
  MonoId,
  PageHeader,
  Pill,
  SectionHeader,
  Segmented,
  Spinner,
  StatusDot,
  artworkHueFromId,
} from '../components/primitives';
import { useMusicKit } from '../hooks/useMusicKit';
import type {
  AppleMusicArtwork,
  AppleMusicLibrarySearchResponse,
  AppleMusicResource,
  LibraryPlaylist,
} from '../types/appleMusic';

type LibraryScope = 'all' | 'songs' | 'albums' | 'playlists' | 'artists';

const LIBRARY_SCOPE_OPTIONS: { value: LibraryScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'songs', label: 'Songs' },
  { value: 'albums', label: 'Albums' },
  { value: 'playlists', label: 'Playlists' },
  { value: 'artists', label: 'Artists' },
];

const LIBRARY_SCOPE_TO_TYPES: Record<LibraryScope, string | undefined> = {
  all: undefined,
  songs: 'library-songs',
  albums: 'library-albums',
  playlists: 'library-playlists',
  artists: 'library-artists',
};

function artworkKindFor(type: string): ArtworkKind {
  if (type === 'library-artists' || type === 'artists') return 'artist';
  if (type === 'library-playlists' || type === 'playlists') return 'playlist';
  if (type === 'library-songs' || type === 'songs' || type === 'music-videos') return 'song';
  return 'album';
}

function monoPrefixFor(type: string): string {
  if (type === 'library-artists' || type === 'artists') return 'artist';
  if (type === 'library-playlists' || type === 'playlists') return 'pl';
  if (type === 'library-albums' || type === 'albums') return 'album';
  return 'song';
}

function artworkSrc(artwork: AppleMusicArtwork | undefined, size = 120): string | undefined {
  if (!artwork?.url) return undefined;
  return artwork.url.replace('{w}', String(size)).replace('{h}', String(size));
}

function getResourceTitle(resource: AppleMusicResource): string {
  const name = (resource.attributes as { name?: string } | undefined)?.name;
  return name ?? '(untitled)';
}

function getResourceSubtitle(resource: AppleMusicResource): string {
  const attrs = resource.attributes as Record<string, unknown> | undefined;
  if (!attrs) return '';
  const artistName = (attrs as { artistName?: string }).artistName;
  const albumName = (attrs as { albumName?: string }).albumName;
  if (resource.type === 'library-songs') {
    return [artistName, albumName].filter(Boolean).join(' · ');
  }
  if (resource.type === 'library-albums') {
    return artistName ?? '';
  }
  if (resource.type === 'library-playlists') {
    const desc = (attrs as { description?: { short?: string } }).description?.short;
    return desc ?? '';
  }
  return artistName ?? '';
}

export default function LibraryPage() {
  const { isAuthorized, musicUserToken, authorize } = useMusicKit();
  const navigate = useNavigate();

  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<LibraryScope>('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    AppleMusicLibrarySearchResponse['results'] | null
  >(null);

  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  const flatSearchHits: AppleMusicResource[] = useMemo(() => {
    if (!searchResults) return [];
    return Object.values(searchResults).flatMap((group) => group?.data ?? []);
  }, [searchResults]);

  const loadPlaylists = useCallback(async () => {
    if (!isAuthorized || !musicUserToken) return;
    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const data = await fetchLibraryPlaylists({ musicUserToken });
      setPlaylists(data.data ?? []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load playlists';
      setPlaylistsError(msg);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [isAuthorized, musicUserToken]);

  useEffect(() => {
    if (isAuthorized && musicUserToken) {
      void loadPlaylists();
    } else {
      setPlaylists([]);
    }
  }, [isAuthorized, musicUserToken, loadPlaylists]);

  const onSearch = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const query = term.trim();
      if (!query) return;
      if (!isAuthorized || !musicUserToken) {
        setSearchError('Connect Apple Music first.');
        return;
      }
      setSearchLoading(true);
      setSearchError(null);
      setSearchResults(null);
      try {
        const data = await searchLibrary({
          term: query,
          musicUserToken,
          types: LIBRARY_SCOPE_TO_TYPES[scope],
        });
        setSearchResults(data.results);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Library search failed';
        setSearchError(msg);
      } finally {
        setSearchLoading(false);
      }
    },
    [term, scope, isAuthorized, musicUserToken],
  );

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div
        className="page-enter"
        style={{ padding: '32px 48px 80px', maxWidth: 1280, margin: '0 auto' }}
      >
        <PageHeader
          eyebrow="Library"
          title="My Library"
          desc="Search what you already own and browse your playlists."
        />
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <StatusDot status="warn" size={8} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Connect your Apple Music account first
            </span>
          </div>
          <p
            style={{
              margin: '0 auto 22px',
              fontSize: 13.5,
              color: 'var(--text-3)',
              maxWidth: 420,
              lineHeight: 1.55,
            }}
          >
            Authorize once to read your library, playlists and recently added content.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                void authorize();
              }}
              icon={<Icon.Link size={14} />}
            >
              Connect Apple Music
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate('/')}
              iconRight={<Icon.Chevron size={13} />}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isSearchEmpty = searchResults !== null && flatSearchHits.length === 0;

  return (
    <div
      className="page-enter"
      style={{ padding: '32px 48px 80px', maxWidth: 1280, margin: '0 auto' }}
    >
      <PageHeader
        eyebrow="Library"
        title="My Library"
        desc="Search what you already own and browse your playlists."
      />

      {/* Library search section */}
      <section style={{ marginBottom: 36 }}>
        <SectionHeader
          title="Search my library"
          desc="Find songs, albums, playlists and artists you already own."
        />
        <form
          onSubmit={onSearch}
          className="panel"
          style={{
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Icon.Search size={17} style={{ color: 'var(--text-3)', marginLeft: 8 }} />
          <input
            className="input-native"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search your library…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              padding: '8px 0',
              color: 'var(--text)',
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={searchLoading || !term.trim()}
            icon={searchLoading ? <Spinner size={14} /> : <Icon.Arrow size={14} />}
          >
            {searchLoading ? 'Searching' : 'Search'}
          </Button>
        </form>

        <div style={{ marginBottom: 16 }}>
          <Segmented options={LIBRARY_SCOPE_OPTIONS} value={scope} onChange={(v) => setScope(v)} />
        </div>

        {searchError && <ErrorBanner message={searchError} />}

        {isSearchEmpty && !searchLoading && !searchError && (
          <div className="panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              No matches in your library.
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Try a different term — or broaden the type filter.
            </div>
          </div>
        )}

        {flatSearchHits.length > 0 && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {flatSearchHits.map((resource, i) => (
              <LibraryRow
                key={`${resource.type}:${resource.id}`}
                resource={resource}
                isLast={i === flatSearchHits.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* Playlists section */}
      <section>
        <SectionHeader
          title="My Playlists"
          desc="Everything in your Apple Music library."
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void loadPlaylists();
              }}
              disabled={playlistsLoading}
              icon={playlistsLoading ? <Spinner size={13} /> : <Icon.Refresh size={14} />}
            >
              {playlistsLoading ? 'Refreshing' : 'Refresh'}
            </Button>
          }
        />

        {playlistsError && <ErrorBanner message={playlistsError} />}

        {!playlistsLoading && playlists.length === 0 && !playlistsError && (
          <div className="panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No playlists yet</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Create a playlist in Apple Music and it will appear here.
            </div>
          </div>
        )}

        {playlists.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="panel"
      style={{
        padding: '12px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderColor: 'oklch(0.72 0.19 25 / 0.35)',
        background: 'oklch(0.72 0.19 25 / 0.08)',
        color: 'var(--err)',
        fontSize: 13,
      }}
    >
      <Icon.Alert size={15} />
      {message}
    </div>
  );
}

function LibraryRow({
  resource,
  isLast,
}: {
  resource: AppleMusicResource;
  isLast: boolean;
}) {
  const title = getResourceTitle(resource);
  const subtitle = getResourceSubtitle(resource);
  const hue = artworkHueFromId(resource.id);
  const kind = artworkKindFor(resource.type);
  const monoPrefix = monoPrefixFor(resource.type);
  const artwork = (resource.attributes as { artwork?: AppleMusicArtwork } | undefined)?.artwork;
  const imgSrc = artworkSrc(artwork, 120);

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 18px',
    borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
  };

  return (
    <div style={style}>
      <Artwork hue={hue} size={44} kind={kind} radius={8} imgSrc={imgSrc} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: -0.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <Pill tone="neutral">{resource.type}</Pill>
          <MonoId id={resource.id} prefix={monoPrefix} />
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: LibraryPlaylist }) {
  const attrs = playlist.attributes;
  const title = attrs?.name ?? '(untitled)';
  const desc = attrs?.description?.short;
  const editable = attrs?.canEdit === true;
  const hue = artworkHueFromId(playlist.id);
  const imgSrc = artworkSrc(attrs?.artwork, 200);

  return (
    <div
      className="panel"
      style={{
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--hairline-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = 'var(--hairline)';
      }}
    >
      <Artwork hue={hue} size={192} kind="playlist" radius={10} imgSrc={imgSrc} />
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: -0.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            marginTop: 4,
            lineHeight: 1.45,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {desc ?? (editable ? 'Editable playlist' : 'Read-only playlist')}
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Pill tone={editable ? 'accent' : 'neutral'}>{editable ? 'Editable' : 'Read-only'}</Pill>
          <MonoId id={playlist.id} prefix="pl" />
        </div>
      </div>
    </div>
  );
}
