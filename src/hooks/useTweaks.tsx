'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from 'react';
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
  // Merge against defaults so users with older localStorage entries (missing
  // newly-introduced fields like `locale`) still get sensible values.
  const tweaks = useMemo<Tweaks>(() => ({ ...DEFAULT_TWEAKS, ...stored }), [stored]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    root.dataset.surface = tweaks.surface;
    root.lang = tweaks.locale;
    root.style.setProperty('--accent-h', String(tweaks.accentHue));
  }, [tweaks]);

  const setTweak = useCallback(
    <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
      setStored((prev) => ({ ...DEFAULT_TWEAKS, ...prev, [key]: value }));
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
