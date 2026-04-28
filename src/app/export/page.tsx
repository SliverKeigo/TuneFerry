'use client';

import * as Icon from '@/components/icons';
import {
  Artwork,
  Button,
  PageHeader,
  Pill,
  SectionHeader,
  artworkHueFromId,
  useToast,
} from '@/components/primitives';
import type { AppleSongLite, MatchResult } from '@/lib/matchService';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

/** Persisted shape from the Match page. */
interface FinalizedMatch extends MatchResult {
  included: boolean;
}

interface ExportRow {
  index: number;
  apple: AppleSongLite;
  /** Spotify duration as a fallback if Apple lacks one. */
  fallbackDurationMs: number;
}

// Suspense boundary — same reason as /match/page.tsx.
export default function ExportPage() {
  return (
    <Suspense fallback={<ExportLoadingFallback />}>
      <ExportPageContent />
    </Suspense>
  );
}

function ExportLoadingFallback() {
  return (
    <main style={{ padding: '40px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
    </main>
  );
}

function ExportPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const t = useTranslations('export');

  const spotifyId = params.get('spotify_id');
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState<ExportRow[] | null>(null);

  useEffect(() => {
    if (!spotifyId) {
      setMissing(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`tf.matched.${spotifyId}`);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as FinalizedMatch[];
      const filtered: ExportRow[] = parsed
        .filter((m) => m.included && m.apple !== null)
        .map((m, i) => ({
          index: i + 1,
          // The filter above guarantees apple is non-null.
          apple: m.apple as AppleSongLite,
          fallbackDurationMs: m.spotify.durationMs,
        }));
      setRows(filtered);
    } catch {
      setMissing(true);
    }
  }, [spotifyId]);

  const m3u8Body = useMemo(() => {
    if (!rows) return '';
    const lines: string[] = ['#EXTM3U'];
    for (const r of rows) {
      const seconds = Math.round((r.apple.durationMs ?? r.fallbackDurationMs) / 1000);
      // EXTINF strips newlines/commas defensively to keep the format valid.
      const safeArtist = r.apple.artistName.replace(/[\r\n]+/g, ' ').replace(/,/g, '');
      const safeTitle = r.apple.name.replace(/[\r\n]+/g, ' ').replace(/,/g, '');
      lines.push(`#EXTINF:${seconds},${safeArtist} - ${safeTitle}`);
      lines.push(r.apple.catalogUrl);
    }
    return `${lines.join('\n')}\n`;
  }, [rows]);

  const onCopyAll = useCallback(async () => {
    if (!rows) return;
    const text = rows.map((r) => r.apple.catalogUrl).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: t('copiedToast', { n: rows.length }), tone: 'ok' });
    } catch {
      toast({ message: t('clipboardError'), tone: 'err' });
    }
  }, [rows, toast, t]);

  const onDownloadM3U = useCallback(() => {
    if (!rows || rows.length === 0) return;
    const blob = new Blob([m3u8Body], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tuneferry-${spotifyId ?? 'playlist'}.m3u8`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [m3u8Body, rows, spotifyId]);

  const onStartOver = useCallback(() => {
    if (spotifyId) {
      sessionStorage.removeItem(`tf.staged.${spotifyId}`);
      sessionStorage.removeItem(`tf.matched.${spotifyId}`);
    }
    router.push('/import');
  }, [router, spotifyId]);

  if (missing) {
    return (
      <main style={{ padding: '40px 32px', maxWidth: 920, margin: '0 auto' }}>
        <PageHeader title={t('missingTitle')} desc={t('missingDesc')} />
        <Button variant="primary" onClick={() => router.push('/import')}>
          {t('startMigration')}
        </Button>
      </main>
    );
  }

  if (!rows) {
    return (
      <main style={{ padding: 40, color: 'var(--text-3)', fontSize: 13 }}>{t('loading')}</main>
    );
  }

  return (
    <main style={{ padding: '32px 48px 64px', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        desc={t('desc', { count: rows.length })}
        right={
          <Button variant="ghost" icon={<Icon.Refresh size={14} />} onClick={onStartOver}>
            {t('startAnother')}
          </Button>
        }
      />

      {rows.length === 0 && (
        <div
          className="panel"
          style={{
            padding: 22,
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          {t('noneIncluded')}
        </div>
      )}

      {rows.length > 0 && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
            gap: 20,
            alignItems: 'flex-start',
          }}
        >
          {/* Deep link list */}
          <div className="panel" style={{ padding: 18 }}>
            <SectionHeader
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon.Link size={15} /> {t('deepLinkTitle')}
                </span>
              }
              desc={t('deepLinkDesc')}
              right={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Icon.Copy size={13} />}
                  onClick={onCopyAll}
                >
                  {t('copyAll')}
                </Button>
              }
            />
            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 560,
                overflowY: 'auto',
              }}
            >
              {rows.map((r) => (
                <li
                  key={r.apple.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 8px',
                    borderRadius: 8,
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-4)',
                      width: 28,
                      textAlign: 'right',
                    }}
                  >
                    {r.index}
                  </span>
                  <Artwork
                    size={36}
                    radius={5}
                    kind="song"
                    hue={artworkHueFromId(r.apple.id)}
                    imgSrc={r.apple.artworkUrl}
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
                      {r.apple.artistName} — {r.apple.name}
                    </div>
                    <a
                      href={r.apple.catalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11.5,
                        color: 'var(--accent)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {r.apple.catalogUrl}
                    </a>
                  </div>
                  <a
                    href={r.apple.catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('openAria')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      color: 'var(--text-3)',
                      border: '1px solid var(--hairline)',
                    }}
                  >
                    <Icon.Arrow size={14} />
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* m3u8 panel */}
          <div className="panel" style={{ padding: 18 }}>
            <SectionHeader
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon.Disc size={15} /> {t('m3u8Title')}
                </span>
              }
              desc={t('m3u8Desc')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button
                variant="primary"
                icon={<Icon.Arrow size={14} />}
                onClick={onDownloadM3U}
                disabled={rows.length === 0}
              >
                {t('downloadM3u8')}
              </Button>
              <Pill tone="warn" style={{ padding: '8px 10px', alignSelf: 'flex-start' }}>
                <Icon.Alert size={12} /> {t('iosWarn')}
              </Pill>
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-3)',
                    padding: '4px 0',
                  }}
                >
                  {t('preview')}
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 10,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--elev)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 6,
                    color: 'var(--text-3)',
                    maxHeight: 220,
                    overflow: 'auto',
                    whiteSpace: 'pre',
                  }}
                >
                  {m3u8Body || '—'}
                </pre>
              </details>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
