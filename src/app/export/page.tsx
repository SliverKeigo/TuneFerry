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
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

export default function ExportPage() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

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
      toast({ message: `Copied ${rows.length} link${rows.length === 1 ? '' : 's'}.`, tone: 'ok' });
    } catch {
      toast({ message: 'Clipboard unavailable in this browser.', tone: 'err' });
    }
  }, [rows, toast]);

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
      <main style={{ padding: '40px 32px', maxWidth: 720, margin: 0 }}>
        <PageHeader
          title="Nothing to export"
          desc="We couldn't find matched results in your session. Start a new migration."
        />
        <Button variant="primary" onClick={() => router.push('/import')}>
          Start a migration
        </Button>
      </main>
    );
  }

  if (!rows) {
    return (
      <main style={{ padding: 40, color: 'var(--text-3)', fontSize: 13 }}>Loading export…</main>
    );
  }

  return (
    <main style={{ padding: '32px 32px 64px', maxWidth: 1080, margin: 0 }}>
      <PageHeader
        eyebrow="Step 3 of 3"
        title="Export to Apple Music"
        desc={`${rows.length} track${rows.length === 1 ? '' : 's'} ready to ferry across.`}
        right={
          <Button variant="ghost" icon={<Icon.Refresh size={14} />} onClick={onStartOver}>
            Start another migration
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
          You excluded every track on the previous step — nothing to export.
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
                  <Icon.Link size={15} /> Deep link list
                </span>
              }
              desc="Tap each link to open Apple Music. The Add to Library button is one tap away."
              right={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Icon.Copy size={13} />}
                  onClick={onCopyAll}
                >
                  Copy all
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
                    aria-label="Open in Apple Music"
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
                  <Icon.Disc size={15} /> .m3u8 download
                </span>
              }
              desc="A playlist file you can drop into the macOS Music app."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button
                variant="primary"
                icon={<Icon.Arrow size={14} />}
                onClick={onDownloadM3U}
                disabled={rows.length === 0}
              >
                Download .m3u8
              </Button>
              <Pill tone="warn" style={{ padding: '8px 10px', alignSelf: 'flex-start' }}>
                <Icon.Alert size={12} /> macOS Music app can import .m3u8; iOS cannot. The deep link
                list is the universal path.
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
                  Preview
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
