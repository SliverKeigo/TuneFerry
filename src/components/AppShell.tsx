'use client';

import { useTweaks } from '@/hooks/useTweaks';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const MOBILE_QUERY = '(max-width: 820px)';

export default function AppShell({ children }: { children: ReactNode }) {
  const { tweaks } = useTweaks();
  const pathname = usePathname();
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
        <div className="page-enter" key={pathname}>
          {children}
        </div>
      </main>
      {mobile && <MobileNav />}
    </div>
  );
}
