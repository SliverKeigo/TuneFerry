'use client';

import { useLocalStorage } from './useLocalStorage';

const DEFAULT_STOREFRONT = process.env.NEXT_PUBLIC_DEFAULT_STOREFRONT?.trim() || 'us';

/**
 * Persisted Apple Music storefront (two-letter region code, e.g. 'us', 'gb').
 * Read by /match (sent to /api/match) and /export (default to 'us' if missing).
 */
export function useStorefront(): [string, (next: string) => void] {
  const [storefront, setStorefront] = useLocalStorage<string>('tf.storefront', DEFAULT_STOREFRONT);
  return [storefront, setStorefront];
}
