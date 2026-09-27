import type { Metadata } from 'next';
import { ButtonLink, Card, EmptyState, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { ProductCard } from '@/components/shop/product-card';
import { getCatalogSource, listComponents } from '@/lib/catalog/repository';
import { CATEGORY_LABELS, type ComponentCategory } from '@/lib/catalog/types';

export const metadata: Metadata = {
  title: 'Refurbished & Open-Box Hardware',
  description:
    'Refurbished and open-box PC components and complete units, tested before listing. Every listing states what was checked, what was replaced and what warranty applies.',
  alternates: { canonical: '/refurbished' },
};

// Refurbished stock is one-of-a-kind and sells out, so this page is checked
// more often than the new-goods collections.
export const revalidate = 600;

/**
 * Refurbished and open-box listings.
 *
 * This page is a filter across every category rather than a category of its
 * own, because condition is a separate axis from what the part is: a
 * refurbished graphics card is still a graphics card, and should appear under
 * both.
 *
 * It ships with nothing listed, and that is the correct initial state rather
 * than an unfinished one. A refurbished listing makes claims about ONE specific
 * physical object — what was tested, what was replaced, what marks it carries.
 * Those claims cannot be seeded from a template without inventing a history for
 * an item that does not exist, which would be a worse kind of fiction than a
 * stale price. Units get listed from /admin/components as they are checked in,
 * where the condition note is a required field.
 */
export default async function RefurbishedPage() {
  const listings = await listComponents({ conditions: ['refurbished', 'open-box'] });
  const sampleData = getCatalogSource() === 'sample';

  // Group by category so a visitor scanning for one kind of part can find it.
  const grouped = new Map<ComponentCategory, typeof listings>();
  for (const item of listings) {
    const bucket = grouped.get(item.category);
    if (bucket) bucket.push(item);
    else grouped.set(item.category, [item]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Refurbished & open box"
        title="Tested hardware, priced accordingly"
        description="Parts and complete units that have been opened, returned or refurbished. Each one is tested before it is listed, and each listing says exactly what was done to it and what warranty it carries."
        actions={
          <>
            <ButtonLink href="/contact">Ask what is coming in</ButtonLink>
            <ButtonLink href="/build" variant="secondary">
              Build with new parts
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        <Card className="p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            How this stock is graded
          </h2>
          <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-ink-100">Open box</dt>
              <dd className="mt-1 leading-relaxed text-ink-300">
                A new unit whose packaging was opened — a return, a display piece or a cancelled
                order. Functionally new, tested before listing, and the listing says why it was
                opened.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-100">Refurbished</dt>
              <dd className="mt-1 leading-relaxed text-ink-300">
                A used unit that has been tested and, where needed, repaired. The listing names what
                was replaced, any cosmetic marks, and the warranty period offered.
              </dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-ink-700 pt-4 text-sm leading-relaxed text-ink-300">
            No grade letters are used here. &ldquo;Grade B&rdquo; means nothing consistent across
            sellers, so every listing describes the actual unit in plain words instead. If a listing
            does not tell you something you need to know, ask and it will be added.
          </p>
        </Card>

        <div className="mt-12">
          {listings.length === 0 ? (
            <EmptyState
              title="Nothing is listed right now"
              description={
                sampleData
                  ? 'Refurbished units are listed individually as they are tested and checked in, which is why none are seeded into the sample catalogue — a listing describes one specific physical unit, and that cannot be honestly filled in ahead of time. Ask what is coming in, or tell us what you are looking for.'
                  : 'Refurbished units are listed individually as they are tested and checked in, and they sell quickly. Ask what is coming in, or tell us what you are looking for and we will hold the next one that matches.'
              }
              action={<ButtonLink href="/contact">Ask what is coming in</ButtonLink>}
            />
          ) : (
            <div className="space-y-14">
              {[...grouped.entries()].map(([category, items]) => (
                <section key={category}>
                  <SectionHeading
                    title={CATEGORY_LABELS[category]}
                    description={`${items.length} ${items.length === 1 ? 'unit' : 'units'} available.`}
                  />
                  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <ProductCard key={item.id} component={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Worth knowing"
            title="Where refurbished is a good idea, and where it is not"
            description="Being straight about this costs one sale and saves several returns."
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

const CONSIDERATIONS = [
  {
    title: 'Good: cases, coolers and monitors',
    body: 'Parts with few wear mechanisms and obvious faults. A case is either bent or it is not, and you can see which. The saving is real and the risk is close to nothing.',
  },
  {
    title: 'Good: last-generation graphics cards',
    body: 'A card one generation back at a proper discount is often better value than a new budget card of the current generation. Ours are tested under sustained load, not just powered on to check they post.',
  },
  {
    title: 'Careful: drives, new or used',
    body: 'A used drive has spent hours you cannot see. We publish the power-on hours from the drive’s own SMART data for any we list, but for anything irreplaceable, buy the drive new and spend the saving on a backup.',
  },
  {
    title: 'Careful: power supplies',
    body: 'Capacitors age, and a failing supply can take other parts with it. We will sell a refurbished unit only from a known quality line and within its warranty period, and we will say no if that is not the case.',
  },
];
