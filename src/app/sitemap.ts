import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { POLICIES } from '@/content/policies';
import { BUILD_PRESETS } from '@/lib/catalog/presets';

/**
 * Sitemap.
 *
 * Only pages worth indexing. Cart, checkout, account and admin are excluded
 * deliberately: they are private or session-specific, and listing them would
 * be noise for a crawler and a small information leak about the surface area.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, '');
  const now = new Date();

  const primary: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/build`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/gaming-pcs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/workstations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/portfolio`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const presets: MetadataRoute.Sitemap = BUILD_PRESETS.map((preset) => ({
    url: `${base}/build?preset=${preset.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const policies: MetadataRoute.Sitemap = POLICIES.map((policy) => ({
    url: `${base}/legal/${policy.slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }));

  return [...primary, ...presets, ...policies];
}
