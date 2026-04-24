import type { CSSProperties, ReactNode, SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke' | 'style'> {
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}

function BaseIcon({
  size = 18,
  stroke = 1.6,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// Each icon accepts { size, stroke, style, ...svg props }.
// Stroke-based, consistent at 16–20px.

export const Logo = ({ size = 24, style }: { size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
    <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="currentColor" opacity="0.12" />
    <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="currentColor" strokeOpacity="0.4" />
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="7" y1="9" x2="7" y2="15" />
      <line x1="10" y1="7" x2="10" y2="17" />
      <line x1="13" y1="10" x2="13" y2="14" />
      <line x1="16" y1="8" x2="16" y2="16" />
    </g>
  </svg>
);

export const Home = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </BaseIcon>
);

export const Grid = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </BaseIcon>
);

export const Search = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <line x1="16" y1="16" x2="20.5" y2="20.5" />
  </BaseIcon>
);

export const Library = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3.5" y="3.5" width="5" height="17" rx="1.2" />
    <rect x="10.5" y="3.5" width="5" height="17" rx="1.2" />
    <path d="M17.5 5.5l2.5-.7L22 18.5l-2.5.7z" />
  </BaseIcon>
);

export const Wand = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M15 4l2 2M11 8l9 9-2 2-9-9zM5 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 15l.7 1.3 1.3.7-1.3.7L19 19l-.7-1.3L17 17l1.3-.7z" />
  </BaseIcon>
);

export const Gear = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1z" />
  </BaseIcon>
);

export const Plus = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </BaseIcon>
);

export const Check = (p: IconProps) => (
  <BaseIcon {...p}>
    <polyline points="20 6 9 17 4 12" />
  </BaseIcon>
);

export const Alert = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <line x1="12" y1="16" x2="12" y2="16.01" />
  </BaseIcon>
);

export const X = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </BaseIcon>
);

export const Link = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.5-1.5" />
  </BaseIcon>
);

export const Unlink = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M18.36 6.64a4.5 4.5 0 0 0-6.36 0l-1 1" />
    <path d="M5.64 17.36a4.5 4.5 0 0 0 6.36 0l1-1" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </BaseIcon>
);

export const Chevron = (p: IconProps) => (
  <BaseIcon {...p}>
    <polyline points="9 6 15 12 9 18" />
  </BaseIcon>
);

export const ChevronDown = (p: IconProps) => (
  <BaseIcon {...p}>
    <polyline points="6 9 12 15 18 9" />
  </BaseIcon>
);

export const Disc = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </BaseIcon>
);

export const Note = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M9 17V6l11-2v11" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </BaseIcon>
);

export const List = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </BaseIcon>
);

export const User = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </BaseIcon>
);

export const Globe = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
  </BaseIcon>
);

export const Refresh = (p: IconProps) => (
  <BaseIcon {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15" />
  </BaseIcon>
);

export const Trash = (p: IconProps) => (
  <BaseIcon {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </BaseIcon>
);

export const Sparkle = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
  </BaseIcon>
);

export const Filter = (p: IconProps) => (
  <BaseIcon {...p}>
    <polygon points="3 4 21 4 14 12 14 20 10 20 10 12" />
  </BaseIcon>
);

export const Hash = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </BaseIcon>
);

export const Copy = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </BaseIcon>
);

export const Menu = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </BaseIcon>
);

export const Duplicate = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="9" cy="12" r="5" />
    <circle cx="15" cy="12" r="5" />
  </BaseIcon>
);

export const Question = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1-1 1.7" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
  </BaseIcon>
);

export const Arrow = (p: IconProps) => (
  <BaseIcon {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </BaseIcon>
);

export const Dot = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </BaseIcon>
);

export const Play = (p: IconProps) => (
  <BaseIcon {...p}>
    <polygon points="6 4 20 12 6 20" fill="currentColor" />
  </BaseIcon>
);

export const Headphones = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
  </BaseIcon>
);

export const Eye = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </BaseIcon>
);
