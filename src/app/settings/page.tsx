'use client';

import { fetchDeveloperToken } from '@/api/appleMusicApi';
import TweaksPanel from '@/components/TweaksPanel';
import * as Icon from '@/components/icons';
import {
  Button,
  PageHeader,
  Pill,
  SectionHeader,
  Spinner,
  StatusDot,
  useToast,
} from '@/components/primitives';
import { useStorefront } from '@/hooks/useStorefront';
import { useCallback, useEffect, useState } from 'react';

const PRESET_STOREFRONTS: { code: string; label: string }[] = [
  { code: 'us', label: 'United States' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'jp', label: 'Japan' },
  { code: 'hk', label: 'Hong Kong' },
  { code: 'tw', label: 'Taiwan' },
  { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' },
  { code: 'au', label: 'Australia' },
];

export default function SettingsPage() {
  return (
    <main style={{ padding: '32px 32px 64px', maxWidth: 980, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        desc="Visual tweaks, your Apple Music storefront, and connected services."
      />

      <div style={{ display: 'grid', gap: 24 }}>
        <Section title="Appearance" desc="Theme, surface, navigation layout, and accent colour.">
          <TweaksPanel />
        </Section>

        <Section
          title="Storefront"
          desc="Region used when querying the Apple Music catalog. Wrong region = bad matches."
        >
          <StorefrontSection />
        </Section>

        <Section
          title="Spotify session"
          desc="Sign in to migrate your private playlists. Public-URL imports work without this."
        >
          <SpotifySession />
        </Section>

        <Section
          title="Apple Music developer token"
          desc="Public token used to call music.apple.com. We scrape WebPlay because Apple doesn't issue developer tokens to non-paying members."
        >
          <DeveloperTokenSection />
        </Section>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" style={{ padding: 22 }}>
      <SectionHeader title={title} desc={desc} />
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StorefrontSection() {
  const [storefront, setStorefront] = useStorefront();
  const [custom, setCustom] = useState('');

  const onSubmitCustom = () => {
    const code = custom.trim().toLowerCase();
    if (code.length === 2 || code.length === 3) {
      setStorefront(code);
      setCustom('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESET_STOREFRONTS.map((s) => {
          const active = storefront === s.code;
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => setStorefront(s.code)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: active ? 'inherit' : 'inherit',
                color: active ? 'var(--accent-fg)' : 'var(--text-2)',
                background: active ? 'var(--accent)' : 'var(--elev)',
                border: active ? '1px solid var(--accent-ring)' : '1px solid var(--hairline)',
                fontWeight: active ? 600 : 500,
              }}
              title={s.label}
            >
              {s.code.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          className="input-native"
          placeholder="Custom code (e.g. mx)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmitCustom();
          }}
          style={{ maxWidth: 240 }}
        />
        <Button size="md" variant="secondary" onClick={onSubmitCustom}>
          Set
        </Button>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
          Active: <code style={{ fontFamily: 'var(--font-mono)' }}>{storefront}</code>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface SpotifyMeShape {
  // /api/spotify/me/playlists doesn't return user info, so "displayName" we
  // derive from the first playlist owner won't always match. Instead, we
  // probe and only show "Connected" — the username is best surfaced after
  // signing in via the import flow.
  total: number;
}

function SpotifySession() {
  const toast = useToast();
  const [state, setState] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [busy, setBusy] = useState(false);

  const probe = useCallback(async () => {
    setState('unknown');
    try {
      const res = await fetch('/api/spotify/me/playlists?limit=1');
      if (res.status === 401) {
        setState('disconnected');
        return;
      }
      if (!res.ok) {
        setState('disconnected');
        return;
      }
      // Force a parse so weird HTML responses don't sneak through.
      (await res.json()) as SpotifyMeShape;
      setState('connected');
    } catch {
      setState('disconnected');
    }
  }, []);

  useEffect(() => {
    probe();
  }, [probe]);

  const onSignIn = () => {
    window.location.href = '/api/spotify/auth/login';
  };

  const onSignOut = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/spotify/auth/logout', { method: 'POST' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Logout failed (${res.status})`);
      }
      toast({ message: 'Signed out of Spotify.', tone: 'ok' });
      setState('disconnected');
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Sign-out failed.',
        tone: 'err',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {state === 'unknown' && <Spinner />}
        {state !== 'unknown' && <StatusDot status={state === 'connected' ? 'ok' : 'warn'} />}
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {state === 'unknown' && 'Checking…'}
          {state === 'connected' && 'Connected to Spotify'}
          {state === 'disconnected' && 'Not connected'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      {state === 'connected' ? (
        <Button
          size="md"
          variant="secondary"
          icon={<Icon.Unlink size={14} />}
          onClick={onSignOut}
          disabled={busy}
        >
          Sign out
        </Button>
      ) : (
        <Button
          size="md"
          variant="primary"
          icon={<Icon.Link size={14} />}
          onClick={onSignIn}
          disabled={state === 'unknown'}
        >
          Sign in with Spotify
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface JwtPayload {
  exp?: number;
  iat?: number;
  iss?: string;
}

function decodeJwtExp(token: string): { exp?: Date; raw?: JwtPayload; error?: string } {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return { error: 'Token is not a JWT.' };
  try {
    // base64url → base64.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as JwtPayload;
    return {
      exp: payload.exp ? new Date(payload.exp * 1000) : undefined,
      raw: payload,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Decode failed' };
  }
}

function DeveloperTokenSection() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const t = await fetchDeveloperToken();
        if (!cancelled) setToken(t);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch token.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast({ message: 'Token copied to clipboard.', tone: 'ok' });
    } catch {
      toast({ message: 'Clipboard unavailable.', tone: 'err' });
    }
  };

  const decoded = token ? decodeJwtExp(token) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {loading && (
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)' }}
        >
          <Spinner /> Fetching…
        </div>
      )}
      {error && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--err)' }}>
          <Icon.Alert size={14} /> {error}
        </div>
      )}
      {token && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: 12.5,
              color: 'var(--text-2)',
            }}
          >
            <Pill tone="accent">WebPlay scraped</Pill>
            {decoded?.exp && (
              <span>
                Expires <strong>{decoded.exp.toLocaleString()}</strong>
              </span>
            )}
            {decoded?.error && (
              <span style={{ color: 'var(--err)' }}>JWT decode: {decoded.error}</span>
            )}
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" icon={<Icon.Copy size={13} />} onClick={onCopy}>
              Copy
            </Button>
          </div>
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: 'var(--text-4)',
              padding: 10,
              background: 'var(--elev)',
              border: '1px solid var(--hairline)',
              borderRadius: 6,
              wordBreak: 'break-all',
              maxHeight: 96,
              overflow: 'auto',
              display: 'block',
            }}
          >
            {token}
          </code>
        </>
      )}
    </div>
  );
}
