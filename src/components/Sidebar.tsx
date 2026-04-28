'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  labelKey: 'home' | 'import' | 'match' | 'export' | 'settings';
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, labelKey: 'home', icon: <Icon.Home size={18} /> },
  { to: '/import', labelKey: 'import', icon: <Icon.Filter size={18} /> },
  { to: '/match', labelKey: 'match', icon: <Icon.Wand size={18} /> },
  { to: '/export', labelKey: 'export', icon: <Icon.Arrow size={18} /> },
  { to: '/settings', labelKey: 'settings', icon: <Icon.Gear size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === href;
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <aside
      style={{
        width: 268,
        flexShrink: 0,
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        borderRight: '1px solid var(--hairline)',
        // Use CSS var (defined in globals.css for both dark + light themes)
        // instead of a hardcoded oklch — otherwise the sidebar stays dark when
        // the user switches to light mode in Settings.
        background: 'var(--bg-2)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Logo row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 10px 22px',
          marginBottom: 4,
        }}
      >
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <Icon.Logo size={28} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>TuneFerry</span>
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-4)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {t('tagline')}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: 'var(--text-4)',
            padding: '8px 12px 8px',
            textTransform: 'uppercase',
          }}
        >
          {t('workspace')}
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
              <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
              {active && <Icon.Chevron size={14} style={{ color: 'var(--text-4)' }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />
    </aside>
  );
}

function navLinkStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 14.5,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--text)' : 'var(--text-2)',
    background: active ? 'var(--elev)' : 'transparent',
    border: active ? '1px solid var(--hairline)' : '1px solid transparent',
    textAlign: 'left',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  };
}
