import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { POLICIES } from '@/content/policies';
import {
  listPublishedPortfolio,
  listPublishedPresets,
  listPublishedServices,
} from '@/lib/cms/repository';
import { presetHref } from '@/lib/cms/types';
import { SHOP_COLLECTIONS } from '@/lib/catalog/collections';
import { listComponents } from '@/lib/catalog/repository';
import { productHref } from '@/lib/catalog/types';

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
 * /pos is excluded while the product is in development. It carries
 * `robots: { index: false, follow: true }` of its own, and listing a page in the
 * sitemap while asking crawlers not to index it is a contradiction. It joins the
 * list on the day it is indexable.
 *
 * /scan is excluded too, for a different reason: it is the QR landing page
 * from printed cards, and almost every line on it links to a page that says
 * the same thing at greater length. Indexing it would enter it into
 * competition with /services and the homepage for the same terms. It carries
 * `robots: { index: false, follow: true }` of its own; this is the matching
 * half of that decision.
 */
/**
 * Regenerated hourly rather than only at deploy time.
 *
 * This file reads published services and presets from the database, so baking
 * it once at build meant a service added through the admin never reached the
 * sitemap until the next deployment. That quietly broke the thing the CMS
 * exists for: it happened here, with five new services live on the site while
 * the sitemap still advertised the previous eight.
 *
 * An hour is short enough that a crawler picks new pages up the same day, and
 * long enough that this costs two database queries an hour rather than two per
 * crawler request.
 */
export const revalidate = 3600;

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
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
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
    url: `${base}${presetHref(preset)}`,
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

  /**
   * One entry per published product.
   *
   * These are the pages a specific search actually lands on — somebody typing a
   * model number wants that product's page, not the shop. Before /products/[slug]
   * existed there was nothing here to list, because every product shared the shop
   * URL.
   *
   * Only published, in-catalogue rows: listComponents() reads
   * `components_public`, which filters to published, and an unpublished product's
   * page returns a real 404. Listing it would be a broken promise to a crawler.
   *
   * `lastModified` is the row's own updated_at, so a corrected price or a new
   * photo is a genuine signal to recrawl rather than a date stamped on every URL
   * whenever the sitemap regenerates.
   */
  const products = await listComponents();
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base}${productHref(product)}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: 'weekly' as const,
    // Below the collection pages. A product page is where a specific search
    // should land, but the collections are what a broader one should.
    priority: 0.7,
  }));

  /**
   * One entry per published build write-up.
   *
   * These are genuinely strong pages -- a real machine, photographed, with the
   * reasoning behind its parts -- and until now they had no URL to list. Only
   * published builds, since an unpublished one 404s.
   */
  const portfolio = await listPublishedPortfolio();
  const portfolioPages: MetadataRoute.Sitemap = portfolio.map((build) => ({
    url: `${base}/portfolio/${build.slug}`,
    lastModified: build.updated_at ? new Date(build.updated_at) : now,
    changeFrequency: 'yearly' as const,
    // A finished build does not change. It earns its place by being real, not
    // by being fresh.
    priority: 0.6,
  }));

  const policies: MetadataRoute.Sitemap = POLICIES.map((policy) => ({
    url: `${base}/legal/${policy.slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }));

  return [
    ...primary,
    ...collections,
    ...services,
    ...presets,
    ...productPages,
    ...portfolioPages,
    ...policies,
  ];
}
