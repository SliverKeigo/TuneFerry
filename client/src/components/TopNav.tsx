import type { CSSProperties } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMusicKit } from '../hooks/useMusicKit';
import * as Icon from './icons';
import { ConnectionBadge } from './primitives';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/search', label: 'Search' },
  { to: '/library', label: 'Library' },
  { to: '/organizer', label: 'Organizer' },
  { to: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const { isAuthorized } = useMusicKit();
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
        borderBottom: '1px solid var(--hairline)',
        background: 'oklch(0.155 0.008 260 / 0.65)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <Icon.Logo size={22} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>Apple Music</span>
      </div>
      <nav style={{ display: 'flex', gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => tabStyle(isActive)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <ConnectionBadge compact connected={isAuthorized} onClick={() => navigate('/')} />
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
