import { type CSSProperties, type FormEvent, useCallback, useMemo, useState } from 'react';
import { ApiError, addToLibrary, searchCatalog } from '../api/appleMusicApi';
import * as Icon from '../components/icons';
import {
  AddButton,
  type AddButtonState,
  Artwork,
  type ArtworkKind,
  Button,
  MonoId,
  PageHeader,
  Pill,
  SectionHeader,
  Segmented,
  Spinner,
  artworkHueFromId,
  useToast,
} from '../components/primitives';
import { useMusicKit } from '../hooks/useMusicKit';
import type {
  AppleMusicAlbumAttributes,
  AppleMusicArtistAttributes,
  AppleMusicArtwork,
  AppleMusicPlaylistAttributes,
  AppleMusicResource,
  AppleMusicSearchResponse,
  AppleMusicSongAttributes,
  CatalogSearchResultType,
  LibraryAddResourceType,
} from '../types/appleMusic';

type ScopeValue = 'all' | 'songs' | 'albums' | 'playlists';

const SCOPE_OPTIONS: { value: ScopeValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'songs', label: 'Songs' },
  { value: 'albums', label: 'Albums' },
  { value: 'playlists', label: 'Playlists' },
];

const SCOPE_TO_TYPES: Record<ScopeValue, string | undefined> = {
  all: undefined,
  songs: 'songs',
  albums: 'albums',
  playlists: 'playlists',
};

const TYPE_LABELS: Record<CatalogSearchResultType, string> = {
  songs: 'Songs',
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
  'music-videos': 'Music Videos',
};

const TYPE_ORDER: CatalogSearchResultType[] = [
  'songs',
  'albums',
  'artists',
  'playlists',
  'music-videos',
];

const LIBRARY_ADDABLE: Record<string, LibraryAddResourceType | undefined> = {
  songs: 'songs',
  albums: 'albums',
  playlists: 'playlists',
  'music-videos': 'music-videos',
};

function resourceKey(r: AppleMusicResource): string {
  return `${r.type}:${r.id}`;
}

function artworkKindFor(type: string): ArtworkKind {
  if (type === 'artists' || type === 'library-artists') return 'artist';
  if (type === 'playlists' || type === 'library-playlists') return 'playlist';
  if (type === 'songs' || type === 'library-songs' || type === 'music-videos') return 'song';
  return 'album';
}

function monoPrefixFor(type: string): string {
  if (type === 'artists' || type === 'library-artists') return 'artist';
  if (type === 'playlists' || type === 'library-playlists') return 'pl';
  if (type === 'albums' || type === 'library-albums') return 'album';
  if (type === 'music-videos') return 'mv';
  return 'song';
}

function artworkSrc(artwork: AppleMusicArtwork | undefined, size = 120): string | undefined {
  if (!artwork?.url) return undefined;
  return artwork.url.replace('{w}', String(size)).replace('{h}', String(size));
}

