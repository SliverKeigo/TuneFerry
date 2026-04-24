'use client';

import { createContext, useContext } from 'react';

export interface MusicKitContextValue {
  /** Ready once MusicKit JS has loaded AND we've called `configure()` with a Developer Token. */
  isReady: boolean;
  /** True once the user has granted access — we have a Music User Token. */
  isAuthorized: boolean;
  /** MusicKit v3 exposes this via `music.musicUserToken`. Empty string when not authorised. */
  musicUserToken: string;
  /** Storefront returned by MusicKit (e.g. 'us', 'hk', 'tw'). */
  storefront: string;
  /** Latest initialisation error, if any. */
  error: string | null;

  authorize: () => Promise<void>;
  unauthorize: () => Promise<void>;
  setStorefront: (storefront: string) => void;
}

export const MusicKitContext = createContext<MusicKitContextValue | null>(null);

export function useMusicKit(): MusicKitContextValue {
  const ctx = useContext(MusicKitContext);
  if (!ctx) {
    throw new Error('useMusicKit must be used inside <MusicKitProvider>.');
  }
  return ctx;
}
