import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTweaks } from '../hooks/useTweaks';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const MOBILE_QUERY = '(max-width: 820px)';

export default function Layout() {
  const { tweaks } = useTweaks();
  const location = useLocation();
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const isTopnav = tweaks.nav === 'topnav';

  return (
    <>
      <div className="app-bg" />
      <div
        style={{
          display: 'flex',
          flexDirection: isTopnav ? 'column' : 'row',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {!mobile && !isTopnav && <Sidebar />}
        {!mobile && isTopnav && <TopNav />}
        <main
          style={{
            flex: 1,
            position: 'relative',
            paddingBottom: mobile ? 72 : 0,
          }}
        >
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
        {mobile && <MobileNav />}
      </div>
    </>
  );
}