function formatDuration(ms: number | undefined): string | undefined {
  if (!ms || ms <= 0) return undefined;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// `attrs` is typed as `unknown` here because the API returns differently-shaped
// attribute objects per result type. We narrow via explicit casts in the row.
function getResourceTitle(resource: AppleMusicResource): string {
  const name = (resource.attributes as { name?: string } | undefined)?.name;
  return name ?? '(untitled)';
}

function getResourceSubtitle(resource: AppleMusicResource): string {
  const attrs = resource.attributes;
  if (!attrs) return '';
  if (resource.type === 'songs') {
    const a = attrs as unknown as AppleMusicSongAttributes;
    return [a.artistName, a.albumName].filter(Boolean).join(' · ');
  }
  if (resource.type === 'albums') {
    const a = attrs as unknown as AppleMusicAlbumAttributes;
    return a.artistName ?? '';
  }
  if (resource.type === 'artists') {
    const a = attrs as unknown as AppleMusicArtistAttributes;
    return (a.genreNames ?? []).slice(0, 2).join(' · ');
  }
  if (resource.type === 'playlists') {
    const a = attrs as unknown as AppleMusicPlaylistAttributes;
    return a.curatorName ?? a.description?.short ?? '';
  }
  if (resource.type === 'music-videos') {
    const a = attrs as unknown as AppleMusicSongAttributes;
    return a.artistName ?? '';
  }
  return '';
}

function getResourceDuration(resource: AppleMusicResource): string | undefined {
  if (resource.type !== 'songs' && resource.type !== 'music-videos') return undefined;
  const a = resource.attributes as unknown as AppleMusicSongAttributes | undefined;
  return formatDuration(a?.durationInMillis);
}

export default function SearchPage() {
  const { storefront, isAuthorized, musicUserToken } = useMusicKit();
  const toast = useToast();

  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<ScopeValue>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AppleMusicSearchResponse['results'] | null>(null);
  const [addStates, setAddStates] = useState<Map<string, AddButtonState>>(() => new Map());

  const orderedGroups = useMemo(() => {
    if (!results) return [];
    const out: { type: CatalogSearchResultType; data: AppleMusicResource[] }[] = [];
    for (const t of TYPE_ORDER) {
      const group = results[t];
      if (group && group.data.length > 0) {
        out.push({ type: t, data: group.data });
      }
    }
    return out;
  }, [results]);

  const isEmpty = results !== null && orderedGroups.length === 0;

  const runSearch = useCallback(
    async (query: string, scopeValue: ScopeValue) => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      setResults(null);
      try {
        const data = await searchCatalog({
          term: q,
          storefront,
          types: SCOPE_TO_TYPES[scopeValue],
        });
        setResults(data.results);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Search failed';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [storefront],
  );

  const onSubmit = useCallback(
    (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      void runSearch(term, scope);
    },
    [term, scope, runSearch],
  );

  const setOneAddState = useCallback((key: string, state: AddButtonState) => {
    setAddStates((prev) => {
      const next = new Map(prev);
      next.set(key, state);
      return next;
    });
  }, []);

  const onAdd = useCallback(
    async (resource: AppleMusicResource) => {
      const libType = LIBRARY_ADDABLE[resource.type];
      if (!libType) return;
      const key = resourceKey(resource);
      if (!isAuthorized || !musicUserToken) {
        toast({ tone: 'err', message: 'Connect Apple Music first to add to library.' });
        setOneAddState(key, 'failed');
        return;
      }
      setOneAddState(key, 'adding');
      try {
        await addToLibrary({ type: libType, ids: [resource.id], musicUserToken });
        setOneAddState(key, 'added');
        toast({ tone: 'ok', message: 'Added to library' });
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to add';
        setOneAddState(key, 'failed');
        toast({ tone: 'err', message: msg });
      }
    },
    [isAuthorized, musicUserToken, toast, setOneAddState],
  );

  return (
    <div
      className="page-enter"
      style={{ padding: '32px 48px 80px', maxWidth: 1280, margin: '0 auto' }}
    >
      <PageHeader
        eyebrow="Catalog"
        title="Search Apple Music"
        desc="Find songs, albums, artists, playlists across Apple's catalog."
        right={
          <Pill tone="neutral">Storefront · {storefront ? storefront.toUpperCase() : '—'}</Pill>
        }
      />

      {/* Search bar */}
      <form
        onSubmit={onSubmit}
        className="panel"
        style={{
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Icon.Search size={17} style={{ color: 'var(--text-3)', marginLeft: 8 }} />
        <input
          className="input-native"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by title, artist, album…"
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
          disabled={loading || !term.trim()}
          icon={loading ? <Spinner size={14} /> : <Icon.Arrow size={14} />}
        >
          {loading ? 'Searching' : 'Search'}
        </Button>
      </form>

      {/* Scope filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Segmented options={SCOPE_OPTIONS} value={scope} onChange={(v) => setScope(v)} />
        {loading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--text-3)',
            }}
          >
            <Spinner size={13} /> Searching…
          </span>
        )}
      </div>

      {/* Not-connected warning */}
      {!isAuthorized && (
        <div
          className="panel"
          style={{
            padding: '10px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderColor: 'oklch(0.82 0.14 85 / 0.3)',
            background: 'oklch(0.82 0.14 85 / 0.08)',
            color: 'var(--warn)',
            fontSize: 12.5,
          }}
        >
          <Icon.Alert size={14} />
          Adding to library requires connecting Apple Music first.
        </div>
      )}

      {/* Error banner */}
      {error && (
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
          {error}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !loading && !error && (
        <div className="panel" style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 14px',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--elev)',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon.Search size={20} />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No results</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            Try a different term or change the storefront in Settings.
          </p>
        </div>
      )}

      {/* Result groups */}
      {orderedGroups.map(({ type, data }) => (
        <section key={type} style={{ marginBottom: 28 }}>
          <SectionHeader
            title={TYPE_LABELS[type]}
            right={
              <span
                style={{
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-4)',
                }}
              >
                {data.length} {data.length === 1 ? 'result' : 'results'}
              </span>
            }
          />
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {data.map((resource, i) => (
              <ResultRow
                key={resourceKey(resource)}
                resource={resource}
                isLast={i === data.length - 1}
                state={addStates.get(resourceKey(resource)) ?? 'idle'}
                onAdd={() => onAdd(resource)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ResultRow({
  resource,
  isLast,
  state,
  onAdd,
}: {
  resource: AppleMusicResource;
  isLast: boolean;
  state: AddButtonState;
  onAdd: () => void;
}) {
  const libType = LIBRARY_ADDABLE[resource.type];
  const title = getResourceTitle(resource);
  const subtitle = getResourceSubtitle(resource);
  const duration = getResourceDuration(resource);
  const hue = artworkHueFromId(resource.id);
  const kind = artworkKindFor(resource.type);
  const monoPrefix = monoPrefixFor(resource.type);
  const artwork = (resource.attributes as { artwork?: AppleMusicArtwork } | undefined)?.artwork;
  const imgSrc = artworkSrc(artwork, 120);

  const hoverStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 18px',
    borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
    transition: 'background var(--dur) var(--ease)',
  };

  return (
    <div
      style={hoverStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'oklch(1 0 0 / 0.025)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Artwork hue={hue} size={48} kind={kind} radius={8} imgSrc={imgSrc} />
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
          {duration && <Pill tone="neutral">{duration}</Pill>}
          <MonoId id={resource.id} prefix={monoPrefix} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        {libType && <AddButton state={state} onAdd={onAdd} size="sm" />}
      </div>
    </div>
  );
}
