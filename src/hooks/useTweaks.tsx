'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemeTweak = 'dark' | 'light';
export type SurfaceTweak = 'glass' | 'flat';
export type NavTweak = 'sidebar' | 'topnav';
export type Locale = 'en' | 'zh';

export interface Tweaks {
  theme: ThemeTweak;
  surface: SurfaceTweak;
  nav: NavTweak;
  accentHue: number;
  locale: Locale;
}

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'dark',
  surface: 'glass',
  nav: 'sidebar',
  accentHue: 135,
  locale: 'en',
};

export const ACCENT_HUES: { value: number; label: string }[] = [
  { value: 135, label: 'Lime' },
  { value: 200, label: 'Cyan' },
  { value: 295, label: 'Violet' },
  { value: 30, label: 'Amber' },
  { value: 340, label: 'Magenta' },
];

// Allow-lists used to coerce hydrated localStorage values back into the union
// types. A user (or a stale entry from a previous build that supported more
// values) can leave invalid strings in `am.tweaks`; without this, indexed
// lookups like `MESSAGES[tweaks.locale]` would yield `undefined` and crash
// `NextIntlClientProvider`.
const VALID_THEMES = new Set<ThemeTweak>(['dark', 'light']);
const VALID_SURFACES = new Set<SurfaceTweak>(['glass', 'flat']);
const VALID_NAVS = new Set<NavTweak>(['sidebar', 'topnav']);
const VALID_LOCALES = new Set<Locale>(['en', 'zh']);
const VALID_HUES = new Set<number>(ACCENT_HUES.map((h) => h.value));

export function sanitizeTweaks(input: unknown): Tweaks {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Tweaks>;
  const theme = VALID_THEMES.has(raw.theme as ThemeTweak)
    ? (raw.theme as ThemeTweak)
    : DEFAULT_TWEAKS.theme;
  const surface = VALID_SURFACES.has(raw.surface as SurfaceTweak)
    ? (raw.surface as SurfaceTweak)
    : DEFAULT_TWEAKS.surface;
  const nav = VALID_NAVS.has(raw.nav as NavTweak) ? (raw.nav as NavTweak) : DEFAULT_TWEAKS.nav;
  const locale = VALID_LOCALES.has(raw.locale as Locale)
    ? (raw.locale as Locale)
    : DEFAULT_TWEAKS.locale;
  const accentHue =
    typeof raw.accentHue === 'number' && VALID_HUES.has(raw.accentHue)
      ? raw.accentHue
      : DEFAULT_TWEAKS.accentHue;
  return { theme, surface, nav, accentHue, locale };
}

interface TweaksApi {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  resetTweaks: () => void;
}

const TweaksContext = createContext<TweaksApi | null>(null);

/**
 * Provides tweaks state via React Context so every `useTweaks()` call across
 * the app reads the same instance. Without this, each consumer would have its
 * own `useState`/`useLocalStorage` and same-tab updates wouldn't propagate
 * (the `storage` event only fires across tabs).
 *
 * Also mirrors values to `<html>`'s `data-theme` / `data-surface` attributes
 * and the `--accent-h` CSS variable so any component can read them via CSS.
 */
export function TweaksProvider({ children }: { children: ReactNode }) {
  const [stored, setStored, clearStored] = useLocalStorage<Partial<Tweaks>>(
    'am.tweaks',
    DEFAULT_TWEAKS,
  );
  // SSR / hydration: the server has no `localStorage`, so we render with
  // `DEFAULT_TWEAKS` on the first client paint to match the server output.
  // Once mounted we swap to the persisted (and sanitized) values. This costs a
  // single render — but it eliminates React's "Hydration failed" warnings and
  // the discarded SSR subtree that follows them.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sanitize against the allow-lists so older or hand-edited localStorage
  // entries (missing fields, removed enum values, wrong types) can't propagate
  // into the rendered tree.
  const tweaks = useMemo<Tweaks>(
    () => (mounted ? sanitizeTweaks(stored) : DEFAULT_TWEAKS),
    [mounted, stored],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    root.dataset.surface = tweaks.surface;
    root.lang = tweaks.locale;
    root.style.setProperty('--accent-h', String(tweaks.accentHue));
  }, [tweaks]);

  const setTweak = useCallback(
    <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
      // Re-sanitize on every write so a single legitimate setTweak call
      // also scrubs any pre-existing dirty siblings out of localStorage.
      setStored((prev) => ({ ...sanitizeTweaks(prev), [key]: value }));
    },
    [setStored],
  );

  const api = useMemo<TweaksApi>(
    () => ({ tweaks, setTweak, resetTweaks: clearStored }),
    [tweaks, setTweak, clearStored],
  );

  return <TweaksContext.Provider value={api}>{children}</TweaksContext.Provider>;
}

export function useTweaks(): TweaksApi {
  const ctx = useContext(TweaksContext);
  if (!ctx) throw new Error('useTweaks must be used inside <TweaksProvider>');
  return ctx;
}
