'use client';

import * as Icon from '@/components/icons';
import {
  Button,
  ConnectionBadge,
  PageHeader,
  Pill,
  SectionHeader,
  StatCard,
} from '@/components/primitives';
import { useMusicKit } from '@/hooks/useMusicKit';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface StatDef {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
}

const PLACEHOLDER_STATS: StatDef[] = [
  {
    label: 'Songs',
    value: '—',
    delta: 'live count coming soon',
    icon: <Icon.Note size={15} />,
  },
  {
    label: 'Albums',
    value: '—',
    delta: 'live count coming soon',
    icon: <Icon.Disc size={15} />,
  },
  {
    label: 'Playlists',
    value: '—',
    delta: 'live count coming soon',
    icon: <Icon.List size={15} />,
  },
  {
    label: 'Artists',
    value: '—',
    delta: 'live count coming soon',
    icon: <Icon.User size={15} />,
  },
];

interface ActivityEntry {
  title: string;
  sub: string;
  at: string;
  icon: ReactNode;
}

const PLACEHOLDER_ACTIVITY: ActivityEntry[] = [
  {
    title: 'Connected to Apple Music',
    sub: 'Library scopes authorized',
    at: 'just now',
    icon: <Icon.Link size={14} />,
  },
  {
    title: 'Welcome to the Organizer',
    sub: 'Your session history will live here',
    at: '—',
    icon: <Icon.Sparkle size={14} />,
  },
  {
    title: 'Tip: ⌘K opens search from any page',
    sub: 'Keyboard-first by design',
    at: '—',
    icon: <Icon.Search size={14} />,
  },
];

export default function DashboardPage() {
  const { isAuthorized, storefront } = useMusicKit();
  const router = useRouter();

  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px 48px 80px', maxWidth: 880, margin: '0 auto' }}>
        <PageHeader
          eyebrow="Dashboard"
          title="Dashboard."
          desc="A snapshot of your library, once you're connected."
          right={<ConnectionBadge connected={false} />}
        />

        <div
          className="panel"
          style={{
            padding: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--elev)',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon.Unlink size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Not connected</div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-3)',
                marginTop: 2,
                lineHeight: 1.5,
              }}
            >
              Connect your Apple Music account first to see your library at a glance.
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/')}
            icon={<Icon.Link size={13} />}
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const storefrontLabel = storefront ? storefront.toUpperCase() : '—';

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${storefrontLabel}.`}
        desc="A snapshot of your library and the things the Organizer can tidy up next."
        right={<ConnectionBadge connected />}
      />

      {/* Coming-soon hint */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Pill tone="warn">
          <Icon.Sparkle size={11} /> Coming soon
        </Pill>
        <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          Live counts from your library will appear here — this is currently a scaffold.
        </span>
      </div>

      {/* Stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 36,
        }}
      >
        {PLACEHOLDER_STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Quick actions + recent activity */}
        <div>
          <SectionHeader
            title="Quick actions"
            right={
              <button
                type="button"
                onClick={() => router.push('/search')}
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                More <Icon.Chevron size={12} />
              </button>
            }
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 32,
            }}
          >
            <QuickAction
              to="/search"
              icon={<Icon.Search size={18} />}
              label="Search catalog"
              sub="⌘K"
            />
            <QuickAction
              to="/library"
              icon={<Icon.Library size={18} />}
              label="Browse library"
              sub="g l"
            />
            <QuickAction
              to="/organizer"
              icon={<Icon.Wand size={18} />}
              label="Analyze library"
              sub="new"
              tone="accent"
            />
          </div>

          <SectionHeader title="Recent activity" desc="This session" />
          <div className="panel" style={{ padding: 4 }}>
            {PLACEHOLDER_ACTIVITY.map((a, i) => (
              <div
                key={a.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderBottom:
                    i < PLACEHOLDER_ACTIVITY.length - 1 ? '1px solid var(--hairline)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--elev)',
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>
                    {a.sub}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-4)',
                    fontFamily: 'var(--font-mono)',
                    width: 72,
                    textAlign: 'right',
                  }}
                >
                  {a.at}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon.Wand size={15} />
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Organizer recommends</h3>
            </div>
            <ul
              style={{
                margin: '8px 0 16px',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <RecoRow count="—" label="duplicate tracks across playlists" />
              <RecoRow count="—" label="albums missing 1–2 tracks" />
              <RecoRow count="—" label="playlists with no activity in 6mo" />
            </ul>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/organizer')}
              icon={<Icon.Sparkle size={14} />}
              style={{ width: '100%' }}
            >
              Open Organizer
            </Button>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <SectionHeader title="Session" desc="Your current connection" />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--elev)',
                border: '1px solid var(--hairline)',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Storefront</span>
              <span
                style={{
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text)',
                }}
              >
                {storefrontLabel}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--elev)',
                border: '1px solid var(--hairline)',
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Status</span>
              <Pill tone="ok">Connected</Pill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
  sub,
  tone = 'neutral',
}: {
  to: string;
  icon: ReactNode;
  label: string;
  sub: string;
  tone?: 'neutral' | 'accent';
}) {
  const router = useRouter();
  const accent = tone === 'accent';
  return (
    <button
      type="button"
      onClick={() => router.push(to)}
      className="panel"
      style={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        background: accent ? 'var(--accent-soft)' : 'var(--panel)',
        borderColor: accent
          ? 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.35)'
          : 'var(--hairline)',
        transition: 'transform var(--dur), border-color var(--dur)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: accent
            ? 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.2)'
            : 'var(--elev)',
          color: accent ? 'var(--accent)' : 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      </div>
      <span className="kbd">{sub}</span>
    </button>
  );
}

function RecoRow({ count, label }: { count: string; label: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 12.5,
        color: 'var(--text-2)',
      }}
    >
      <span
        style={{
          minWidth: 34,
          height: 22,
          padding: '0 6px',
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          background: 'var(--elev)',
          border: '1px solid var(--hairline)',
          color: 'var(--text)',
        }}
      >
        {count}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{label}</span>
    </li>
  );
}
