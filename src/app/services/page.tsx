import type { Metadata } from 'next';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { ServiceJsonLd } from '@/components/seo/structured-data';
import { listPublishedServices } from '@/lib/cms/repository';

export const metadata: Metadata = {
  title: 'PC Services: Upgrades, Diagnostics & Windows Setup',
  description:
    'PC upgrades, hardware diagnostics, Windows installation, driver setup, thermal testing and troubleshooting for machines you already own.',
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
      <ServiceJsonLd />
      <PageHeader
        eyebrow="Services"
        title="Work on machines you already own"
        description="Upgrades, diagnostics, a clean Windows setup and honest advice about when a repair is worth it and when it is not."
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
        <div className="grid gap-5 lg:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} id={service.slug} className="scroll-mt-24 p-6">
              <h2 className="text-lg font-semibold text-white">{service.name}</h2>
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

          <p className="mt-10 max-w-3xl text-sm text-ink-400">
            Service rates are being finalised and are not published here yet. Send a description of
            the problem and you will get a written quote before any work starts.
          </p>
          <ButtonLink href="/contact" className="mt-6">
            Describe the problem
          </ButtonLink>
        </PageShell>
      </section>
    </>
  );
}
