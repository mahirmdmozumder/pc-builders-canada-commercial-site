import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { env } from '@/lib/env';
import { SiteJsonLd } from '@/components/seo/structured-data';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-mono-spec',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'PC Builders Canada | Custom PCs, Repairs & IT Support in Toronto',
    template: '%s | PC Builders Canada',
  },
  description:
    'Custom PC builds and pre-built gaming PCs, computer repair and upgrades, networking, NAS and storage, small servers and on-site IT support across Toronto and the GTA.',
  /**
   * Google has ignored the keywords meta tag since 2009. It is kept short and
   * honest rather than stuffed, because the only thing it can still do is make
   * the page look spammy to a human reading the source.
   */
  keywords: [
    'custom PC builder Toronto',
    'computer repair Toronto',
    'on-site IT support Toronto',
    'network setup Toronto',
    'NAS setup Toronto',
  ],
  applicationName: 'PC Builders Canada',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: 'PC Builders Canada',
    title: 'PC Builders Canada | Custom PCs, Repairs & IT Support in Toronto',
    description:
      'Custom PC builds, computer repair, networking, NAS and on-site IT support across Toronto and the GTA.',
    url: env.siteUrl,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PC Builders Canada',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PC Builders Canada',
    description: 'Custom gaming and workstation PCs, built to order and tested before they ship.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-900">
        {/* Organization, WebSite and LocalBusiness, emitted once for the
            whole site. Page-level schema references these by @id rather
            than restating them. */}
        <SiteJsonLd />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
