'use client';

import * as Icon from '@/components/icons';
import { Button, PageHeader, Pill } from '@/components/primitives';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function HomePage() {
  const router = useRouter();

  return (
    <main style={{ padding: '40px 32px 64px', maxWidth: 980, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Spotify → Apple Music"
        title="Move playlists. Keep your taste."
        desc="Paste a public Spotify playlist URL, or sign in to migrate your own private ones. We match every track against the Apple Music catalog and hand you a clean deep-link list (and a .m3u8) to bring it home."
        right={
          <>
            <Button
              variant="primary"
              size="lg"
              icon={<Icon.Arrow size={16} />}
              onClick={() => router.push('/import')}
            >
              Migrate a playlist
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={<Icon.Link size={16} />}
              onClick={() => {
                window.location.href = '/api/spotify/auth/login';
              }}
            >
              Sign in with Spotify
            </Button>
          </>
        }
      />

      {/* 3 step cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
          marginTop: 8,
        }}
      >
        <StepCard
          step={1}
          icon={<Icon.Filter size={18} />}
          title="Import"
          desc="Paste a public Spotify URL, or pick from your own playlists after signing in."
        />
        <StepCard
          step={2}
          icon={<Icon.Wand size={18} />}
          title="Match"
          desc="ISRC-first lookup, fuzzy fallback, with confidence scores you can override."
        />
        <StepCard
          step={3}
          icon={<Icon.Arrow size={18} />}
          title="Export"
          desc="Get a tappable deep-link list — or a .m3u8 file for the macOS Music app."
        />
      </section>

      {/* Beta strip */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Pill tone="warn" style={{ padding: '8px 14px', fontSize: 12, lineHeight: 1.4 }}>
          <Icon.Alert size={13} /> Beta. Apple Music doesn&rsquo;t permit programmatic
          add-to-library, so the final step is a deep link list — you tap, Apple Music adds.
        </Pill>
      </div>
    </main>
  );
}

function StepCard({
  step,
  icon,
  title,
  desc,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-4)',
            letterSpacing: 0.4,
          }}
        >
          0{step}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1, marginLeft: 'auto' }}>
          {title}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: 'var(--text-3)',
          lineHeight: 1.55,
        }}
      >
        {desc}
      </p>
    </div>
  );
}
