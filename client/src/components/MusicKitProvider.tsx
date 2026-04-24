import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDeveloperToken } from '../api/appleMusicApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MusicKitContext, MusicKitContextValue } from '../hooks/useMusicKit';

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
const DEFAULT_STOREFRONT =
  (import.meta.env.VITE_DEFAULT_STOREFRONT as string | undefined)?.trim() || 'us';

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

  const instanceRef = useRef<MusicKitInstance | null>(null);

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

        const result = MusicKit.configure({
          developerToken,
          app: { name: APP_NAME, build: APP_BUILD },
          storefrontId: storefront,
        });
        const instance = (await result) as MusicKitInstance;
        if (cancelled) return;

        instanceRef.current = instance;

        // Reflect the current MusicKit state. When the user has authorised in
        // a previous session MusicKit will already report `isAuthorized: true`.
        const kitAuthorized = instance.isAuthorized;
        const kitToken = instance.musicUserToken || '';
        setIsAuthorized(kitAuthorized || Boolean(cachedUserToken));
        setMusicUserToken(kitToken || cachedUserToken);
        if (kitToken && kitToken !== cachedUserToken) {
          setCachedUserToken(kitToken);
        }
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error('[MusicKit] init failed', err);
        setError(msg);
        setIsReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only on mount — reconfiguring for storefront changes is
    // handled by `setStorefront` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Listen for auth changes emitted by MusicKit itself ---
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    function sync() {
      const inst = instanceRef.current;
      if (!inst) return;
      setIsAuthorized(inst.isAuthorized);
      setMusicUserToken(inst.musicUserToken || '');
      if (inst.musicUserToken) setCachedUserToken(inst.musicUserToken);
    }
    instance.addEventListener('authorizationStatusDidChange', sync);
    return () => instance.removeEventListener('authorizationStatusDidChange', sync);
  }, [isReady, setCachedUserToken]);

  const authorize = useCallback(async () => {
    const instance = instanceRef.current;
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
  }, [setCachedUserToken]);

  const unauthorize = useCallback(async () => {
    const instance = instanceRef.current;
    try {
      if (instance) await instance.unauthorize();
    } catch {
      /* ignore — we still clear our local state */
    }
    clearCachedUserToken();
    setMusicUserToken('');
    setIsAuthorized(false);
  }, [clearCachedUserToken]);

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
    [isReady, isAuthorized, musicUserToken, storefront, error, authorize, unauthorize, setStorefront],
  );

  return <MusicKitContext.Provider value={value}>{children}</MusicKitContext.Provider>;
}
