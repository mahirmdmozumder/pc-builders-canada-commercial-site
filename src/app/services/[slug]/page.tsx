import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink, Card, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { FaqJsonLd, SingleServiceJsonLd } from '@/components/seo/structured-data';
import { listPublishedServices } from '@/lib/cms/repository';
import { REGION_LABEL, SERVICE_AREAS } from '@/lib/seo/business';
import type { ServiceRecord } from '@/lib/cms/types';

/**
 * One page per service.
 *
 * These exist because search intent is specific. Somebody typing "NAS setup
 * Toronto" wants a page about NAS setup, not a page listing thirteen services
 * with NAS ninth. A single /services page can rank for "IT services Toronto"
 * and almost nothing else; a page per service can each rank for their own
 * thing, and they link to each other.
 *
 * Content comes entirely from the CMS, so adding a service in the admin
 * creates its page, its metadata, its structured data and its sitemap entry
 * with no code change.
 */

export const revalidate = 60;

export async function generateStaticParams() {
  const { rows } = await listPublishedServices();
  return rows.map((service) => ({ slug: service.slug }));
}

async function findService(slug: string): Promise<ServiceRecord | null> {
  const { rows } = await listPublishedServices();
  return rows.find((service) => service.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await findService(slug);
  if (!service) return { title: 'Service not found' };

  // The admin override wins; otherwise the title is built from the service
  // name and the region, which is what somebody is actually searching for.
  const title = service.seo_title ?? `${service.name} in Toronto & the GTA`;
  const description =
    service.seo_description ??
    `${service.short_description} Serving ${SERVICE_AREAS.slice(0, 5).join(', ')} and the wider GTA.`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: `/services/${service.slug}`,
      type: 'website',
      ...(service.image_url ? { images: [{ url: service.image_url }] } : {}),
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await findService(slug);

  // A service that was unpublished should 404 rather than render an empty
  // shell. A soft 404 keeps the URL in the index pointing at nothing.
  if (!service) notFound();

  const { rows: all } = await listPublishedServices();
  const related = all.filter((s) => s.slug !== service.slug).slice(0, 4);

  return (
    <>
      <SingleServiceJsonLd
        name={service.name}
        description={service.short_description}
        slug={service.slug}
        priceText={service.price_text}
      />
      <FaqJsonLd items={service.faqs ?? []} />

      <div className="border-b border-ink-700 bg-ink-850">
        <PageShell className="py-8 sm:py-12">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Services', href: '/services' },
              { name: service.name, href: `/services/${service.slug}` },
            ]}
          />

          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase">
            Service
          </p>
          {/* Exactly one H1, and it carries the service plus the region. */}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {service.name} in {REGION_LABEL}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            {service.short_description}
          </p>
          {service.price_text ? (
            <p className="mt-3 text-sm font-medium text-gold-400">{service.price_text}</p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/contact">Book this service</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Ask a question first
            </ButtonLink>
          </div>
        </PageShell>
      </div>

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-10">
            {service.includes.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-white">What this includes</h2>
                <ul className="mt-5 space-y-3">
                  {service.includes.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-200">
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {service.description ? (
              <section>
                <h2 className="text-xl font-semibold text-white">How it works</h2>
                <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-300">
                  {service.description}
                </p>
              </section>
            ) : null}

            {/* The caveat, given its own weight rather than buried. It is the
                reason these pages read as advice rather than a sales pitch. */}
            {service.note ? (
              <Card className="border-gold-600/30 p-6">
                <h2 className="text-sm font-semibold tracking-wide text-gold-400 uppercase">
                  Worth knowing
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-200">{service.note}</p>
              </Card>
            ) : null}

            {service.faqs?.length ? (
              <section>
                <h2 className="text-xl font-semibold text-white">Common questions</h2>
                <dl className="mt-5 divide-y divide-ink-700 border-t border-ink-700">
                  {service.faqs.map((faq) => (
                    <div key={faq.question} className="py-5">
                      <dt className="font-medium text-white">{faq.question}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-ink-300">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section>
              <h2 className="text-xl font-semibold text-white">Where we work</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">
                We cover Toronto and the surrounding Greater Toronto Area, including{' '}
                {SERVICE_AREAS.slice(1).join(', ')}. Work is done at our bench or at your home or
                office, whichever suits the job &mdash; and we will tell you which one actually
                makes sense rather than defaulting to the more expensive option.
              </p>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Related services
              </h2>
              <ul className="mt-4 space-y-3">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/services/${item.slug}`}
                      className="group block text-sm text-ink-200 hover:text-white"
                    >
                      <span className="font-medium group-hover:text-gold-400">{item.name}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">
                        {item.short_description.slice(0, 90)}
                        {item.short_description.length > 90 ? '…' : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/services"
                className="mt-5 inline-block text-sm font-medium text-gold-400 hover:text-gold-300"
              >
                All services &rarr;
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Buying hardware too?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                We supply the parts as well as fitting them &mdash; switches, NAS enclosures,
                drives, mini PCs and complete machines.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link href="/shop" className="text-gold-400 hover:text-gold-300">
                  Shop hardware
                </Link>
                <Link href="/build" className="text-gold-400 hover:text-gold-300">
                  Build a PC
                </Link>
                <Link href="/gaming-pcs" className="text-gold-400 hover:text-gold-300">
                  Pre-built PCs
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
