import { NavLink, Outlet } from 'react-router-dom';
import { useMusicKit } from '../hooks/useMusicKit';
import styles from './Layout.module.css';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/search', label: 'Search' },
  { to: '/library', label: 'Library' },
  { to: '/organizer', label: 'Organizer' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { isAuthorized } = useMusicKit();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <span>Apple Music</span> Organizer
          </div>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ').trim()
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.status} aria-live="polite">
            <span
              className={[styles.dot, isAuthorized ? styles.dotConnected : ''].join(' ').trim()}
              aria-hidden
            />
            {isAuthorized ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        Apple Music Library Organizer · MVP · data flows through your own backend
      </footer>
    </div>
  );
}
