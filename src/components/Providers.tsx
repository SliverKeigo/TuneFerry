'use client';

import { TweaksProvider } from '@/hooks/useTweaks';
import type { ReactNode } from 'react';
import AppShell from './AppShell';
import { ToastProvider } from './primitives';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TweaksProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </TweaksProvider>
  );
}
