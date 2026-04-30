'use client';

import * as Icon from '@/components/icons';
import { Button, PageHeader } from '@/components/primitives';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations('home');

  return (
    <main className="page-main page-main--home">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        desc={t('desc')}
        right={
          <Button
            variant="primary"
            size="lg"
            icon={<Icon.Arrow size={16} />}
            onClick={() => router.push('/import')}
          >
            {t('cta')}
          </Button>
        }
      />

      {/* 3 step cards */}
      <section className="cards-3">
        <StepCard
          step={1}
          icon={<Icon.Filter size={18} />}
          title={t('step1Title')}
          desc={t('step1Desc')}
        />
        <StepCard
          step={2}
          icon={<Icon.Wand size={18} />}
          title={t('step2Title')}
          desc={t('step2Desc')}
        />
        <StepCard
          step={3}
          icon={<Icon.Arrow size={18} />}
          title={t('step3Title')}
          desc={t('step3Desc')}
        />
      </section>
    </main>
  );
}

function StepCard({
  step,
  icon,
  title,
  desc,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-4)',
            letterSpacing: 0.4,
          }}
        >
          0{step}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1, marginLeft: 'auto' }}>
          {title}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: 'var(--text-3)',
          lineHeight: 1.55,
        }}
      >
        {desc}
      </p>
    </div>
  );
}
