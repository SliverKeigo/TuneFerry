import { type ReactNode, useState } from 'react';
import TweaksPanel from '../components/TweaksPanel';
import * as Icon from '../components/icons';
import { Button, PageHeader, Pill, StatusDot, useToast } from '../components/primitives';
import { useMusicKit } from '../hooks/useMusicKit';

interface StorefrontPreset {
  code: string;
  label: string;
  flag: string;
}

const STOREFRONT_PRESETS: StorefrontPreset[] = [
  { code: 'us', label: 'United States', flag: 'US' },
  { code: 'hk', label: 'Hong Kong', flag: 'HK' },
  { code: 'tw', label: 'Taiwan', flag: 'TW' },
  { code: 'jp', label: 'Japan', flag: 'JP' },
  { code: 'gb', label: 'United Kingdom', flag: 'GB' },
];

export default function SettingsPage() {
  const { isReady, isAuthorized, musicUserToken, storefront, error, setStorefront, unauthorize } =
    useMusicKit();
  const toast = useToast();
  const [customStorefront, setCustomStorefront] = useState('');

  const applyStorefront = (code: string) => {
    const next = code.trim().toLowerCase();
    if (!next || next === storefront) return;
    setStorefront(next);
    toast({ tone: 'info', message: `Storefront set to ${next.toUpperCase()} — reloading…` });
  };

  const onDisconnect = async () => {
    try {
      await unauthorize();
      toast({ tone: 'info', message: 'Disconnected from Apple Music' });
    } catch (err) {
      toast({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Failed to disconnect',
      });
    }
  };

  const tokenPreview = musicUserToken ? `${musicUserToken.slice(0, 24)}…` : '—';

  return (
    <div style={{ padding: '32px 48px 80px', maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Settings"
        title="Settings."
        desc="Account, region, appearance, and workspace preferences."
      />

      {/* Storefront */}
      <Row
        title="Default storefront"
        desc="Region used when talking to the Apple Music catalog. Changing this reloads the page."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {STOREFRONT_PRESETS.map((s) => {
            const active = s.code === storefront;
            return (
              <button
                type="button"
                key={s.code}
                onClick={() => applyStorefront(s.code)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  textAlign: 'left',
                  background: active ? 'var(--accent-soft)' : 'var(--elev)',
                  border: `1px solid ${
                    active
                      ? 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.35)'
                      : 'var(--hairline)'
                  }`,
                  color: active ? 'var(--text)' : 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background var(--dur) var(--ease)',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: active ? 'var(--accent)' : 'var(--text-3)',
                  }}
                >
                  {s.flag}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.code.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label htmlFor="custom-storefront" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            Custom code
          </label>
          <input
            id="custom-storefront"
            type="text"
            value={customStorefront}
            onChange={(ev) => setCustomStorefront(ev.target.value.toLowerCase())}
            placeholder="e.g. de"
            maxLength={4}
            style={{
              width: 100,
              padding: '8px 10px',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              borderRadius: 8,
              background: 'var(--elev)',
              border: '1px solid var(--hairline)',
              color: 'var(--text)',
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => applyStorefront(customStorefront)}
            disabled={
              !customStorefront.trim() || customStorefront.trim().toLowerCase() === storefront
            }
          >
            Apply
          </Button>
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-4)',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon.Alert size={12} /> Changing storefront reloads the page.
          </span>
        </div>
      </Row>

      {/* Appearance */}
      <Row
        title="Appearance"
        desc="Theme, surface style, navigation layout, and accent colour. Saved to this browser."
      >
        <TweaksPanel />
      </Row>

      {/* Session & Dev info */}
      <Row
        title="Session & Dev info"
        desc="MusicKit runtime state. Useful when diagnosing auth problems."
        right={
          isAuthorized && (
            <Button
              variant="danger"
              size="sm"
              onClick={onDisconnect}
              icon={<Icon.Unlink size={13} />}
            >
              Disconnect
            </Button>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatusLine
            label="MusicKit runtime"
            status={isReady ? 'ok' : 'warn'}
            detail={isReady ? 'configured with developer token' : 'initialising…'}
          />
          <StatusLine
            label="Authorization"
            status={isAuthorized ? 'ok' : 'warn'}
            detail={isAuthorized ? 'user token present' : 'not authorized'}
          />
          <StatusLine
            label="Storefront"
            status="ok"
            detail={storefront ? storefront.toUpperCase() : '—'}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 12,
          }}
        >
          <KV label="Music User Token">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11.5,
                color: musicUserToken ? 'var(--text-2)' : 'var(--text-4)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tokenPreview}
            </span>
          </KV>
          <KV label="Connection">
            {isAuthorized ? (
              <Pill tone="ok">
                <StatusDot status="ok" size={6} /> Connected
              </Pill>
            ) : (
              <Pill tone="warn">
                <StatusDot status="warn" size={6} /> Not connected
              </Pill>
            )}
          </KV>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'oklch(0.72 0.19 25 / 0.1)',
              border: '1px solid oklch(0.72 0.19 25 / 0.3)',
              color: 'var(--err)',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Icon.Alert size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              <strong style={{ fontWeight: 600 }}>MusicKit error: </strong>
              {error}
            </span>
          </div>
        )}
      </Row>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-4)',
          textAlign: 'center',
          padding: '20px 0',
          fontFamily: 'var(--font-mono)',
        }}
      >
        apple-music-library-organizer · client
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  right,
  children,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div className="panel" style={{ padding: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: children ? 18 : 0,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 14.5,
                fontWeight: 600,
                letterSpacing: -0.1,
              }}
            >
              {title}
            </h3>
            {desc && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12.5,
                  color: 'var(--text-3)',
                }}
              >
                {desc}
              </p>
            )}
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
  );
}

function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--elev)',
        border: '1px solid var(--hairline)',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--text-4)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  );
}

function StatusLine({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'ok' | 'warn' | 'err' | 'neutral';
  detail: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--elev)',
        border: '1px solid var(--hairline)',
      }}
    >
      <StatusDot status={status} size={7} />
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {detail}
      </span>
    </div>
  );
}
