'use client';

import { useTweaks } from '@/hooks/useTweaks';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import en from './messages/en.json';
import zh from './messages/zh.json';

const MESSAGES = { en, zh } as const;

export default function I18nProvider({ children }: { children: ReactNode }) {
  const { tweaks } = useTweaks();
  return (
    <NextIntlClientProvider
      locale={tweaks.locale}
      messages={MESSAGES[tweaks.locale]}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
