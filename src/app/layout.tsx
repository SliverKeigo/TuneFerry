import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TuneFerry — Spotify → Apple Music',
  description:
    'Migrate public Spotify playlists to Apple Music. Paste a playlist URL, fuzzy-match against the Apple Music catalog, and export a deep-link list plus an iOS Shortcut for one-tap bulk add.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-bg" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
