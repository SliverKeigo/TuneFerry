'use client';

import { ACCENT_HUES, type Tweaks, useTweaks } from '@/hooks/useTweaks';
import { Segmented } from './primitives';

export default function TweaksPanel() {
  const { tweaks, setTweak, resetTweaks } = useTweaks();

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Row label="Theme">
        <Segmented<Tweaks['theme']>
          value={tweaks.theme}
          onChange={(v) => setTweak('theme', v)}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </Row>

      <Row label="Surface">
        <Segmented<Tweaks['surface']>
          value={tweaks.surface}
          onChange={(v) => setTweak('surface', v)}
          options={[
            { value: 'glass', label: 'Glass' },
            { value: 'flat', label: 'Flat' },
          ]}
        />
      </Row>

      <Row label="Navigation">
        <Segmented<Tweaks['nav']>
          value={tweaks.nav}
          onChange={(v) => setTweak('nav', v)}
          options={[
            { value: 'sidebar', label: 'Sidebar' },
            { value: 'topnav', label: 'Top nav' },
          ]}
        />
      </Row>

      <Row label="Accent">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ACCENT_HUES.map((h) => {
            const active = tweaks.accentHue === h.value;
            return (
              <button
                type="button"
                key={h.value}
                title={h.label}
                onClick={() => setTweak('accentHue', h.value)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `oklch(0.78 0.16 ${h.value})`,
                  border: active ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                  outline: active ? '2px solid var(--accent-ring)' : 'none',
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </Row>

      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
        <button
          type="button"
          onClick={resetTweaks}
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}
