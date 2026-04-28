'use client';

import TweaksPanel from '@/components/TweaksPanel';
import * as Icon from '@/components/icons';
import {
  Button,
  PageHeader,
  Pill,
  SectionHeader,
  Spinner,
  useToast,
} from '@/components/primitives';
import { useStorefront } from '@/hooks/useStorefront';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface ApiErrorBody {
  error?: { message?: string };
}

interface JwtPayload {
  iss?: string;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

interface TokenState {
  token: string;
  payload: JwtPayload;
}

type PresetKey = 'presetUs' | 'presetGb' | 'presetJp' | 'presetHk' | 'presetTw';

const PRESETS: { value: string; key: PresetKey }[] = [
  { value: 'us', key: 'presetUs' },
  { value: 'gb', key: 'presetGb' },
  { value: 'jp', key: 'presetJp' },
  { value: 'hk', key: 'presetHk' },
  { value: 'tw', key: 'presetTw' },
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <main style={{ padding: '32px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title={t('title')} desc={t('desc')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <StorefrontSection />
        <AppearanceSection />
        <AppleTokenSection />
      </div>
    </main>
  );
}

// ─── Storefront ─────────────────────────────────────────────────────────────

function StorefrontSection() {
  const [storefront, setStorefront] = useStorefront();
  const [custom, setCustom] = useState('');
  const t = useTranslations('settings');

  const onCustomSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const v = custom.trim().toLowerCase();
      if (/^[a-z]{2}$/.test(v)) {
        setStorefront(v);
        setCustom('');
      }
    },
    [custom, setStorefront],
  );

  return (
    <section className="panel" style={{ padding: 18 }}>
      <SectionHeader
        title={t('storefrontTitle')}
        desc={t('storefrontDesc')}
        right={
          <Pill tone="accent">{t('storefrontActive', { code: storefront.toUpperCase() })}</Pill>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PRESETS.map((p) => {
          const active = storefront === p.value;
          return (
            <Button
              key={p.value}
              size="sm"
              variant={active ? 'primary' : 'secondary'}
              onClick={() => setStorefront(p.value)}
            >
              {t(p.key)} ({p.value})
            </Button>
          );
        })}
      </div>

      <form onSubmit={onCustomSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input-native"
          type="text"
          maxLength={2}
          placeholder={t('storefrontCustomPlaceholder')}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-label={t('storefrontCustomAria')}
          style={{ width: 160 }}
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={!/^[a-z]{2}$/i.test(custom.trim())}
        >
          {t('storefrontSet')}
        </Button>
      </form>
    </section>
  );
}

// ─── Appearance ─────────────────────────────────────────────────────────────

function AppearanceSection() {
  const t = useTranslations('settings');
  return (
    <section className="panel" style={{ padding: 18 }}>
      <SectionHeader title={t('appearanceTitle')} desc={t('appearanceDesc')} />
      <TweaksPanel />
    </section>
  );
}

// ─── Apple Music token ──────────────────────────────────────────────────────

function AppleTokenSection() {
  const toast = useToast();
  const t = useTranslations('settings');
  const [state, setState] = useState<TokenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/apple-music/developer-token');
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          throw new Error(body?.error?.message ?? `Token fetch failed (${res.status})`);
        }
        const { developerToken } = (await res.json()) as { developerToken: string };
        const payloadPart = developerToken.split('.')[1];
        if (!payloadPart) throw new Error('Token shape invalid (missing payload).');
        // Standard JWT payloads are URL-safe base64. atob accepts standard base64;
        // swap chars and pad before decoding.
        const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded)) as JwtPayload;
        if (!cancelled) setState({ token: developerToken, payload });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load token.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const expiry = useMemo(() => {
    if (!state?.payload.exp) return null;
    const ms = state.payload.exp * 1000;
    const date = new Date(ms);
    const diffMs = ms - Date.now();
    const expired = diffMs <= 0;
    const absHours = Math.abs(diffMs) / 36e5;
    const human =
      absHours < 1
        ? `${Math.round(Math.abs(diffMs) / 60_000)} min`
        : absHours < 48
          ? `${Math.round(absHours)} h`
          : `${Math.round(absHours / 24)} d`;
    return {
      iso: date.toISOString(),
      local: date.toLocaleString(),
      relative: expired ? t('tokenExpiredAgo', { human }) : t('tokenExpiresIn', { human }),
      expired,
    };
  }, [state, t]);

  const onCopy = useCallback(async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.token);
      toast({ message: t('tokenCopiedToast'), tone: 'ok' });
    } catch {
      toast({ message: 'Clipboard unavailable in this browser.', tone: 'err' });
    }
  }, [state, toast, t]);

  return (
    <section className="panel" style={{ padding: 18 }}>
      <SectionHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon.Disc size={15} /> {t('tokenTitle')}
          </span>
        }
        desc={t('tokenDesc')}
        right={state ? <Pill tone="accent">{t('tokenScraped')}</Pill> : null}
      />

      {loading && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          <Spinner /> {t('tokenLoading')}
        </div>
      )}

      {error && !loading && (
        <div
          className="panel"
          role="alert"
          style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            color: 'var(--err)',
            borderColor: 'oklch(0.72 0.19 25 / 0.4)',
            background: 'oklch(0.72 0.19 25 / 0.08)',
            fontSize: 13,
          }}
        >
          <Icon.Alert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {state && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row label={t('tokenSource')}>
            <Pill tone="accent">{t('tokenScraped')}</Pill>
          </Row>
          {expiry && (
            <Row label={t('tokenExpires')}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {expiry.local} <span style={{ color: 'var(--text-4)' }}>({expiry.relative})</span>
              </span>
              {expiry.expired && (
                <Pill tone="err" style={{ marginLeft: 8 }}>
                  {t('tokenExpired')}
                </Pill>
              )}
            </Row>
          )}
          {state.payload.iss && (
            <Row label={t('tokenIssuer')}>
              <code
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)',
                }}
              >
                {state.payload.iss}
              </code>
            </Row>
          )}
          <Row label={t('tokenLabel')}>
            <Button size="sm" variant="secondary" icon={<Icon.Copy size={13} />} onClick={onCopy}>
              {t('tokenCopy')}
            </Button>
          </Row>
        </div>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}
