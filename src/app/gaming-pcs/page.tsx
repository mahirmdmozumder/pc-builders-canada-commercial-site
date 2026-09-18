import type { Metadata } from 'next';
import { ButtonLink, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { PresetCard } from '@/components/build/preset-card';
import { presetsFor } from '@/lib/catalog/presets';
import { summarisePresets } from '@/lib/catalog/preset-summary';

export const metadata: Metadata = {
  title: 'Gaming PC Builds',
  description:
    'Custom gaming PCs built to order in Canada, configured around a resolution and frame rate target. Every configuration is compatibility checked and tested before it ships.',
  alternates: { canonical: '/gaming-pcs' },
};

export const revalidate = 3600;

const CONSIDERATIONS = [
  {
    title: 'Resolution sets the budget split',
    body: 'At 1080p the processor is often the limit; at 4K the graphics card almost always is. Spending in the wrong place buys frames you will not see.',
  },
  {
    title: 'Cache matters for frame rate',
    body: 'Cache-heavy processors show their advantage in simulation-heavy and CPU-bound titles. In GPU-bound settings the difference narrows considerably.',
  },
  {
    title: 'Headroom is cheaper bought once',
    body: 'A power supply and case chosen with room to spare means the next graphics card upgrade is one part, not three.',
  },
  {
    title: 'Cooling decides sustained performance',
    body: 'Peak numbers are easy. What matters is the clock speed still held after an hour, which is a thermal question before it is a silicon one.',
  },
];

export default async function GamingPcsPage() {
  const summaries = await summarisePresets(presetsFor('gaming'));

  return (
    <>
      <PageHeader
        eyebrow="Gaming PCs"
        title="Gaming PCs built around a target"
        description="Each configuration below is aimed at a specific resolution and refresh rate. Load one into the configurator and change any part; the compatibility and power checks follow you."
        actions={
          <>
            <ButtonLink href="/build">Start from scratch</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Ask for advice
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <PresetCard key={summary.preset.slug} summary={summary} />
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-ink-700 bg-ink-850 p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            About these prices
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
            Prices come straight from the parts catalogue and change when it changes. The figure on
            each card is the hardware subtotal; the estimated total adds assembly, shipping and
            provincial tax. Neither is a quote until an order is placed.
          </p>
        </div>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="How we choose parts"
            title="What actually changes frame rate"
            description="The reasoning behind the configurations above, so you can argue with it."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CONSIDERATIONS.map((item) => (
              <div key={item.title} className="rounded-lg border border-ink-700 bg-ink-900 p-6">
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{item.body}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </>
  );
}
