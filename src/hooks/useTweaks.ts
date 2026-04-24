'use client';

import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemeTweak = 'dark' | 'light';
export type SurfaceTweak = 'glass' | 'flat';
export type NavTweak = 'sidebar' | 'topnav';

export interface Tweaks {
  theme: ThemeTweak;
  surface: SurfaceTweak;
  nav: NavTweak;
  accentHue: number;
}

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'dark',
  surface: 'glass',
  nav: 'sidebar',
  accentHue: 135,
};

export const ACCENT_HUES: { value: number; label: string }[] = [
  { value: 135, label: 'Lime' },
  { value: 200, label: 'Cyan' },
  { value: 295, label: 'Violet' },
  { value: 30, label: 'Amber' },
  { value: 340, label: 'Magenta' },
];

/**
 * Persist + apply the visual tweaks (theme / surface / nav / accent hue).
 *
 * Values are mirrored to `<html>`'s `data-theme` / `data-surface` attributes
 * and `--accent-h` CSS variable so any component can read them via CSS vars.
 */
export function useTweaks(): {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  resetTweaks: () => void;
} {
  const [tweaks, setTweaks, clearTweaks] = useLocalStorage<Tweaks>('am.tweaks', DEFAULT_TWEAKS);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    root.dataset.surface = tweaks.surface;
    root.style.setProperty('--accent-h', String(tweaks.accentHue));
  }, [tweaks]);

  const setTweak = useCallback(
    <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
      setTweaks((prev) => ({ ...prev, [key]: value }));
    },
    [setTweaks],
  );

  return { tweaks, setTweak, resetTweaks: clearTweaks };
}
