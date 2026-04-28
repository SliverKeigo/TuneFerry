'use client';

import { TweaksProvider } from '@/hooks/useTweaks';
import I18nProvider from '@/i18n/I18nProvider';
import type { ReactNode } from 'react';
import AppShell from './AppShell';
import { ToastProvider } from './primitives';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TweaksProvider>
      <I18nProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </I18nProvider>
    </TweaksProvider>
  );
}
