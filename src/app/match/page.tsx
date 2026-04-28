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
  return (
    <main style={{ padding: '40px 32px', maxWidth: 720, margin: 0 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading match…</div>
    </main>
  );
}

function MatchPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [storefront] = useStorefront();

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
          const msg = err instanceof Error ? err.message : 'Failed to match.';
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
  }, [playlist, storefront, toast]);

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
      <main style={{ padding: '40px 32px', maxWidth: 720, margin: 0 }}>
        <PageHeader
          title="Playlist not staged"
          desc="We couldn't find this playlist in your session. Head back to import to start over."
        />
        <Button variant="primary" onClick={() => router.push('/import')}>
          Go to Import
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
          <Spinner /> Loading playlist…
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px 32px 120px', maxWidth: 1080, margin: 0 }}>
      <PageHeader
        eyebrow={`Step 2 of 3 · storefront ${storefront}`}
        title={playlist.name}
        desc={`${playlist.totalTracks} tracks · by ${playlist.owner.displayName}`}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill tone="ok">{counts.high} matched</Pill>
            <Pill tone="warn">{counts.low} low</Pill>
            <Pill tone="err">{counts.none} none</Pill>
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
          <Spinner /> Matching {playlist.tracks.length} tracks against Apple Music ({storefront})…
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
              onToggleInclude={() =>
                updateRow(i, (prev) => ({ ...prev, included: !prev.included }))
              }
              onPick={(cand) => updateRow(i, (prev) => ({ ...prev, chosen: cand, included: true }))}
            />
          ))}
        </ul>
      )}

      {/* Sticky continue bar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 24px',
          background: 'oklch(0.155 0.008 260 / 0.85)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{counts.included}</strong>{' '}
          tracks included · {counts.high + counts.low} matched of {playlist.tracks.length}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" style={{ display: 'inline-flex' }}>
            <Button variant="ghost" size="md">
              Back
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            disabled={matching || counts.included === 0}
            onClick={onContinue}
            iconRight={<Icon.Arrow size={14} />}
          >
            Continue to Export
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MatchRow({
  row,
  onToggleInclude,
  onPick,
}: {
  row: RowState;
  onToggleInclude: () => void;
  onPick: (cand: AppleSongLite | null) => void;
}) {
  const { result, chosen, included } = row;
  const sp: SpotifyTrack = result.spotify;
  const tone = CONFIDENCE_TONE[result.confidence];
  const candidates = result.candidates;

  return (
    <li
      className="panel"
      style={{
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto 1fr auto',
        alignItems: 'center',
        gap: 14,
        opacity: included ? 1 : 0.55,
        transition: 'opacity var(--dur) var(--ease)',
      }}
    >
      {/* Include checkbox */}
      <input
        type="checkbox"
        checked={included}
        onChange={onToggleInclude}
        aria-label="Include in export"
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
          No Apple Music match
        </div>
      )}

      {/* Confidence + change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill tone={tone}>{result.confidence}</Pill>
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
              Change <Icon.ChevronDown size={11} />
            </summary>
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 320,
                zIndex: 5,
                padding: 6,
                background: 'var(--panel-solid)',
                border: '1px solid var(--hairline)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {candidates.length === 0 && (
                <div style={{ padding: 10, fontSize: 12, color: 'var(--text-4)' }}>
                  No alternatives available.
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
                  Clear pick (mark as no match)
                </button>
              )}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}
