import { useState } from 'react';
import TokenStatus from '../components/TokenStatus';
import { useMusicKit } from '../hooks/useMusicKit';

const STOREFRONT_PRESETS: { value: string; label: string }[] = [
  { value: 'us', label: 'United States (us)' },
  { value: 'hk', label: 'Hong Kong (hk)' },
  { value: 'tw', label: 'Taiwan (tw)' },
  { value: 'jp', label: 'Japan (jp)' },
  { value: 'gb', label: 'United Kingdom (gb)' },
];

export default function SettingsPage() {
  const { storefront, setStorefront, unauthorize } = useMusicKit();
  const [customStorefront, setCustomStorefront] = useState(storefront);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
      <header>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
          Storefront is MusicKit&apos;s &quot;country / region code&quot;. Changing it reloads the
          app.
        </p>
      </header>

      <section
        style={{
          padding: 16,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Storefront</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STOREFRONT_PRESETS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`btn${s.value === storefront ? ' btn-primary' : ''}`}
              onClick={() => setStorefront(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="text"
            value={customStorefront}
            onChange={(ev) => setCustomStorefront(ev.target.value.toLowerCase())}
            placeholder="custom (2-letter code)"
            maxLength={4}
            style={{ maxWidth: 220 }}
          />
          <button
            className="btn"
            type="button"
            onClick={() => setStorefront(customStorefront.trim())}
            disabled={!customStorefront.trim() || customStorefront.trim() === storefront}
          >
            Apply custom
          </button>
        </div>
      </section>

      <section
        style={{
          padding: 16,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Session</h2>
        <TokenStatus />
        <div>
          <button className="btn" type="button" onClick={unauthorize}>
            Clear local authorisation
          </button>
        </div>
      </section>
    </div>
  );
}
