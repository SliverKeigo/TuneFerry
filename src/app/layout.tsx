import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TuneFerry — Spotify → Apple Music',
  description:
    'Migrate Spotify playlists to Apple Music. Paste a public playlist URL or sign in to Spotify, match against the Apple Music catalog, and export deep-link / .m3u8 lists.',
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
