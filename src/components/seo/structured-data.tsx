import { env } from '@/lib/env';

/**
 * Organization structured data.
 *
 * Only facts that are true of the business right now: name, what it does,
 * where it operates, and the site URL. No aggregate ratings, no review
 * counts, no founding date invented to fill a field. Search engines penalise
 * markup that does not match visible content, and more importantly it would
 * be a false claim.
 */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PC Builders Canada',
    url: env.siteUrl,
    description:
      'Custom gaming PCs and workstations built to order in Canada, plus upgrades, hardware diagnostics and Windows setup.',
    areaServed: { '@type': 'Country', name: 'Canada' },
    knowsAbout: [
      'Custom PC building',
      'Gaming PC builds',
      'Workstation PC builds',
      'PC upgrades',
      'Hardware diagnostics',
      'Windows installation',
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Serialised from the object literal above, so there is no
      // user-controlled content in this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Service structured data, built from the services that are actually published.
 *
 * It used to carry a hardcoded list of eight. That drifted the moment services
 * moved into the CMS, and structured data that does not match the visible page
 * is worse than none: search engines penalise the mismatch, and it was
 * advertising a narrower business than the one on the page.
 */
export function ServiceJsonLd({ services }: { services: { name: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Custom PC building, computer repair, networking and IT support',
    provider: { '@type': 'Organization', name: 'PC Builders Canada', url: env.siteUrl },
    areaServed: { '@type': 'Country', name: 'Canada' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'PC and IT services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: service.name },
      })),
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
