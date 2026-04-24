'use client';

import { fetchDeveloperToken } from '@/api/appleMusicApi';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MusicKitContext, type MusicKitContextValue } from '@/hooks/useMusicKit';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

// ---------- MusicKit ambient types (minimum subset) ----------
// MusicKit v3 is loaded via <script> in index.html and lives on `window.MusicKit`.
declare global {
  interface Window {
    MusicKit?: {
      configure: (opts: {
        developerToken: string;
        app: { name: string; build: string };
        storefrontId?: string;
      }) => Promise<MusicKitInstance> | MusicKitInstance;
      getInstance?: () => MusicKitInstance | undefined;
    };
  }
}

interface MusicKitInstance {
  isAuthorized: boolean;
  musicUserToken: string;
  storefrontId: string;
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

const MUSIC_KIT_READY_EVENT = 'musickitloaded';
const APP_NAME = 'Apple Music Library Organizer';
const APP_BUILD = '0.1.0';
const DEFAULT_STOREFRONT = process.env.NEXT_PUBLIC_DEFAULT_STOREFRONT?.trim() || 'us';

function waitForMusicKit(timeoutMs = 15_000): Promise<NonNullable<Window['MusicKit']>> {
  return new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit);
    const timeout = window.setTimeout(() => {
      document.removeEventListener(MUSIC_KIT_READY_EVENT, onReady);
      reject(new Error('Timed out waiting for MusicKit JS to load.'));
    }, timeoutMs);
    function onReady() {
      window.clearTimeout(timeout);
      if (window.MusicKit) resolve(window.MusicKit);
      else reject(new Error('MusicKit JS failed to initialise.'));
    }
    document.addEventListener(MUSIC_KIT_READY_EVENT, onReady, { once: true });
  });
}

export default function MusicKitProvider({ children }: { children: ReactNode }) {
  const [cachedUserToken, setCachedUserToken, clearCachedUserToken] = useLocalStorage<string>(
    'am.musicUserToken',
    '',
  );
  const [storefront, setStorefrontState] = useLocalStorage<string>(
    'am.storefront',
    DEFAULT_STOREFRONT,
  );

  const [isReady, setIsReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(Boolean(cachedUserToken));
  const [musicUserToken, setMusicUserToken] = useState<string>(cachedUserToken);
  const [error, setError] = useState<string | null>(null);

  // Instance lives in state, not a ref, so the subscription effect below can
  // actually depend on "instance became available" as a reactive value.
  const [instance, setInstance] = useState<MusicKitInstance | null>(null);

  // Mount-time snapshot of values we want to seed MusicKit with exactly once.
  // Later changes must NOT re-run init — storefront swaps force a page reload
  // via setStorefront(); disconnect clears cachedUserToken but must not bounce
  // the user through a new MusicKit.configure().
  // `useState`'s lazy initializer runs exactly once, unlike `useRef({...})`
  // which re-evaluates its initial expression on every render.
  const [initial] = useState(() => ({ userToken: cachedUserToken, storefront }));

  // --- Initialise MusicKit once ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [MusicKit, developerToken] = await Promise.all([
          waitForMusicKit(),
          fetchDeveloperToken(),
        ]);
        if (cancelled) return;

        // Reuse an already-configured instance if one exists. React StrictMode
        // intentionally mounts -> unmounts -> remounts every effect in dev, and
        // Apple's MusicKit.configure() warns when called twice on the same
        // page. getInstance() lets us short-circuit the second pass.
        const existing = MusicKit.getInstance?.();
        const freshInstance =
          existing ??
          ((await MusicKit.configure({
            developerToken,
            app: { name: APP_NAME, build: APP_BUILD },
            storefrontId: initial.storefront,
          })) as MusicKitInstance);
        if (cancelled) return;

        setInstance(freshInstance);

        // If MusicKit already knows the user from a previous session it will
        // report authorised here; reconcile with anything we had cached.
        const kitAuthorized = freshInstance.isAuthorized;
        const kitToken = freshInstance.musicUserToken || '';
        setIsAuthorized(kitAuthorized || Boolean(initial.userToken));
        setMusicUserToken(kitToken || initial.userToken);
        if (kitToken && kitToken !== initial.userToken) {
          setCachedUserToken(kitToken);
        }
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[MusicKit] init failed', err);
        setError(msg);
        setIsReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial, setCachedUserToken]);

  // --- Listen for auth changes emitted by MusicKit itself ---
  useEffect(() => {
    if (!instance) return;
    const sync = () => {
      setIsAuthorized(instance.isAuthorized);
      setMusicUserToken(instance.musicUserToken || '');
      if (instance.musicUserToken) setCachedUserToken(instance.musicUserToken);
    };
    instance.addEventListener('authorizationStatusDidChange', sync);
    return () => instance.removeEventListener('authorizationStatusDidChange', sync);
  }, [instance, setCachedUserToken]);

  const authorize = useCallback(async () => {
    if (!instance) {
      setError('MusicKit is not ready yet.');
      return;
    }
    try {
      setError(null);
      await instance.authorize();
      setIsAuthorized(instance.isAuthorized);
      setMusicUserToken(instance.musicUserToken || '');
      if (instance.musicUserToken) setCachedUserToken(instance.musicUserToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [instance, setCachedUserToken]);

  const unauthorize = useCallback(async () => {
    try {
      if (instance) await instance.unauthorize();
    } catch {
      /* ignore — we still clear our local state */
    }
    clearCachedUserToken();
    setMusicUserToken('');
    setIsAuthorized(false);
  }, [instance, clearCachedUserToken]);

  const setStorefront = useCallback(
    (next: string) => {
      setStorefrontState(next);
      // MusicKit v3 reconfigures by calling configure() again. Cheapest path
      // in MVP is a full reload — safest way to keep the instance in sync.
      window.setTimeout(() => window.location.reload(), 50);
    },
    [setStorefrontState],
  );

  const value = useMemo<MusicKitContextValue>(
    () => ({
      isReady,
      isAuthorized,
      musicUserToken,
      storefront,
      error,
      authorize,
      unauthorize,
      setStorefront,
    }),
    [
      isReady,
      isAuthorized,
      musicUserToken,
      storefront,
      error,
      authorize,
      unauthorize,
      setStorefront,
    ],
  );

  return <MusicKitContext.Provider value={value}>{children}</MusicKitContext.Provider>;
}
