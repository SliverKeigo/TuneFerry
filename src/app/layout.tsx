import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apple Music Library Organizer',
  description:
    'Connect your Apple Music account, search the catalog & your library, and add tracks with one click.',
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
        {/* MusicKit JS v3 from Apple's CDN; beforeInteractive so `musickitloaded`
            fires before React mounts the provider that listens for it. */}
        <Script
          src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
          strategy="beforeInteractive"
        />
        <div className="app-bg" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
