'use client';

import type { ReactNode } from 'react';
import AppShell from './AppShell';
import MusicKitProvider from './MusicKitProvider';
import { ToastProvider } from './primitives';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MusicKitProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </MusicKitProvider>
  );
}
