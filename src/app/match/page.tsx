'use client';

import * as Icon from '@/components/icons';
import {
  Artwork,
  Button,
  PageHeader,
  Pill,
  type PillTone,
  Spinner,
  artworkHueFromId,
  useToast,
} from '@/components/primitives';
import { useStorefront } from '@/hooks/useStorefront';
import type { AppleSongLite, MatchConfidence, MatchResult } from '@/lib/matchService';
import type { SpotifyPlaylist, SpotifyTrack } from '@/lib/types/spotify';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

interface ApiErrorBody {
  error?: { message?: string };
}

/**
 * Locally-augmented MatchResult: tracks the user's chosen Apple song (which
 * starts as `apple` from the matcher but may be swapped via the candidate
 * picker) and whether the row is included in the export.
 */
interface RowState {
  result: MatchResult;
  /** User's pick. Null = "no match for this row" (either matcher said so, or user rejected). */
  chosen: AppleSongLite | null;
  included: boolean;
}

const CONFIDENCE_TONE: Record<MatchConfidence, PillTone> = {
  high: 'ok',
  low: 'warn',
  none: 'err',
};

const CONFIDENCE_KEY: Record<
  MatchConfidence,
  'confidenceHigh' | 'confidenceLow' | 'confidenceNone'
> = {
  high: 'confidenceHigh',
  low: 'confidenceLow',
  none: 'confidenceNone',
};

// `useSearchParams` requires a Suspense boundary in Next 14 App Router so
// the page can statically prerender a fallback before client-side hydration.
// `export default` is the wrapper; the real component lives below.
export default function MatchPage() {
  return (
    <Suspense fallback={<MatchLoadingFallback />}>
      <MatchPageContent />
    </Suspense>
  );
}

function MatchLoadingFallback() {
  const t = useTranslations('match');
  return (
    <main className="page-main page-main--form">
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('loading')}</div>
    </main>
  );
}

function MatchPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [storefront] = useStorefront();
  const t = useTranslations('match');

  const spotifyId = params.get('spotify_id');

  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [missing, setMissing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);

  // Read staged playlist from sessionStorage.
  useEffect(() => {
    if (!spotifyId) {
      setMissing(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`tf.staged.${spotifyId}`);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as SpotifyPlaylist;
      setPlaylist(parsed);
    } catch {
      setMissing(true);
    }
  }, [spotifyId]);

  // Run /api/match once we have the playlist.
  useEffect(() => {
    if (!playlist) return;
    let cancelled = false;
    (async () => {
      setMatching(true);
      setError(null);
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks: playlist.tracks, storefront }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          throw new Error(body?.error?.message ?? `Match failed (${res.status})`);
        }
        const data = (await res.json()) as { matches: MatchResult[] };
        if (cancelled) return;
        setRows(
          data.matches.map((m) => ({
            result: m,
            chosen: m.apple,
            included: m.apple !== null,
          })),
        );
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : t('matchFailed');
          setError(msg);
          toast({ message: msg, tone: 'err' });
        }
      } finally {
        if (!cancelled) setMatching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist, storefront, toast, t]);

  // Counts for header / sticky bar.
  const counts = useMemo(() => {
    const c = { high: 0, low: 0, none: 0, included: 0 };
    for (const r of rows) {
      c[r.result.confidence]++;
      if (r.included && r.chosen !== null) c.included++;
    }
    return c;
  }, [rows]);

  const updateRow = useCallback((index: number, mut: (prev: RowState) => RowState) => {
    setRows((prev) => prev.map((r, i) => (i === index ? mut(r) : r)));
  }, []);

  const onContinue = useCallback(() => {
    if (!spotifyId || !playlist) return;
    // Persist a final MatchResult[] reflecting user choices + inclusion flags.
    const finalized: (MatchResult & { included: boolean })[] = rows.map((r) => ({
      ...r.result,
      apple: r.chosen,
      included: r.included,
    }));
    sessionStorage.setItem(`tf.matched.${spotifyId}`, JSON.stringify(finalized));
    router.push(`/export?spotify_id=${encodeURIComponent(spotifyId)}`);
  }, [router, rows, spotifyId, playlist]);

  // ── Render branches ─────────────────────────────────────────────────────────
  if (missing) {
    return (
      <main className="page-main page-main--form">
        <PageHeader title={t('missingTitle')} desc={t('missingDesc')} />
        <Button variant="primary" onClick={() => router.push('/import')}>
          {t('goImport')}
        </Button>
      </main>
    );
  }

  if (!playlist) {
    return (
      <main style={{ padding: 40 }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--text-3)' }}
        >
          <Spinner /> {t('loadingPlaylist')}
        </div>
      </main>
    );
  }

  return (
    <main className="page-main page-main--match">
      <PageHeader
        eyebrow={t('eyebrow', { storefront })}
        title={playlist.name}
        desc={t('byOwner', { count: playlist.totalTracks, owner: playlist.owner.displayName })}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill tone="ok">{t('matched', { n: counts.high })}</Pill>
            <Pill tone="warn">{t('low', { n: counts.low })}</Pill>
            <Pill tone="err">{t('none', { n: counts.none })}</Pill>
          </div>
        }
      />

      {matching && (
        <div
          className="panel"
          style={{
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-2)',
            fontSize: 13,
          }}
        >
          <Spinner /> {t('matching', { count: playlist.tracks.length, storefront })}
        </div>
      )}

      {error && !matching && (
        <div
          className="panel"
          style={{
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--err)',
            borderColor: 'oklch(0.72 0.19 25 / 0.4)',
          }}
        >
          <Icon.Alert size={16} /> <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}

      {!matching && rows.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '12px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {rows.map((row, i) => (
            <MatchRow
              key={row.result.spotify.id}
              row={row}
              t={t}
              onToggleInclude={() =>
                updateRow(i, (prev) => ({ ...prev, included: !prev.included }))
              }
              onPick={(cand) => updateRow(i, (prev) => ({ ...prev, chosen: cand, included: true }))}
            />
          ))}
        </ul>
      )}

      {/* Sticky continue bar */}
      <div className="match-sticky-bar">
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {t('stickyIncluded', {
            included: counts.included,
            matched: counts.high + counts.low,
            total: playlist.tracks.length,
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" style={{ display: 'inline-flex' }}>
            <Button variant="ghost" size="md">
              {t('back')}
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            disabled={matching || counts.included === 0}
            onClick={onContinue}
            iconRight={<Icon.Arrow size={14} />}
          >
            {t('continueExport')}
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MatchRow({
  row,
  t,
  onToggleInclude,
  onPick,
}: {
  row: RowState;
  t: ReturnType<typeof useTranslations<'match'>>;
  onToggleInclude: () => void;
  onPick: (cand: AppleSongLite | null) => void;
}) {
  const { result, chosen, included } = row;
  const sp: SpotifyTrack = result.spotify;
  const tone = CONFIDENCE_TONE[result.confidence];
  const candidates = result.candidates;

  return (
    <li
      className="panel match-row"
      style={{
        opacity: included ? 1 : 0.55,
        transition: 'opacity var(--dur) var(--ease)',
      }}
    >
      {/* Include checkbox */}
      <input
        type="checkbox"
        checked={included}
        onChange={onToggleInclude}
        aria-label={t('includeAria')}
        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
      />

      {/* Spotify side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Artwork size={40} radius={6} kind="song" hue={artworkHueFromId(sp.id)} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={sp.name}
          >
            {sp.name}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-4)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={sp.artists.join(', ')}
          >
            {sp.artists.join(', ')}
          </div>
        </div>
      </div>

      {/* Arrow */}
      <Icon.Arrow size={14} style={{ color: 'var(--text-4)' }} />

      {/* Apple side */}
      {chosen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Artwork
            size={40}
            radius={6}
            kind="song"
            hue={artworkHueFromId(chosen.id)}
            imgSrc={chosen.artworkUrl}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={chosen.name}
            >
              {chosen.name}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-4)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${chosen.artistName}${chosen.albumName ? ` — ${chosen.albumName}` : ''}`}
            >
              {chosen.artistName}
              {chosen.albumName ? ` · ${chosen.albumName}` : ''}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text-4)', fontStyle: 'italic' }}>
          {t('noAppleMatch')}
        </div>
      )}

      {/* Confidence + change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill tone={tone}>{t(CONFIDENCE_KEY[result.confidence])}</Pill>
        {(candidates.length > 0 || chosen !== null) && (
          <details style={{ position: 'relative' }}>
            <summary
              style={{
                listStyle: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-3)',
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--hairline)',
                background: 'var(--elev)',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {t('change')} <Icon.ChevronDown size={11} />
            </summary>
            <div className="match-candidate-popover">
              {candidates.length === 0 && (
                <div style={{ padding: 10, fontSize: 12, color: 'var(--text-4)' }}>
                  {t('noAlternatives')}
                </div>
              )}
              {candidates.map((c) => {
                const active = chosen?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPick(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: active ? 'var(--elev)' : 'transparent',
                      border: '1px solid transparent',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--elev)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Artwork
                      size={32}
                      radius={5}
                      kind="song"
                      hue={artworkHueFromId(c.id)}
                      imgSrc={c.artworkUrl}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-4)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.artistName}
                      </div>
                    </div>
                    {active && <Icon.Check size={13} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
              {chosen && (
                <button
                  type="button"
                  onClick={() => onPick(null)}
                  style={{
                    marginTop: 4,
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--err)',
                    border: '1px solid var(--hairline)',
                    background: 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {t('clearPick')}
                </button>
              )}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}
