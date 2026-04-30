'use client';

import * as Icon from '@/components/icons';
import {
  Artwork,
  Button,
  PageHeader,
  SectionHeader,
  artworkHueFromId,
  useToast,
} from '@/components/primitives';
import type { Locale } from '@/hooks/useTweaks';
import type { AppleSongLite, MatchResult } from '@/lib/matchService';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

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

// We previously swapped row links to a `music://` scheme to bypass the IP-
// based region redirect on Apple's web player. That broke clicks on every
// platform without a registered `music://` handler (non-Apple OSes, or Macs
// without Music.app installed). Reverted to the canonical https URL — Apple's
// Universal Links still take iOS/macOS users straight into the Music app when
// it's installed; everyone else falls through to the web player.

// "TXT to Apple Music Playlist" — community Shortcut that takes a newline list
// of "<title> <artist>" entries and adds each to a Music app playlist via the
// Search iTunes Store action (the missing-piece action: it returns iTunes
// Products that the Add-to-Playlist action accepts, unlike Find Music which is
// library-only and unlike Search Apple Music which doesn't exist as a Shortcut
// action). Runs entirely on the user's device. Localized fork per locale so
// the in-Shortcut prompts match the UI language. Verified URLs 2026-04-30 —
// iCloud hashes change if the community author re-publishes; refresh here.
// Typed as `Record<Locale, string>` so adding a new locale to `useTweaks.tsx`
// without adding a URL here becomes a typecheck error, not a silent EN fallback.
const SHORTCUT_ICLOUD_URLS: Record<Locale, string> = {
  en: 'https://www.icloud.com/shortcuts/b7468453e0ed497dbeb29c7e8dcc090f',
  zh: 'https://www.icloud.com/shortcuts/e12f0787e59e40c6b26665200316b44b',
};

// Suspense boundary — same reason as /match/page.tsx.
export default function ExportPage() {
  return (
    <Suspense fallback={<ExportLoadingFallback />}>
      <ExportPageContent />
    </Suspense>
  );
}

function ExportLoadingFallback() {
  const t = useTranslations('export');
  return (
    <main className="page-main page-main--form">
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('loading')}</div>
    </main>
  );
}

function ExportPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const t = useTranslations('export');
  const locale = useLocale();

  const sourceId = params.get('source_id');
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState<ExportRow[] | null>(null);

  useEffect(() => {
    if (!sourceId) {
      setMissing(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`tf.matched.v2.${sourceId}`);
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
          fallbackDurationMs: m.source.durationMs,
        }));
      setRows(filtered);
    } catch {
      setMissing(true);
    }
  }, [sourceId]);

  const onCopyAll = useCallback(async () => {
    if (!rows) return;
    // Copy the canonical https:// form — pastes cleanly anywhere. The
    // `music://` swap only matters for in-app click-through.
    const text = rows.map((r) => r.apple.catalogUrl).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: t('copiedToast', { n: rows.length }), tone: 'ok' });
    } catch {
      toast({ message: t('clipboardError'), tone: 'err' });
    }
  }, [rows, toast, t]);

  const onCopyShortcutList = useCallback(async () => {
    if (!rows) return;
    // Format expected by the "TXT to Apple Music Playlist" Shortcut: one
    // "<title> <artist>" per line. Use Apple's matched name/artist (canonical
    // for the iTunes Store search the Shortcut runs internally) — Spotify's
    // original strings are slightly different and lower the hit rate.
    const text = rows.map((r) => `${r.apple.name} ${r.apple.artistName}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: t('shortcutCopiedToast', { n: rows.length }), tone: 'ok' });
    } catch {
      toast({ message: t('clipboardError'), tone: 'err' });
    }
  }, [rows, toast, t]);

  const onInstallShortcut = useCallback(() => {
    // `useLocale()` returns `string`; we trust `useTweaks.sanitizeTweaks` to
    // have already narrowed `tweaks.locale` (which feeds I18nProvider) to a
    // known `Locale`. The `??` guard catches the impossible case anyway.
    const url = SHORTCUT_ICLOUD_URLS[locale as Locale] ?? SHORTCUT_ICLOUD_URLS.en;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [locale]);

  const onStartOver = useCallback(() => {
    if (sourceId) {
      sessionStorage.removeItem(`tf.staged.v2.${sourceId}`);
      sessionStorage.removeItem(`tf.matched.v2.${sourceId}`);
    }
    router.push('/import');
  }, [router, sourceId]);

  if (missing) {
    return (
      <main className="page-main page-main--form">
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
    <main className="page-main page-main--export">
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
        <section className="export-grid">
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
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-4)',
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              {t('deepLinkPlatformHint')}
            </div>
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
              {rows.map((r) => {
                const href = r.apple.catalogUrl;
                return (
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
                        href={href}
                        style={{
                          fontSize: 11.5,
                          color: 'var(--accent)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {href}
                      </a>
                    </div>
                    <a
                      href={href}
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
                );
              })}
            </ol>
          </div>

          {/* Shortcut bulk-add panel */}
          <div className="panel" style={{ padding: 18 }}>
            <SectionHeader
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon.Disc size={15} /> {t('shortcutTitle')}
                </span>
              }
              desc={t('shortcutDesc')}
            />
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-4)',
                marginBottom: 10,
                lineHeight: 1.5,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--hairline)',
                background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
              }}
            >
              {t('shortcutPlatformWarn')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button variant="primary" icon={<Icon.Arrow size={14} />} onClick={onInstallShortcut}>
                {t('shortcutInstall')}
              </Button>
              <Button
                variant="secondary"
                icon={<Icon.Copy size={13} />}
                onClick={onCopyShortcutList}
              >
                {t('shortcutCopyList')}
              </Button>
              <ol
                style={{
                  fontSize: 12,
                  color: 'var(--text-4)',
                  lineHeight: 1.6,
                  marginTop: 4,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <li>{t('shortcutHint1')}</li>
                <li>{t('shortcutHint2')}</li>
                <li>{t('shortcutHint3')}</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
