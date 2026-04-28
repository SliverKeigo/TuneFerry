'use client';

import * as Icon from '@/components/icons';
import { Button, PageHeader, Pill, Spinner, useToast } from '@/components/primitives';
import type { SpotifyPlaylist } from '@/lib/types/spotify';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('import');

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
          message: t('loadedToast', { name: playlist.name, count: playlist.totalTracks }),
          tone: 'ok',
        });
        router.push(`/match?spotify_id=${encodeURIComponent(playlist.id)}`);
      } catch (err) {
        const status =
          typeof (err as { status?: unknown }).status === 'number'
            ? ((err as { status: number }).status as number)
            : 0;
        const message = err instanceof Error ? err.message : t('fetchFailed');
        setError({ message, status });
      } finally {
        setLoading(false);
      }
    },
    [input, loading, router, toast, t],
  );

  const errorHint = error
    ? error.status === 404
      ? t('errorNotFound')
      : error.status === 502
        ? t('errorBadGateway')
        : error.message
    : null;

  return (
    <main style={{ padding: '32px 32px 80px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Pill tone="warn">
          <Icon.Alert size={12} /> {t('publicOnly')}
        </Pill>
      </div>

      <PageHeader eyebrow={t('eyebrow')} title={t('title')} desc={t('desc')} />

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input-native"
          type="text"
          placeholder={t('placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          aria-label={t('inputAria')}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || input.trim().length === 0}
            icon={loading ? <Spinner size={14} /> : undefined}
            iconRight={!loading ? <Icon.Arrow size={14} /> : undefined}
          >
            {loading ? t('fetching') : t('fetch')}
          </Button>
          {loading && (
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{t('scrapingHint')}</span>
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
            {t.rich('tip1', {
              code: (chunks) => (
                <code
                  style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}
                >
                  {chunks}
                </code>
              ),
            })}
          </li>
          <li>
            {t.rich('tip2', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </li>
          <li>{t('tip3')}</li>
        </ul>
      </div>
    </main>
  );
}
