import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import * as Icon from './icons';

// ---------------- Button ----------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const BUTTON_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 10px', fontSize: 12, height: 28, borderRadius: 8, gap: 6 },
  md: { padding: '8px 14px', fontSize: 13, height: 34, borderRadius: 10, gap: 8 },
  lg: { padding: '11px 18px', fontSize: 14, height: 42, borderRadius: 12, gap: 10 },
};

const BUTTON_VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--accent-fg)',
    border: '1px solid oklch(1 0 0 / 0.1)',
    fontWeight: 600,
    boxShadow:
      '0 0 0 1px var(--accent-ring), 0 6px 18px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.25)',
  },
  secondary: {
    background: 'var(--elev)',
    color: 'var(--text)',
    border: '1px solid var(--hairline)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-2)',
    border: '1px solid transparent',
    fontWeight: 500,
  },
  danger: {
    background: 'oklch(0.72 0.19 25 / 0.12)',
    color: 'var(--err)',
    border: '1px solid oklch(0.72 0.19 25 / 0.3)',
    fontWeight: 500,
  },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: -0.05,
        whiteSpace: 'nowrap',
        transition:
          'transform var(--dur) var(--ease), background var(--dur) var(--ease), border-color var(--dur) var(--ease), filter var(--dur) var(--ease)',
        ...BUTTON_SIZES[size],
        ...BUTTON_VARIANTS[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(1px)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = '';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
      }}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// ---------------- StatusDot ----------------

export type StatusTone = 'ok' | 'warn' | 'err' | 'neutral';

const STATUS_COLOR: Record<StatusTone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  err: 'var(--err)',
  neutral: 'var(--text-4)',
};

export function StatusDot({ status = 'ok', size = 8 }: { status?: StatusTone; size?: number }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: 999,
          background: color,
          opacity: 0.15,
        }}
      />
    </span>
  );
}

// ---------------- Pill ----------------

export type PillTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err';

const PILL_TONES: Record<PillTone, { bg: string; color: string; border: string }> = {
  neutral: { bg: 'var(--elev)', color: 'var(--text-2)', border: 'var(--hairline)' },
  accent: {
    bg: 'var(--accent-soft)',
    color: 'var(--accent)',
    border: 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.3)',
  },
  ok: {
    bg: 'oklch(0.82 0.17 145 / 0.12)',
    color: 'var(--ok)',
    border: 'oklch(0.82 0.17 145 / 0.28)',
  },
  warn: {
    bg: 'oklch(0.82 0.14 85 / 0.14)',
    color: 'var(--warn)',
    border: 'oklch(0.82 0.14 85 / 0.3)',
  },
  err: {
    bg: 'oklch(0.72 0.19 25 / 0.12)',
    color: 'var(--err)',
    border: 'oklch(0.72 0.19 25 / 0.3)',
  },
};

export function Pill({
  children,
  tone = 'neutral',
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  const t = PILL_TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.1,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

// ---------------- ConnectionBadge ----------------

export function ConnectionBadge({
  connected,
  onClick,
  compact = false,
}: {
  connected: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: connected ? 'oklch(0.82 0.17 145 / 0.1)' : 'var(--elev)',
          border: `1px solid ${connected ? 'oklch(0.82 0.17 145 / 0.3)' : 'var(--hairline)'}`,
          fontSize: 12,
          fontWeight: 500,
          color: connected ? 'var(--ok)' : 'var(--text-2)',
        }}
      >
        <StatusDot status={connected ? 'ok' : 'warn'} size={6} />
        {connected ? 'Connected' : 'Not connected'}
      </button>
    );
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 999,
        background: connected ? 'oklch(0.82 0.17 145 / 0.08)' : 'var(--elev)',
        border: `1px solid ${connected ? 'oklch(0.82 0.17 145 / 0.3)' : 'var(--hairline)'}`,
      }}
    >
      <StatusDot status={connected ? 'ok' : 'warn'} size={7} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        {connected ? 'Connected to Apple Music' : 'Apple Music not connected'}
      </span>
    </div>
  );
}

// ---------------- AddButton ----------------

export type AddButtonState = 'idle' | 'adding' | 'added' | 'failed';

