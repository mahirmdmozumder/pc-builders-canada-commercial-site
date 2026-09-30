import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { POLICIES } from '@/content/policies';
import { listPublishedPresets, listPublishedServices } from '@/lib/cms/repository';
import { SHOP_COLLECTIONS } from '@/lib/catalog/collections';

/**
 * Sitemap.
 *
 * Only pages worth indexing. Cart, checkout, account and admin are excluded
 * deliberately: they are private or session-specific, and listing them would
 * be noise for a crawler and a small information leak about the surface area.
 *
 * Query-parameter URLs are deliberately absent. Presets used to be listed as
 * /build?preset=slug, which Google largely ignores for indexing and which
 * would now duplicate the real /pre-built-gaming-pcs/[slug] pages. Filter and
 * sort URLs on /shop are excluded for the same reason: they are the same
 * products in a different order, and indexing them splits the signal.
 *
 * /scan is excluded too, for a different reason: it is the QR landing page
 * from printed cards, and almost every line on it links to a page that says
 * the same thing at greater length. Indexing it would enter it into
 * competition with /services and the homepage for the same terms. It carries
 * `robots: { index: false, follow: true }` of its own; this is the matching
 * half of that decision.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, '');
  const now = new Date();

  const primary: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/build`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/gaming-pcs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/workstations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/refurbished`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/portfolio`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/refer`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Generated from the collection definitions so a new collection cannot be
  // added to the header and then forgotten here.
  const collections: MetadataRoute.Sitemap = SHOP_COLLECTIONS.map((collection) => ({
    url: `${base}/${collection.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Only published presets are listed. An unpublished one has no page to
  // land on, and a sitemap entry for it would be a broken promise to a crawler.
  const { rows: publishedPresets } = await listPublishedPresets();
  const presets: MetadataRoute.Sitemap = publishedPresets.map((preset) => ({
    url: `${base}/pre-built-gaming-pcs/${preset.slug}`,
    lastModified: preset.updated_at ? new Date(preset.updated_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  /**
   * One entry per published service.
   *
   * Unpublished and archived services are excluded because their pages 404 —
   * listing a URL that returns nothing is a broken promise to a crawler and
   * burns crawl budget on this site's behalf.
   */
  const { rows: publishedServices } = await listPublishedServices();
  const services: MetadataRoute.Sitemap = publishedServices.map((service) => ({
    url: `${base}/services/${service.slug}`,
    lastModified: service.updated_at ? new Date(service.updated_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const policies: MetadataRoute.Sitemap = POLICIES.map((policy) => ({
    url: `${base}/legal/${policy.slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }));

  return [...primary, ...collections, ...services, ...presets, ...policies];
}
