'use client';

import { Button, PageHeader } from '@/components/primitives';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

/**
 * Rendered when a route doesn't match anything in `src/app/` or when a page
 * calls `notFound()`. Stays inside the RootLayout, so Providers + i18n are
 * available.
 */
export default function NotFound() {
  const t = useTranslations('notFound');
  const router = useRouter();

  return (
    <main className="page-main page-main--form">
      <PageHeader title={t('title')} desc={t('desc')} />
      <Button variant="primary" onClick={() => router.push('/')}>
        {t('goHome')}
      </Button>
    </main>
  );
}
