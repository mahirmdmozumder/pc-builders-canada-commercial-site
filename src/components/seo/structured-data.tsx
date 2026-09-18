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

export function ServiceJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Custom PC building and computer repair',
    provider: { '@type': 'Organization', name: 'PC Builders Canada', url: env.siteUrl },
    areaServed: { '@type': 'Country', name: 'Canada' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'PC services',
      itemListElement: [
        'Custom PC building',
        'PC upgrades',
        'Hardware diagnostics',
        'Windows installation',
        'Driver and software setup',
        'Performance optimisation',
        'Thermal testing',
        'Hardware troubleshooting',
      ].map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name },
      })),
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
