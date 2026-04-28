'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'Home' },
  { to: '/import', label: 'Import' },
  { to: '/match', label: 'Match' },
  { to: '/export', label: 'Export' },
  { to: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === href;
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--bg-2)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <Icon.Logo size={22} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>TuneFerry</span>
      </div>
      <nav style={{ display: 'flex', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to, item.end);
          return (
            <Link key={item.to} href={item.to} style={tabStyle(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ flex: 1 }} />
    </header>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--text)' : 'var(--text-3)',
    background: active ? 'var(--elev)' : 'transparent',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  };
}
