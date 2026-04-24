import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  fetchLibraryPlaylists,
  searchLibrary,
} from '../api/appleMusicApi';
import SearchResultCard from '../components/SearchResultCard';
import { useMusicKit } from '../hooks/useMusicKit';
import type {
  AppleMusicLibrarySearchResponse,
  AppleMusicResource,
  LibraryPlaylist,
} from '../types/appleMusic';

export default function LibraryPage() {
  const { isAuthorized, musicUserToken } = useMusicKit();

  const [term, setTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    AppleMusicLibrarySearchResponse['results'] | null
  >(null);

  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  const loadPlaylists = useCallback(async () => {
    if (!isAuthorized || !musicUserToken) return;
    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const data = await fetchLibraryPlaylists({ musicUserToken });
      setPlaylists(data.data ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load playlists';
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
        setSearchError('Connect Apple Music first (Home page).');
        return;
      }
      setSearchLoading(true);
      setSearchError(null);
      setSearchResults(null);
      try {
        const data = await searchLibrary({ term: query, musicUserToken });
        setSearchResults(data.results);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Library search failed';
        setSearchError(msg);
      } finally {
        setSearchLoading(false);
      }
    },
    [term, isAuthorized, musicUserToken],
  );

  const flatSearchHits: AppleMusicResource[] = useMemo(() => {
    if (!searchResults) return [];
    return Object.values(searchResults)
      .flatMap((group) => group?.data ?? [])
      .filter(Boolean);
  }, [searchResults]);

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <header>
        <h1 style={{ margin: 0 }}>My Library</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
          Search what you already own and browse your playlists.
        </p>
      </header>

      {!isAuthorized && (
        <div className="error-banner" style={{ color: 'var(--color-warning)', borderColor: 'rgba(250, 204, 21, .4)', background: 'rgba(250, 204, 21, .08)' }}>
          Connect Apple Music on the Home page to enable library features.
        </div>
      )}

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Search my library</h2>
        <form onSubmit={onSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="search"
            value={term}
            placeholder="Search your library…"
            onChange={(ev) => setTerm(ev.target.value)}
            disabled={!isAuthorized}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={searchLoading || !term.trim() || !isAuthorized}
          >
            {searchLoading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchError && <div className="error-banner">{searchError}</div>}
        {searchResults && flatSearchHits.length === 0 && !searchLoading && (
          <div className="empty">No matches in your library.</div>
        )}
        {flatSearchHits.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {flatSearchHits.map((resource) => (
              <SearchResultCard
                key={`${resource.type}:${resource.id}`}
                resource={resource}
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>My Playlists</h2>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => void loadPlaylists()}
            disabled={!isAuthorized || playlistsLoading}
          >
            {playlistsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {playlistsError && <div className="error-banner">{playlistsError}</div>}
        {isAuthorized && !playlistsLoading && playlists.length === 0 && !playlistsError && (
          <div className="empty">No playlists yet.</div>
        )}
        {playlists.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 8,
            }}
          >
            {playlists.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.attributes?.name ?? '(untitled)'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    {p.attributes?.description?.short ??
                      (p.attributes?.canEdit === false ? 'Read-only' : 'Editable')}
                  </div>
                </div>
                <code style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.id}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
