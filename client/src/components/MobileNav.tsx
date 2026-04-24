import type { CSSProperties, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import * as Icon from './icons';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'Home', icon: <Icon.Home size={18} /> },
  { to: '/search', label: 'Search', icon: <Icon.Search size={18} /> },
  { to: '/library', label: 'Library', icon: <Icon.Library size={18} /> },
  { to: '/organizer', label: 'Tidy', icon: <Icon.Wand size={18} /> },
  { to: '/settings', label: 'Set.', icon: <Icon.Gear size={18} /> },
];

export default function MobileNav() {
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
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => itemStyle(isActive)}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
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
