'use client';

import { useMusicKit } from '@/hooks/useMusicKit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import * as Icon from './icons';
import { Button, StatusDot } from './primitives';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'Home', icon: <Icon.Home size={16} /> },
  { to: '/dashboard', label: 'Dashboard', icon: <Icon.Grid size={16} /> },
  { to: '/search', label: 'Search', icon: <Icon.Search size={16} /> },
  { to: '/library', label: 'Library', icon: <Icon.Library size={16} /> },
  { to: '/organizer', label: 'Organizer', icon: <Icon.Wand size={16} /> },
  { to: '/settings', label: 'Settings', icon: <Icon.Gear size={16} /> },
];

export default function Sidebar() {
  const { isAuthorized, authorize } = useMusicKit();
  const pathname = usePathname();

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === href;
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        borderRight: '1px solid var(--hairline)',
        background: 'oklch(0.155 0.008 260 / 0.6)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Logo row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px 18px',
          marginBottom: 4,
        }}
      >
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <Icon.Logo size={24} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>Apple Music</span>
          <span
            style={{
              fontSize: 10.5,
              color: 'var(--text-4)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Organizer · beta
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: 'var(--text-4)',
            padding: '8px 10px 6px',
            textTransform: 'uppercase',
          }}
        >
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to, item.end);
          return (
            <Link key={item.to} href={item.to} style={navLinkStyle(active)}>
              <span
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-3)',
                  display: 'inline-flex',
                }}
              >
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <Icon.Chevron size={14} style={{ color: 'var(--text-4)' }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Connection status block */}
      <div
        className="panel"
        style={{
          padding: 12,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: isAuthorized ? 'oklch(0.82 0.17 145 / 0.06)' : 'var(--elev)',
          borderColor: isAuthorized ? 'oklch(0.82 0.17 145 / 0.25)' : 'var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot status={isAuthorized ? 'ok' : 'warn'} size={7} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {isAuthorized ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
          {isAuthorized
            ? 'Listening on your Apple Music account.'
            : 'Connect your account to start organizing.'}
        </div>
        {!isAuthorized && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void authorize();
            }}
            icon={<Icon.Link size={13} />}
            style={{ width: '100%' }}
          >
            Connect
          </Button>
        )}
      </div>
    </aside>
  );
}

function navLinkStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--text)' : 'var(--text-2)',
    background: active ? 'var(--elev)' : 'transparent',
    border: active ? '1px solid var(--hairline)' : '1px solid transparent',
    textAlign: 'left',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  };
}
