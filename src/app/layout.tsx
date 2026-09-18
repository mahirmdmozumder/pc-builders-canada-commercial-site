import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { env } from '@/lib/env';

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
    default: 'PC Builders Canada | Custom Gaming & Workstation PCs',
    template: '%s | PC Builders Canada',
  },
  description:
    'Custom PC builds, gaming PCs and workstations assembled and tested in Canada. Configure a build with live compatibility checks, or book upgrades, diagnostics and Windows setup.',
  keywords: [
    'PC Builders Canada',
    'custom PC builds Canada',
    'gaming PC builds',
    'workstation PC builds',
    'PC hardware services',
    'PC upgrades',
  ],
  applicationName: 'PC Builders Canada',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: 'PC Builders Canada',
    title: 'PC Builders Canada | Custom Gaming & Workstation PCs',
    description:
      'Configure a custom PC with live compatibility and power checks, or book upgrades, diagnostics and Windows setup.',
    url: env.siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PC Builders Canada',
    description: 'Custom gaming and workstation PCs, built to order and tested before they ship.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-900">
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