export function AddButton({
  state = 'idle',
  onAdd,
  size = 'md',
  label = 'Add',
}: {
  state?: AddButtonState;
  onAdd?: () => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const s =
    size === 'sm'
      ? { h: 28, fs: 12, pad: '0 10px', ic: 14 }
      : { h: 32, fs: 12, pad: '0 12px', ic: 15 };
  const common: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: s.h,
    padding: s.pad,
    borderRadius: 999,
    fontSize: s.fs,
    fontWeight: 600,
    letterSpacing: -0.05,
    transition:
      'background var(--dur) var(--ease), border-color var(--dur) var(--ease), color var(--dur) var(--ease), transform var(--dur) var(--ease)',
  };

  if (state === 'adding') {
    return (
      <button
        type="button"
        disabled
        style={{
          ...common,
          background: 'var(--elev)',
          border: '1px solid var(--hairline)',
          color: 'var(--text-2)',
        }}
      >
        <Spinner size={s.ic - 2} /> Adding
      </button>
    );
  }
  if (state === 'added') {
    return (
      <button
        type="button"
        disabled
        style={{
          ...common,
          background: 'oklch(0.82 0.17 145 / 0.14)',
          border: '1px solid oklch(0.82 0.17 145 / 0.4)',
          color: 'var(--ok)',
          animation: 'pulse-ring 600ms var(--ease)',
        }}
      >
        <TickSvg size={s.ic} /> In Library
      </button>
    );
  }
  if (state === 'failed') {
    return (
      <button
        type="button"
        onClick={onAdd}
        style={{
          ...common,
          background: 'oklch(0.72 0.19 25 / 0.12)',
          border: '1px solid oklch(0.72 0.19 25 / 0.35)',
          color: 'var(--err)',
          animation: 'shake 320ms var(--ease)',
        }}
      >
        <Icon.Refresh size={s.ic - 2} /> Retry
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      style={{
        ...common,
        background: 'var(--accent)',
        color: 'var(--accent-fg)',
        border: '1px solid oklch(1 0 0 / 0.1)',
        boxShadow: '0 0 0 1px var(--accent-ring)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = '';
      }}
    >
      <Icon.Plus size={s.ic - 2} stroke={2.2} /> {label}
    </button>
  );
}

// ---------------- Spinner ----------------

export function Spinner({ size = 14, stroke = 2 }: { size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ animation: 'spin 900ms linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth={stroke}
        fill="none"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------- Animated tick ----------------

export function TickSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline
        points="5 12 10 17 19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 20, animation: 'tick 280ms var(--ease) forwards' }}
      />
    </svg>
  );
}

// ---------------- Segmented ----------------

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? '5px 10px' : '7px 12px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--elev)',
        border: '1px solid var(--hairline)',
        borderRadius: 10,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: 500,
              borderRadius: 8,
              color: active ? 'var(--text)' : 'var(--text-3)',
              background: active ? 'var(--panel-solid)' : 'transparent',
              border: active ? '1px solid var(--hairline)' : '1px solid transparent',
              boxShadow: active ? '0 1px 2px oklch(0 0 0 / 0.3)' : 'none',
              transition: 'all var(--dur) var(--ease)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- MonoId ----------------

export function MonoId({ id, prefix = 'id' }: { id: string; prefix?: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        color: 'var(--text-4)',
        letterSpacing: 0.2,
      }}
    >
      <span style={{ opacity: 0.65 }}>{prefix}/</span>
      {id}
    </span>
  );
}

// ---------------- Toast ----------------

export type ToastTone = 'neutral' | 'ok' | 'err' | 'info';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

type ToastPushFn = (t: ToastInput) => void;

const ToastCtx = createContext<ToastPushFn | null>(null);

export function useToast(): ToastPushFn {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback<ToastPushFn>((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((s) => [...s, { tone: 'neutral', ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.duration ?? 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="panel"
            style={{
              padding: '10px 14px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'fade-up 240ms var(--ease)',
              pointerEvents: 'auto',
              background: 'var(--panel-solid)',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            {t.tone === 'ok' && <Icon.Check size={16} style={{ color: 'var(--ok)' }} />}
            {t.tone === 'err' && <Icon.Alert size={16} style={{ color: 'var(--err)' }} />}
            {t.tone === 'info' && <StatusDot size={7} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Section / Page headers ----------------

export function SectionHeader({
  title,
  desc,
  right,
}: {
  title: ReactNode;
  desc?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 14,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: -0.1 }}>{title}</h2>
        {desc && (
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{desc}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: 'var(--text-4)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>{title}</h1>
        {desc && (
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 14,
              color: 'var(--text-3)',
              maxWidth: 620,
              lineHeight: 1.5,
            }}
          >
            {desc}
          </p>
        )}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{right}</div>}
    </header>
  );
}

// ---------------- StatCard ----------------

export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: 'var(--text-4)' }}>{icon}</span>}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: -0.6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {delta && <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

// ---------------- Artwork (gradient placeholder) ----------------

export type ArtworkKind = 'album' | 'song' | 'playlist' | 'artist';

export function Artwork({
  hue = 200,
  hue2,
  size = 56,
  label,
  kind = 'album',
  radius = 10,
  imgSrc,
}: {
  hue?: number;
  hue2?: number;
  size?: number;
  label?: string;
  kind?: ArtworkKind;
  radius?: number;
  imgSrc?: string;
}) {
  const h2 = hue2 ?? (hue + 60) % 360;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background: `linear-gradient(135deg, oklch(0.55 0.16 ${hue}) 0%, oklch(0.32 0.12 ${h2}) 100%)`,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: 'inset 0 0 0 1px oklch(1 0 0 / 0.08)',
  };
  if (imgSrc) {
    return (
      <div style={style} aria-label={label}>
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }
  return (
    <div style={style} aria-label={label}>
      {kind === 'playlist' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: 'absolute', inset: 0, opacity: 0.28 }}
          aria-hidden
        >
          <title>playlist texture</title>
          <defs>
            <pattern
              id={`hatch-${hue}`}
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#hatch-${hue})`} />
        </svg>
      )}
      {kind === 'artist' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: 'absolute', inset: 0, opacity: 0.4 }}
          aria-hidden
        >
          <title>artist texture</title>
          <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="white" strokeWidth="1.4" />
        </svg>
      )}
      {(kind === 'album' || kind === 'song') && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: 'absolute', inset: 0, opacity: 0.22 }}
          aria-hidden
        >
          <title>disc texture</title>
          <circle cx="80" cy="80" r="70" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="80" cy="80" r="50" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="80" cy="80" r="30" fill="none" stroke="white" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}

// ---------------- artworkHueFromId ----------------
// Deterministic hue from any id, for gradient artwork placeholders.
export function artworkHueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}
