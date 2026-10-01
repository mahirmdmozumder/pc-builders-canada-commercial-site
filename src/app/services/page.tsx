import type { Metadata } from 'next';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { ServiceJsonLd } from '@/components/seo/structured-data';
import Link from 'next/link';
import { listPublishedServices } from '@/lib/cms/repository';
import { ItemListJsonLd } from '@/components/seo/structured-data';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';

export const metadata: Metadata = {
  title: 'PC Repair, Networking, NAS & On-Site IT Services',
  description:
    'PC repair and diagnostics, upgrades, Windows setup, home and office networking, NAS and storage, small servers and Raspberry Pi builds. On-site IT support across the Greater Toronto Area.',
  alternates: { canonical: '/services' },
};

export const dynamic = 'force-static';
export const revalidate = 60;

/**
 * Services, from the database.
 *
 * The content moved out of this file and into the `services` table so it can
 * be edited without a deployment. The in-repo copy in src/content/services.ts
 * is still the seed and the fallback, so a clone with no database configured
 * renders exactly what it always did.
 */
export default async function ServicesPage() {
  const { rows: services } = await listPublishedServices();

  return (
    <>
      <ServiceJsonLd services={services} />
      <ItemListJsonLd
        name="PC and IT services"
        items={services.map((s) => ({ name: s.name, url: `/services/${s.slug}` }))}
      />
      <PageHeader
        eyebrow="Services"
        title="PC, network and IT services"
        description="Repairs and upgrades, networking and Wi-Fi, NAS and storage, small servers and always-on machines. On our bench or at your home or office, with honest advice about when a repair is worth it and when it is not."
        actions={
          <>
            <ButtonLink href="/contact">Book a service</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Ask a question first
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        <div className="mb-8">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Services', href: '/services' },
            ]}
          />
        </div>

        {/*
          An index, not decoration. With thirteen services the breadth of the
          work is the thing a visitor most needs to see, and it is exactly what
          gets lost when they have to scroll through cards one at a time to
          discover that networking and NAS are on the list at all.

          Built from the same rows as the cards below, so a service added in
          the admin appears here too.
        */}
        {services.length > 4 ? (
          <nav aria-label="Services on this page" className="mb-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase gold-rule">
              What we do
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {services.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-block rounded-md border border-ink-700 bg-ink-850 px-3 py-1.5 text-sm text-ink-200 transition-colors hover:border-gold-600/50 hover:text-white"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} id={service.slug} className="scroll-mt-24 p-6">
              <h2 className="text-lg font-semibold text-white">
                <Link href={`/services/${service.slug}`} className="hover:text-gold-400">
                  {service.name}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{service.short_description}</p>
              {service.price_text ? (
                <p className="mt-2 text-sm font-medium text-gold-400">{service.price_text}</p>
              ) : null}

              <ul className="mt-4 space-y-2">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink-200">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              {service.note ? (
                <p className="mt-4 border-t border-ink-700 pt-4 text-sm text-ink-400">
                  {service.note}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16">
          <SectionHeading eyebrow="Pricing" title="How service work is quoted" />
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold text-white">Diagnostics first</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Service work is quoted after we know what is wrong. Quoting a repair before
                diagnosing it either overcharges you or commits us to a price we cannot hold.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Parts at cost plus handling</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                If a repair needs parts, the part price and the labour are listed separately, so you
                can see what you are paying for and source the part yourself if you prefer.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No work without approval</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                You approve the quote before anything is done. If we find something else once the
                machine is open, we come back to you rather than adding it to the bill.
              </p>
            </div>
          </div>

          {/* Reworded from "rates are being finalised", which read as a business
              that had not opened. Quoting per job is a deliberate way to work,
              not an unfinished page, so the copy now says that instead of
              apologising for it. No rate is invented to fill the gap. */}
          <p className="mt-10 max-w-3xl text-sm text-ink-400">
            Every job is quoted individually rather than from a price list, because the same symptom
            can be twenty minutes or an afternoon and a published rate would be wrong in one
            direction or the other. Describe the problem and you get a written quote before any work
            starts &mdash; nothing is charged that you have not agreed to first.
          </p>
          <ButtonLink href="/contact" className="mt-6">
            Describe the problem
          </ButtonLink>
        </PageShell>
      </section>
    </>
  );
}
