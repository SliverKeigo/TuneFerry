'use client';

import type { ReactNode } from 'react';
import AppShell from './AppShell';
import { ToastProvider } from './primitives';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
