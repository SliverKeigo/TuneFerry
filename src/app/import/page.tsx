'use client';

import * as Icon from '@/components/icons';
import {
  Artwork,
  Button,
  PageHeader,
  Pill,
  SectionHeader,
  Spinner,
  artworkHueFromId,
  useToast,
} from '@/components/primitives';
import type { SpotifyPagedPlaylists, SpotifyPlaylist } from '@/lib/types/spotify';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface ApiErrorBody {
  error?: { message?: string };
}

const PAGE_SIZE = 20;

export default function ImportPage() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  // ── Banner state from query param ─────────────────────────────────────────
  const spotifyParam = params.get('spotify');
  const errorParam = params.get('error');
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (spotifyParam === 'connected') {
      setBanner({ tone: 'ok', text: 'Connected to Spotify' });
      const t = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(t);
    }
    if (spotifyParam === 'error') {
      setBanner({ tone: 'err', text: errorParam ?? 'Spotify sign-in failed.' });
      return;
    }
    return;
  }, [spotifyParam, errorParam]);

  // ── Path A: public URL ────────────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState('');
  const [fetchingPublic, setFetchingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const fetchPublic = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setPublicError('Paste a Spotify playlist URL or ID first.');
      return;
    }
    setPublicError(null);
    setFetchingPublic(true);
    try {
      const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
      }
      const playlist = (await res.json()) as SpotifyPlaylist;
      sessionStorage.setItem(`tf.staged.${playlist.id}`, JSON.stringify(playlist));
      router.push(`/match?spotify_id=${encodeURIComponent(playlist.id)}&public=1`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch playlist.';
      setPublicError(msg);
      toast({ message: msg, tone: 'err' });
    } finally {
      setFetchingPublic(false);
    }
  }, [urlInput, router, toast]);

  // ── Path B: connected account ─────────────────────────────────────────────
  type ConnState = 'unknown' | 'connected' | 'disconnected';
  const [conn, setConn] = useState<ConnState>('unknown');
  const [page, setPage] = useState<SpotifyPagedPlaylists | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  // Connection probe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/spotify/me/playlists?limit=1');
        if (cancelled) return;
        if (res.status === 401) {
          setConn('disconnected');
          return;
        }
        if (!res.ok) {
          setConn('disconnected');
          return;
        }
        setConn('connected');
      } catch {
        if (!cancelled) setConn('disconnected');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load a page once we know we're connected (or when offset changes).
  useEffect(() => {
    if (conn !== 'connected') return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const res = await fetch(`/api/spotify/me/playlists?limit=${PAGE_SIZE}&offset=${offset}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as SpotifyPagedPlaylists;
        if (!cancelled) setPage(data);
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, offset]);

  const pickPrivate = useCallback(
    async (id: string) => {
      setPickingId(id);
      try {
        const res = await fetch(`/api/spotify/me/playlist?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
        }
        const playlist = (await res.json()) as SpotifyPlaylist;
        sessionStorage.setItem(`tf.staged.${playlist.id}`, JSON.stringify(playlist));
        router.push(`/match?spotify_id=${encodeURIComponent(playlist.id)}&private=1`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch playlist.';
        toast({ message: msg, tone: 'err' });
        setPickingId(null);
      }
    },
    [router, toast],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/spotify/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — we'll reload anyway */
    }
    window.location.reload();
  }, []);

  const total = page?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = page ? offset + PAGE_SIZE < total : false;

  return (
    <main style={{ padding: '32px 32px 64px', maxWidth: 1080, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Step 1 of 3"
        title="Import a Spotify playlist"
        desc="Pick how you want to get the source. Public URLs need no sign-in; for your own private playlists, connect Spotify."
      />

      {banner && (
        <div style={{ marginBottom: 20 }}>
          {banner.tone === 'ok' ? (
            <Pill tone="ok" style={{ padding: '8px 12px', fontSize: 12.5 }}>
              <Icon.Check size={13} /> {banner.text}
            </Pill>
          ) : (
            <div
              className="panel"
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--err)',
                borderColor: 'oklch(0.72 0.19 25 / 0.4)',
              }}
            >
              <Icon.Alert size={16} /> <span style={{ fontSize: 13 }}>{banner.text}</span>
            </div>
          )}
        </div>
      )}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* Path A */}
        <div className="panel" style={{ padding: 22 }}>
          <SectionHeader
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon.Link size={15} /> Public playlist URL
              </span>
            }
            desc="No sign-in required — works for any public Spotify playlist."
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <input
              className="input-native"
              placeholder="https://open.spotify.com/playlist/... or playlist id"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !fetchingPublic) fetchPublic();
              }}
            />
            <Button
              variant="primary"
              onClick={fetchPublic}
              disabled={fetchingPublic}
              icon={fetchingPublic ? <Spinner size={14} /> : <Icon.Arrow size={14} />}
            >
              {fetchingPublic ? 'Fetching' : 'Fetch playlist'}
            </Button>
          </div>
          {publicError && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--err)' }}>{publicError}</p>
          )}
        </div>

        {/* Path B */}
        <div className="panel" style={{ padding: 22 }}>
          <SectionHeader
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon.User size={15} /> Your Spotify
              </span>
            }
            desc={
              conn === 'connected'
                ? 'Browse and pick from your own playlists.'
                : 'Sign in to migrate private and collaborative playlists.'
            }
            right={
              conn === 'connected' && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Icon.Unlink size={13} />}
                  onClick={signOut}
                >
                  Sign out
                </Button>
              )
            }
          />

          {conn === 'unknown' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--text-3)',
                fontSize: 13,
                padding: '20px 0',
              }}
            >
              <Spinner /> Checking session…
            </div>
          )}

          {conn === 'disconnected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <Button
                variant="primary"
                icon={<Icon.Link size={14} />}
                onClick={() => {
                  window.location.href = '/api/spotify/auth/login';
                }}
              >
                Sign in with Spotify
              </Button>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>
                We use a HttpOnly session cookie. We never store your password.
              </p>
            </div>
          )}

          {conn === 'connected' && (
            <div style={{ marginTop: 4 }}>
              {loadingList && !page && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: 'var(--text-3)',
                    fontSize: 13,
                    padding: '12px 0',
                  }}
                >
                  <Spinner /> Loading your playlists…
                </div>
              )}
              {listError && (
                <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: 'var(--err)' }}>
                  {listError}
                </p>
              )}
              {page && (
                <>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      maxHeight: 360,
                      overflowY: 'auto',
                    }}
                  >
                    {page.items.length === 0 && (
                      <li
                        style={{
                          padding: 16,
                          fontSize: 13,
                          color: 'var(--text-3)',
                          textAlign: 'center',
                        }}
                      >
                        No playlists found on this page.
                      </li>
                    )}
                    {page.items.map((p) => {
                      const picking = pickingId === p.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pickPrivate(p.id)}
                            disabled={pickingId !== null}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '8px 10px',
                              borderRadius: 10,
                              background: picking ? 'var(--elev)' : 'transparent',
                              border: '1px solid transparent',
                              textAlign: 'left',
                              transition: 'background var(--dur) var(--ease)',
                              opacity: pickingId !== null && !picking ? 0.55 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (pickingId === null)
                                e.currentTarget.style.background = 'var(--elev)';
                            }}
                            onMouseLeave={(e) => {
                              if (!picking) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Artwork
                              size={40}
                              radius={6}
                              kind="playlist"
                              hue={artworkHueFromId(p.id)}
                              imgSrc={p.imageUrl}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {p.name}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
                                {p.totalTracks} tracks
                              </div>
                            </div>
                            {picking ? (
                              <Spinner size={14} />
                            ) : (
                              <Icon.Chevron size={14} style={{ color: 'var(--text-4)' }} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid var(--hairline)',
                    }}
                  >
                    <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
                      {total === 0 ? '0' : `${pageStart}–${pageEnd}`} of {total}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!hasPrev || loadingList}
                        onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                      >
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!hasNext || loadingList}
                        onClick={() => setOffset((o) => o + PAGE_SIZE)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
