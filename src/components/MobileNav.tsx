'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'Home', icon: <Icon.Home size={18} /> },
  { to: '/import', label: 'Import', icon: <Icon.Filter size={18} /> },
  { to: '/match', label: 'Match', icon: <Icon.Wand size={18} /> },
  { to: '/export', label: 'Export', icon: <Icon.Arrow size={18} /> },
  { to: '/settings', label: 'Set.', icon: <Icon.Gear size={18} /> },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === href;
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        height: 64,
        padding: '6px 10px 10px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        background: 'oklch(0.155 0.008 260 / 0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to, item.end);
        return (
          <Link key={item.to} href={item.to} style={itemStyle(active)}>
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function itemStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 10,
    fontSize: 10.5,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--text-3)',
    transition: 'color var(--dur) var(--ease)',
  };
}
