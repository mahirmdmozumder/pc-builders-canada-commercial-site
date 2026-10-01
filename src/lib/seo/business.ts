import { env } from '@/lib/env';
import { CHANNELS, HOURS, HOURS_PUBLISHED } from '@/content/business';

/**
 * The facts a search engine is told about this business.
 *
 * ---------------------------------------------------------------------------
 * EVERY FIELD HERE MUST BE TRUE
 * ---------------------------------------------------------------------------
 * Structured data is a set of claims made to Google in a machine-readable
 * form, and Google checks them against the visible page. Inventing an address,
 * opening hours, a rating or a review count is not an SEO tactic — it is a
 * manual-action risk and a lie to customers who act on it.
 *
 * So this file deliberately OMITS more than it states:
 *
 *   no `address`          — there is no public storefront. A service-area
 *                           business without premises must not invent one.
 *   `openingHoursSpecification` appears only while hours are published; it was
 *   absent until the business set them, and withdraws if HOURS_PUBLISHED goes false.
 *   no `aggregateRating`  — no reviews exist. Rating markup without reviews is
 *                           the single most penalised piece of fake schema.
 *   no `sameAs`           — no social profiles are set up yet. The array is
 *                           built from what is configured and dropped when
 *                           empty, rather than pointing at pages that do not
 *                           exist.
 *
 * Each of those appears automatically the moment the underlying fact becomes
 * true in src/content/business.ts.
 */

export const BUSINESS_NAME = 'PC Builders Canada';

/**
 * Where the work is actually done.
 *
 * Listed because the business genuinely travels to these places for on-site
 * work, not to collect city names. There are no per-city landing pages, and
 * there should not be: a page that is another page with the city swapped is a
 * doorway page, and Google has treated them as spam for over a decade.
 */
export const SERVICE_AREAS = [
  'Toronto',
  'North York',
  'Scarborough',
  'Etobicoke',
  'Markham',
  'Richmond Hill',
  'Vaughan',
  'Mississauga',
  'Brampton',
] as const;

export const PRIMARY_AREA = 'Toronto';
export const REGION_LABEL = 'Toronto & the GTA';

/** One sentence describing the business, reused across metadata and schema. */
export const BUSINESS_DESCRIPTION =
  'Custom PC builds, pre-built gaming PCs, computer repair, upgrades, networking, ' +
  'NAS and storage, small servers and on-site IT support across Toronto and the ' +
  'Greater Toronto Area.';

/** Social profiles, only those actually configured. */
function sameAs(): string[] {
  return [CHANNELS.instagram, CHANNELS.facebook, CHANNELS.googleProfileUrl].filter(
    (url): url is string => Boolean(url),
  );
}

/**
 * LocalBusiness rather than plain Organization.
 *
 * `LocalBusiness` is the type Google uses for local results, and the subtype
 * `ComputerStore` is the closest published category to what this business does
 * — it sells hardware and services it on site. `areaServed` carries the
 * geography instead of a postal address, which is the correct shape for a
 * business that travels to the customer.
 */
export function localBusinessSchema() {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ComputerStore'],
    '@id': `${env.siteUrl}/#business`,
    name: BUSINESS_NAME,
    url: env.siteUrl,
    description: BUSINESS_DESCRIPTION,
    logo: `${env.siteUrl}/icon.png`,
    image: `${env.siteUrl}/og-image.png`,
    priceRange: '$$',
    currenciesAccepted: 'CAD',
    areaServed: SERVICE_AREAS.map((name) => ({
      '@type': 'City',
      name,
      containedInPlace: { '@type': 'AdministrativeArea', name: 'Ontario, Canada' },
    })),
  };

  if (CHANNELS.phone) schema.telephone = CHANNELS.phone;
  if (CHANNELS.email) schema.email = CHANNELS.email;

  /**
   * Opening hours, now that there are some.
   *
   * This is the mechanism this module was built around: a fact appears in the
   * markup the moment it becomes true in src/content/business.ts, rather than
   * being invented to fill a schema template. Hours were absent because none
   * were published; they are here because they now are.
   *
   * Closed days are omitted rather than emitted with null times. A
   * specification for Sunday with no opening time is malformed, and the
   * absence of a day already means closed.
   *
   * These are the same hours the contact page prints, from the same table, so
   * the markup cannot drift from the visible page — which is the mismatch
   * Google actually acts on.
   */
  if (HOURS_PUBLISHED) {
    const open = HOURS.filter((day) => day.opens && day.closes);
    if (open.length > 0) {
      schema.openingHoursSpecification = open.map((day) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${day.day}`,
        opens: day.opens,
        closes: day.closes,
      }));
    }
  }

  const profiles = sameAs();
  if (profiles.length > 0) schema.sameAs = profiles;

  return schema;
}

/**
 * Organization, kept separate from LocalBusiness.
 *
 * They describe different things — the company and the place you can buy from
 * — and Google reads them for different features. Both carry an `@id` so the
 * graph links rather than duplicating.
 */
export function organizationSchema() {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${env.siteUrl}/#organization`,
    name: BUSINESS_NAME,
    url: env.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${env.siteUrl}/icon.png`,
      width: 256,
      height: 256,
    },
    description: BUSINESS_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Canada' },
  };

  if (CHANNELS.phone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      telephone: CHANNELS.phone,
      contactType: 'customer service',
      areaServed: 'CA',
      availableLanguage: 'English',
    };
  }

  const profiles = sameAs();
  if (profiles.length > 0) schema.sameAs = profiles;

  return schema;
}

/** The website itself, which is what enables a sitelinks search box later. */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${env.siteUrl}/#website`,
    name: BUSINESS_NAME,
    url: env.siteUrl,
    publisher: { '@id': `${env.siteUrl}/#organization` },
    inLanguage: 'en-CA',
  };
}
