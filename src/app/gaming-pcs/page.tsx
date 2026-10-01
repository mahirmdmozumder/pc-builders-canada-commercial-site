import type { Metadata } from 'next';
import { ButtonLink, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { PresetCard } from '@/components/build/preset-card';
import { listPublishedPresets } from '@/lib/cms/repository';
import { isOrderable, listComponentsWithSource } from '@/lib/catalog/repository';
import { toShopItem } from '@/lib/catalog/shop';
import { ShopCard } from '@/components/shop/shop-card';
import { summarisePresets } from '@/lib/catalog/preset-summary';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { ItemListJsonLd } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Pre-Built Gaming PCs | Toronto & GTA',
  description:
    'Pre-built gaming PCs assembled and tested in Toronto, configured around a resolution and frame rate target. Change any part before you order, or have one built to spec.',
  alternates: { canonical: '/gaming-pcs' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

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
  const [{ rows: presets }, stockedResult] = await Promise.all([
    listPublishedPresets('gaming'),
    // Complete machines bought in and resold. A separate query rather than a
    // join: they live in `components` and have nothing structurally to do with
    // presets beyond both being a finished PC to a customer.
    listComponentsWithSource({ category: 'prebuilt' }),
  ]);

  const summaries = await summarisePresets(presets);
  const stocked = stockedResult.components.map(toShopItem);
  const orderable = isOrderable(stockedResult.source);

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

      {/* Both kinds of machine, because both are items on this list and each
          has its own page. Listing only the presets would advertise half the
          page to a crawler. */}
      <ItemListJsonLd
        name="Pre-built Gaming PCs"
        items={[
          ...stocked.map((item) => ({ name: item.name, url: item.href })),
          ...summaries.map((s) => ({
            name: s.preset.name,
            url: `/pre-built-gaming-pcs/${s.preset.slug}`,
          })),
        ]}
      />
      <PageShell className="py-12 sm:py-16">
        <div className="mb-8">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Pre-built Gaming PCs', href: '/gaming-pcs' },
            ]}
          />
        </div>

        {/* ---------------------------------------------------------------
            In stock now, listed FIRST.
            ---------------------------------------------------------------
            These can be bought today at the price shown, so they go above the
            configurations, which have to be built. Somebody who wants a machine
            this week should not have to scroll past six things that take a week
            to find the one that does not.

            Rendered with the normal ShopCard rather than PresetCard, because
            that is what they are: catalogue products with a stock count and an
            Add to cart button. PresetCard shows a parts breakdown and a
            "View build" link, neither of which applies to a sealed machine.
        --------------------------------------------------------------- */}
        {stocked.length > 0 ? (
          <section className="mb-14">
            <SectionHeading
              eyebrow="In stock"
              title="Ready to ship"
              description="Complete machines we hold in stock, at the price shown. No build time — these go out as they are."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stocked.map((item) => (
                <ShopCard key={item.id} item={item} orderable={orderable} />
              ))}
            </div>
          </section>
        ) : null}

        {summaries.length > 0 ? (
          <section>
            {/* The heading only appears when there is something above it to
                distinguish these FROM. On a page showing only presets it would
                be labelling the single thing on the page. */}
            {stocked.length > 0 ? (
              <SectionHeading
                eyebrow="Built to order"
                title="Configurations you can change"
                description="Each one is a real parts list priced from the current catalogue. Load it in the configurator and swap anything you like."
              />
            ) : null}
            <div
              className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3${stocked.length > 0 ? ' mt-8' : ''}`}
            >
              {summaries.map((summary) => (
                <PresetCard key={summary.preset.slug} summary={summary} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 rounded-lg border border-ink-700 bg-ink-850 p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            About these prices
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
            On the configurations, prices come straight from the parts catalogue and change when it
            changes. The figure on each card is the hardware subtotal; the estimated total adds
            assembly and shipping. Neither is a quote until an order is placed.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
            Machines listed as in stock are priced as sold, and that price does not move with the
            parts catalogue. Shipping is added at checkout.
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
