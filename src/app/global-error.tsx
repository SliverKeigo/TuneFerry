'use client';

import { useEffect } from 'react';

/**
 * Last-resort error boundary that *replaces* the RootLayout. Triggered only
 * when an error escapes the root layout itself (e.g. Providers or a top-level
 * effect throws during hydration). Because we're outside the Provider tree,
 * we can't rely on next-intl, useTweaks, or any context — keep this file
 * dependency-free, English-only, and self-contained.
 *
 * Must render its own `<html>` + `<body>`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#101216',
          color: '#f0f0f0',
          minHeight: '100vh',
          margin: 0,
          padding: '64px 24px',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Something broke</h1>
          <p
            style={{
              marginTop: 12,
              color: '#aaa',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            An unexpected error reached the root of the app. This is the last-resort fallback — try
            reloading. If it persists, check the browser console.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: '10px 18px',
              background: '#7ed957',
              border: 'none',
              borderRadius: 8,
              color: '#101216',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
