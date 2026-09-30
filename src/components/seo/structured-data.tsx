import { env } from '@/lib/env';
import {
  BUSINESS_NAME,
  SERVICE_AREAS,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from '@/lib/seo/business';

/**
 * JSON-LD emitters.
 *
 * One rule governs every component here: the markup must describe what is
 * VISIBLE on the page it sits on. Google cross-checks, and structured data
 * that contradicts the rendered page is worth less than none — it risks a
 * manual action on top of simply being ignored.
 *
 * That is why, for example, FaqJsonLd takes the same array the page renders
 * rather than its own copy, and ProductJsonLd refuses to emit an offer for a
 * product with no price.
 */

function Ld({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Serialised from an object built on the server, so there is no
      // user-controlled string being injected here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * The site-wide graph: organization, website and local business.
 *
 * Emitted once from the root layout rather than per page. Repeating it on
 * every page adds bytes without adding meaning, and the `@id` references let
 * page-level schema point at it instead of restating it.
 */
export function SiteJsonLd() {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@graph': [organizationSchema(), websiteSchema(), localBusinessSchema()],
      }}
    />
  );
}

/** Kept for the homepage, which historically emitted this on its own. */
export function OrganizationJsonLd() {
  return <Ld data={organizationSchema()} />;
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface Crumb {
  name: string;
  /** Path only, e.g. "/services". Absolute URLs are built here. */
  href: string;
}

/**
 * BreadcrumbList.
 *
 * Google renders these as the path shown under a result instead of a raw URL,
 * which is worth real click-through on deep pages. The last crumb is the
 * current page and still carries an item URL, because omitting it is a common
 * source of validation warnings.
 */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${env.siteUrl}${crumb.href}`,
        })),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export function ServiceJsonLd({
  services,
  name = 'PC and IT services',
}: {
  services: { name: string; short_description?: string; slug?: string }[];
  name?: string;
}) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Custom PC building, computer repair, networking and IT support',
        provider: { '@id': `${env.siteUrl}/#organization` },
        areaServed: SERVICE_AREAS.map((area) => ({ '@type': 'City', name: area })),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name,
          itemListElement: services.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: service.name,
              ...(service.short_description ? { description: service.short_description } : {}),
              ...(service.slug ? { url: `${env.siteUrl}/services/${service.slug}` } : {}),
            },
          })),
        },
      }}
    />
  );
}

/** A single service, for its own page. */
export function SingleServiceJsonLd({
  name,
  description,
  slug,
  priceText,
}: {
  name: string;
  description: string;
  slug: string;
  priceText?: string | null;
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: `${env.siteUrl}/services/${slug}`,
    provider: { '@id': `${env.siteUrl}/#organization` },
    areaServed: SERVICE_AREAS.map((area) => ({ '@type': 'City', name: area })),
  };

  // Only when there is a real figure. Most of this work is quoted after
  // diagnosis, and an invented price in markup is a promise that cannot be
  // kept at the counter.
  if (priceText && /\d/.test(priceText)) {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: 'CAD',
      description: priceText,
      availability: 'https://schema.org/InStock',
    };
  }

  return <Ld data={data} />;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/**
 * Schema.org condition URLs.
 *
 * The mapping matters. Marking a used or open-box unit as NewCondition is a
 * misrepresentation Google acts on, and more importantly it misleads a buyer
 * comparing two prices. `tested` and `used` both map to UsedCondition because
 * schema.org has no finer distinction — the visible page carries the specific
 * wording and the condition notes.
 */
const CONDITION_URL: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  'open-box': 'https://schema.org/NewCondition',
  tested: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
  used: 'https://schema.org/UsedCondition',
};

/**
 * An aggregate rating, only ever built from real reviews.
 *
 * Passed as an explicit object rather than assembled here, so there is no code
 * path that can produce one from nothing. A product with no reviews passes
 * `rating: null` and the property is simply absent from the markup.
 *
 * Emitting `aggregateRating` with `reviewCount: 0`, or with a made-up average,
 * is the single most reliably penalised piece of structured data there is —
 * and in Canada a fabricated rating is a Competition Act problem before it is
 * ever an SEO one.
 */
export interface AggregateRating {
  value: number;
  count: number;
}

export function ProductJsonLd({
  name,
  description,
  sku,
  brand,
  image,
  priceCents,
  condition,
  inStock,
  url,
  rating,
}: {
  name: string;
  description: string;
  sku?: string | null;
  brand?: string | null;
  image?: string | null;
  priceCents: number;
  condition: string;
  inStock: boolean;
  url: string;
  /** Null unless the product has genuine reviews. */
  rating?: AggregateRating | null;
}) {
  // No price means no offer. An offer without a price is invalid markup, and
  // "Ask us" is not a number.
  if (priceCents <= 0) return null;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: `${env.siteUrl}${url}`,
    offers: {
      '@type': 'Offer',
      url: `${env.siteUrl}${url}`,
      priceCurrency: 'CAD',
      price: (priceCents / 100).toFixed(2),
      itemCondition: CONDITION_URL[condition] ?? 'https://schema.org/UsedCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@id': `${env.siteUrl}/#organization` },
    },
  };

  if (sku) data.sku = sku;
  if (brand) data.brand = { '@type': 'Brand', name: brand };
  if (image) data.image = image.startsWith('http') ? image : `${env.siteUrl}${image}`;

  // The count guard is load-bearing, not defensive tidiness. Google requires
  // aggregateRating to have a review count of at least one, and a zero-count
  // rating is the exact shape a manual action gets issued over.
  if (rating && rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return <Ld data={data} />;
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQPage.
 *
 * Takes the same array the page renders. Google requires the marked-up
 * questions and answers to be visible on the page, and passing the rendered
 * data rather than a parallel copy is what guarantees they cannot diverge.
 */
export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Item lists
// ---------------------------------------------------------------------------

/** Orders a listing page's items, which helps Google understand a collection. */
export function ItemListJsonLd({
  items,
  name,
}: {
  items: { name: string; url: string }[];
  name: string;
}) {
  if (items.length === 0) return null;
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: `${env.siteUrl}${item.url}`,
        })),
      }}
    />
  );
}

export { BUSINESS_NAME };
