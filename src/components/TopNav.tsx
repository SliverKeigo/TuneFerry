'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  labelKey: 'home' | 'import' | 'match' | 'export' | 'settings';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, labelKey: 'home' },
  { to: '/import', labelKey: 'import' },
  { to: '/match', labelKey: 'match' },
  { to: '/export', labelKey: 'export' },
  { to: '/settings', labelKey: 'settings' },
];

export default function TopNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === href;
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <header
      style={{
        height: 64,
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--bg-2)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div
        style={{
          height: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
            <Icon.Logo size={26} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>TuneFerry</span>
        </div>
        <nav
          style={{
            display: 'flex',
            gap: 2,
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to, item.end);
            return (
              <Link key={item.to} href={item.to} style={tabStyle(active)}>
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px',
    borderRadius: 8,
    fontSize: 14.5,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--text)' : 'var(--text-3)',
    background: active ? 'var(--elev)' : 'transparent',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  };
}
