import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { ApiError, addToLibrary, searchCatalog } from '../api/appleMusicApi';
import SearchResultCard from '../components/SearchResultCard';
import { useMusicKit } from '../hooks/useMusicKit';
import type {
  AppleMusicResource,
  AppleMusicSearchResponse,
  CatalogSearchResultType,
  LibraryAddResourceType,
} from '../types/appleMusic';

const TYPE_LABELS: Record<CatalogSearchResultType, string> = {
  songs: 'Songs',
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
  'music-videos': 'Music Videos',
};

const LIBRARY_ADDABLE: Record<string, LibraryAddResourceType | undefined> = {
  songs: 'songs',
  albums: 'albums',
  playlists: 'playlists',
  'music-videos': 'music-videos',
};

type AddState =
  | { status: 'idle' }
  | { status: 'pending'; key: string }
  | { status: 'success'; key: string }
  | { status: 'error'; key: string; message: string };

function resourceKey(r: AppleMusicResource): string {
  return `${r.type}:${r.id}`;
}

export default function SearchPage() {
  const { storefront, isAuthorized, musicUserToken } = useMusicKit();
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AppleMusicSearchResponse['results'] | null>(null);
  const [addState, setAddState] = useState<AddState>({ status: 'idle' });

  const orderedGroups = useMemo(() => {
    if (!results) return [];
    const order: CatalogSearchResultType[] = [
      'songs',
      'albums',
      'artists',
      'playlists',
      'music-videos',
    ];
    const out: { type: CatalogSearchResultType; data: AppleMusicResource[] }[] = [];
    for (const t of order) {
      const group = results[t];
      if (group && group.data.length > 0) {
        out.push({ type: t, data: group.data });
      }
    }
    return out;
  }, [results]);

  const onSearch = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const query = term.trim();
      if (!query) return;
      setLoading(true);
      setError(null);
      setResults(null);
      try {
        const data = await searchCatalog({ term: query, storefront });
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
    [term, storefront],
  );

  const onAdd = useCallback(
    async (resource: AppleMusicResource) => {
      const libType = LIBRARY_ADDABLE[resource.type];
      if (!libType) return;
      if (!isAuthorized || !musicUserToken) {
        setAddState({
          status: 'error',
          key: resourceKey(resource),
          message: 'Connect Apple Music first (Home page).',
        });
        return;
      }
      const key = resourceKey(resource);
      setAddState({ status: 'pending', key });
      try {
        await addToLibrary({ type: libType, ids: [resource.id], musicUserToken });
        setAddState({ status: 'success', key });
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to add';
        setAddState({ status: 'error', key, message: msg });
      }
    },
    [isAuthorized, musicUserToken],
  );

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0 }}>Search Apple Music</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
          Storefront: <strong>{storefront}</strong> · Change it in Settings.
        </p>
      </header>

      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          type="search"
          value={term}
          placeholder="Search songs, albums, artists, playlists…"
          onChange={(ev) => setTerm(ev.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !term.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {!isAuthorized && (
        <div
          className="success-banner"
          style={{
            color: 'var(--color-warning)',
            borderColor: 'rgba(250, 204, 21, .4)',
            background: 'rgba(250, 204, 21, .08)',
          }}
        >
          You can search without connecting, but adding to your library requires connecting Apple
          Music first.
        </div>
      )}

      {results && orderedGroups.length === 0 && !loading && (
        <div className="empty">No results found.</div>
      )}

      {orderedGroups.map(({ type, data }) => (
        <section key={type} style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>{TYPE_LABELS[type]}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.map((resource) => {
              const addable = LIBRARY_ADDABLE[resource.type];
              const key = resourceKey(resource);
              const thisPending = addState.status === 'pending' && addState.key === key;
              const thisSuccess = addState.status === 'success' && addState.key === key;
              const thisError = addState.status === 'error' && addState.key === key;
              return (
                <SearchResultCard
                  key={key}
                  resource={resource}
                  actions={
                    addable ? (
                      <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => onAdd(resource)}
                          disabled={thisPending || thisSuccess}
                        >
                          {thisPending ? 'Adding…' : thisSuccess ? 'Added ✓' : 'Add to Library'}
                        </button>
                        {thisError && (
                          <span style={{ color: 'var(--color-error)', fontSize: 12 }}>
                            {addState.message}
                          </span>
                        )}
                      </div>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
