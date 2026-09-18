import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or session-specific areas. Blocking them keeps crawl budget
        // on pages that can actually rank and keeps order pages out of results.
        disallow: ['/admin', '/account', '/api/', '/cart', '/checkout', '/login', '/register', '/reset-password'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
