'use client';

import * as Icon from '@/components/icons';
import {
  Button,
  ConnectionBadge,
  Pill,
  SectionHeader,
  Spinner,
  StatusDot,
  useToast,
} from '@/components/primitives';
import { useMusicKit } from '@/hooks/useMusicKit';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  soon?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: <Icon.Search size={16} />,
    title: 'Search Apple Music',
    desc: 'Catalog search across regions, with one-click add.',
  },
  {
    icon: <Icon.Plus size={16} />,
    title: 'Add to Library',
    desc: "Queue songs, albums or playlists; track what's in flight.",
  },
  {
    icon: <Icon.Wand size={16} />,
    title: 'Organize Playlists',
    desc: 'Auto-sort by artist, era, duplicates — or your own rules.',
  },
  {
    icon: <Icon.Sparkle size={16} />,
    title: 'Find Missing Tracks',
    desc: 'Spot gaps across albums you already own — coming soon.',
    soon: true,
  },
];

export default function HomePage() {
  const { isReady, isAuthorized, authorize, error } = useMusicKit();
  const toast = useToast();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const onConnect = async () => {
    if (isAuthorized) return;
    setConnecting(true);
    try {
      await authorize();
      toast({ tone: 'ok', message: 'Connected to Apple Music' });
    } catch (err) {
      toast({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Authorization failed',
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 1120, margin: '0 auto' }}>
      {/* Hero */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 48,
          alignItems: 'center',
          marginBottom: 72,
          textAlign: 'center',
          justifyItems: 'center',
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: 'var(--text-4)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Apple Music
          </div>

          <Pill tone="accent" style={{ marginBottom: 18 }}>
            <StatusDot size={6} /> Beta · read + write scopes
          </Pill>

          <h1
            style={{
              margin: 0,
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: -1.4,
              lineHeight: 1.05,
            }}
          >
            Organize what you
            <br />
            <span style={{ color: 'var(--accent)' }}>already love.</span>
          </h1>

          <p
            style={{
              margin: '20px auto 32px',
              fontSize: 16,
              color: 'var(--text-2)',
              lineHeight: 1.55,
              maxWidth: 520,
            }}
          >
            A keyboard-first console for your Apple Music library. Search the catalog, add to
            library in one click, and tidy up playlists — without leaving the browser.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {!isAuthorized ? (
              <Button
                variant="primary"
                size="lg"
                onClick={onConnect}
                disabled={!isReady || connecting}
                icon={connecting ? <Spinner size={16} /> : <Icon.Link size={16} />}
              >
                {connecting
                  ? 'Authorizing…'
                  : isReady
                    ? 'Connect Apple Music'
                    : 'Initialising MusicKit…'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/dashboard')}
                icon={<Icon.Arrow size={16} />}
              >
                You&apos;re connected — go to Dashboard
              </Button>
            )}

            <Button
              variant="ghost"
              size="lg"
              onClick={() => router.push('/search')}
              iconRight={<Icon.Chevron size={14} />}
            >
              See how it works
            </Button>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: 'var(--text-4)',
              fontSize: 12,
              flexWrap: 'wrap',
            }}
          >
            <ConnectionBadge connected={isAuthorized} compact />
            <span>· No playback. No scraping. Apple Music tokens stay in your browser.</span>
          </div>

          {error && (
            <div
              style={{
                marginTop: 20,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'oklch(0.72 0.19 25 / 0.1)',
                border: '1px solid oklch(0.72 0.19 25 / 0.3)',
                color: 'var(--err)',
                fontSize: 12.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon.Alert size={14} />
              MusicKit error: {error}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <SectionHeader
        title="Core capabilities"
        desc="Everything an MVP library tool should do, and nothing it shouldn't."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="panel"
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              animation: `fade-up 380ms var(--ease) ${i * 60}ms both`,
              transition: 'transform var(--dur) var(--ease), border-color var(--dur) var(--ease)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--hairline-strong)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.borderColor = 'var(--hairline)';
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              {f.icon}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{f.desc}</div>
            {f.soon && (
              <Pill tone="warn" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                Coming soon
              </Pill>
            )}
          </div>
        ))}
      </div>

      {/* Keyboard preview */}
      <div style={{ marginTop: 60 }}>
        <SectionHeader
          title="Built for keyboards"
          desc="Open search with ⌘K, jump pages with g+s, g+l. Raycast-adjacent ergonomics."
        />
        <div className="panel" style={{ padding: 20 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {[
              { k: '⌘K', t: 'Open search', d: 'Begin a new query from anywhere.' },
              { k: '⌘↵', t: 'Add to library', d: 'On any highlighted search result.' },
              { k: 'g s', t: 'Go to Search', d: 'Two-key jump, Linear-style.' },
            ].map((s) => (
              <div
                key={s.k}
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'var(--elev)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 12,
                }}
              >
                <span className="kbd" style={{ fontSize: 13, padding: '6px 10px' }}>
                  {s.k}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
