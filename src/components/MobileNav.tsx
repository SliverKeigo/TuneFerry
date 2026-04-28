'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  labelKey: 'home' | 'import' | 'match' | 'export' | 'settingsShort';
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, labelKey: 'home', icon: <Icon.Home size={18} /> },
  { to: '/import', labelKey: 'import', icon: <Icon.Filter size={18} /> },
  { to: '/match', labelKey: 'match', icon: <Icon.Wand size={18} /> },
  { to: '/export', labelKey: 'export', icon: <Icon.Arrow size={18} /> },
  { to: '/settings', labelKey: 'settingsShort', icon: <Icon.Gear size={18} /> },
];

export default function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

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
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to, item.end);
        return (
          <Link key={item.to} href={item.to} style={itemStyle(active)}>
            {item.icon}
            {t(item.labelKey)}
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
