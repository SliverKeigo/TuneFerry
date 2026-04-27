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

const PRESETS: { value: string; label: string }[] = [
  { value: 'us', label: 'US' },
  { value: 'gb', label: 'UK' },
  { value: 'jp', label: 'Japan' },
  { value: 'hk', label: 'Hong Kong' },
  { value: 'tw', label: 'Taiwan' },
];

export default function SettingsPage() {
  return (
    <main style={{ padding: '32px 32px 80px', maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        title="Settings"
        desc="Storefront, appearance, and the Apple Music developer token."
      />

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
        title="Apple Music storefront"
        desc="Two-letter region code used when searching the Apple Music catalog."
        right={<Pill tone="accent">Active: {storefront.toUpperCase()}</Pill>}
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
              {p.label} ({p.value})
            </Button>
          );
        })}
      </div>

      <form onSubmit={onCustomSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input-native"
          type="text"
          maxLength={2}
          placeholder="Custom (e.g. de)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-label="Custom storefront code"
          style={{ width: 160 }}
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={!/^[a-z]{2}$/i.test(custom.trim())}
        >
          Set
        </Button>
      </form>
    </section>
  );
}

// ─── Appearance ─────────────────────────────────────────────────────────────

function AppearanceSection() {
  return (
    <section className="panel" style={{ padding: 18 }}>
      <SectionHeader title="Appearance" desc="Theme, surface, navigation, and accent." />
      <TweaksPanel />
    </section>
  );
}

// ─── Apple Music token ──────────────────────────────────────────────────────

function AppleTokenSection() {
  const toast = useToast();
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
      relative: expired ? `expired ${human} ago` : `in ${human}`,
      expired,
    };
  }, [state]);

  const onCopy = useCallback(async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.token);
      toast({ message: 'Token copied.', tone: 'ok' });
    } catch {
      toast({ message: 'Clipboard unavailable in this browser.', tone: 'err' });
    }
  }, [state, toast]);

  return (
    <section className="panel" style={{ padding: 18 }}>
      <SectionHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon.Disc size={15} /> Apple Music developer token
          </span>
        }
        desc="JWT used to call Apple's catalog. Loaded server-side from environment configuration."
        right={state ? <Pill tone="accent">WebPlay scraped</Pill> : null}
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
          <Spinner /> Loading token…
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
          <Row label="Source">
            <Pill tone="accent">WebPlay scraped</Pill>
          </Row>
          {expiry && (
            <Row label="Expires">
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {expiry.local} <span style={{ color: 'var(--text-4)' }}>({expiry.relative})</span>
              </span>
              {expiry.expired && (
                <Pill tone="err" style={{ marginLeft: 8 }}>
                  Expired
                </Pill>
              )}
            </Row>
          )}
          {state.payload.iss && (
            <Row label="Issuer (team)">
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
          <Row label="Token">
            <Button size="sm" variant="secondary" icon={<Icon.Copy size={13} />} onClick={onCopy}>
              Copy token
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
