'use client';

import * as Icon from '@/components/icons';
import { Button, PageHeader, Pill, Spinner, useToast } from '@/components/primitives';
import type { SpotifyPlaylist } from '@/lib/types/spotify';
import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useState } from 'react';

interface ApiErrorBody {
  error?: { message?: string; status?: number };
}

interface FetchError {
  message: string;
  status: number;
}

export default function ImportPage() {
  const router = useRouter();
  const toast = useToast();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FetchError | null>(null);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          const status = body?.error?.status ?? res.status;
          const message = body?.error?.message ?? `Request failed (${res.status})`;
          throw Object.assign(new Error(message), { status });
        }
        const playlist = (await res.json()) as SpotifyPlaylist;
        sessionStorage.setItem(`tf.staged.${playlist.id}`, JSON.stringify(playlist));
        toast({
          message: `Loaded "${playlist.name}" — ${playlist.totalTracks} tracks.`,
          tone: 'ok',
        });
        router.push(`/match?spotify_id=${encodeURIComponent(playlist.id)}`);
      } catch (err) {
        const status =
          typeof (err as { status?: unknown }).status === 'number'
            ? ((err as { status: number }).status as number)
            : 0;
        const message = err instanceof Error ? err.message : 'Failed to fetch playlist.';
        setError({ message, status });
      } finally {
        setLoading(false);
      }
    },
    [input, loading, router, toast],
  );

  const errorHint = error
    ? error.status === 404
      ? 'Playlist not found or private — make sure the link is publicly accessible.'
      : error.status === 502
        ? 'Spotify changed their embed page — please try again, or report this.'
        : error.message
    : null;

  return (
    <main style={{ padding: '32px 32px 80px', maxWidth: 720, margin: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <Pill tone="warn">
          <Icon.Alert size={12} /> Public playlists only. Set the playlist to public on Spotify
          first if needed.
        </Pill>
      </div>

      <PageHeader
        eyebrow="Step 1 of 3"
        title="Import a Spotify playlist"
        desc="Paste a public Spotify playlist URL and we'll pull the tracks. No sign-in required."
      />

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input-native"
          type="text"
          placeholder="https://open.spotify.com/playlist/... or playlist ID"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          aria-label="Spotify playlist URL or ID"
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || input.trim().length === 0}
            icon={loading ? <Spinner size={14} /> : undefined}
            iconRight={!loading ? <Icon.Arrow size={14} /> : undefined}
          >
            {loading ? 'Fetching…' : 'Fetch playlist'}
          </Button>
          {loading && (
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Scraping the public embed page…
            </span>
          )}
        </div>
      </form>

      {error && errorHint && (
        <div
          className="panel"
          role="alert"
          style={{
            marginTop: 16,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            color: 'var(--err)',
            borderColor: 'oklch(0.72 0.19 25 / 0.4)',
            background: 'oklch(0.72 0.19 25 / 0.08)',
          }}
        >
          <Icon.Alert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{errorHint}</div>
        </div>
      )}

      <div
        className="panel"
        style={{
          marginTop: 24,
          padding: '14px 16px',
          fontSize: 13,
          color: 'var(--text-2)',
          lineHeight: 1.6,
        }}
      >
        <ul
          style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <li>
            Paste any public Spotify playlist URL — works for both{' '}
            <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              https://open.spotify.com/playlist/&lt;id&gt;?si=…
            </code>{' '}
            and bare IDs.
          </li>
          <li>
            Up to <strong>100 tracks</strong> per playlist (Spotify embed limit). Spotify's
            algorithmic playlists like "Today's Top Hits" cap at 50.
          </li>
          <li>No sign-in. We never see your Spotify account.</li>
        </ul>
      </div>
    </main>
  );
}
