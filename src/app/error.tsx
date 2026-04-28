'use client';

import { Button, PageHeader } from '@/components/primitives';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * App Router segment-level error boundary. Sits inside the RootLayout, so
 * Providers (TweaksProvider → I18nProvider → ToastProvider) are still mounted
 * — useTranslations works here.
 *
 * Catches uncaught throws from any /<route>/page.tsx; without this file,
 * Next.js falls back to a cryptic "missing required error components,
 * refreshing..." overlay.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');
  const router = useRouter();

  useEffect(() => {
    // Surface to the dev console so the swallowed throw stays investigable.
    console.error(error);
  }, [error]);

  return (
    <main className="page-main page-main--form">
      <PageHeader title={t('title')} desc={t('desc')} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={reset}>
          {t('tryAgain')}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/')}>
          {t('goHome')}
        </Button>
      </div>
    </main>
  );
}
