import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Card, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { ProductGallery } from '@/components/shop/product-gallery';
import { listPublishedPortfolio } from '@/lib/cms/repository';
import { resolveBuild } from '@/lib/catalog/repository';
import { CATEGORY_LABELS, displayName } from '@/lib/catalog/types';
import { REGION_LABEL } from '@/lib/seo/business';
import { formatDate } from '@/lib/utils';
import type { PortfolioBuild } from '@/types/domain';

/**
 * A page per completed build.
 *
 * The portfolio list already held everything needed for one of these — a
 * write-up in `body`, a spec list, several photographs — and had nowhere to put
 * it. The cards were not links because there was no route to link to, so
 * clicking a build did nothing. Everything below renders fields the admin
 * already fills in; no new field was added for this.
 *
 * These are strong pages. A write-up of a real machine, with photographs of it
 * and the reasoning behind its parts, is the kind of page that earns attention
 * on its own — which a listing page summarising four of them cannot.
 */

export const revalidate = 60;

export async function generateStaticParams() {
  const builds = await listPublishedPortfolio();
  return builds.map((build) => ({ slug: build.slug }));
}

async function findBuild(slug: string): Promise<PortfolioBuild | null> {
  const builds = await listPublishedPortfolio();
  return builds.find((build) => build.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const build = await findBuild(slug);
  if (!build) return { title: 'Build not found' };

  const title = build.seo_title ?? `${build.title} | Custom Build`;
  const description = build.seo_description ?? build.summary;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: `/portfolio/${build.slug}` },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: `/portfolio/${build.slug}`,
      type: 'article',
      ...(build.hero_image_url || build.image_urls[0]
        ? { images: [{ url: build.hero_image_url ?? build.image_urls[0] }] }
        : {}),
    },
  };
}

/**
 * Splits a spec line into a label and a value.
 *
 * `component_notes` is a free-text list, and in practice an operator pastes a
 * table into it — "CPU<tab>AMD Ryzen 7 9700X". Where a tab is present the two
 * halves are rendered as a proper spec row; where it is not, the line stands on
 * its own, which is what a heading or a loose note should do.
 *
 * Deliberately does not reinterpret or tidy the text. It is the operator's own
 * wording and a page is the wrong place to second-guess it.
 */
function splitSpecLine(note: string): { label: string; value: string } | null {
  const parts = note.split('\t').map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? { label: parts[0], value: parts[1] } : null;
}

export default async function PortfolioBuildPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const build = await findBuild(slug);

  // A real 404 for an unpublished or missing build, rather than an empty shell.
  if (!build) notFound();

  const all = await listPublishedPortfolio();
  const others = all.filter((entry) => entry.slug !== build.slug).slice(0, 3);

  // Only when the build was recorded against catalogue rows. Most write-ups use
  // the free-text list instead, because the parts in a machine built a year ago
  // are not always still in the catalogue.
  const { build: resolved } = build.items.length > 0
    ? await resolveBuild(build.items)
    : { build: [] };

  const specRows = build.component_notes?.map((note) => ({ note, split: splitSpecLine(note) })) ?? [];

  return (
    <>
      <div className="border-b border-ink-700 bg-ink-850">
        <PageShell className="py-8 sm:py-12">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Portfolio', href: '/portfolio' },
              { name: build.title, href: `/portfolio/${build.slug}` },
            ]}
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Completed build</Badge>
                {build.customer_type ? <Badge tone="neutral">{build.customer_type}</Badge> : null}
              </div>

              <p className="mt-4 text-xs tracking-[0.14em] text-gold-400 uppercase">
                {build.purpose}
              </p>
              {/* Exactly one H1, and it is the build's name. */}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {build.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-300">{build.summary}</p>

              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-700 pt-5 text-sm">
                {build.completed_on ? (
                  <div>
                    <dt className="text-xs tracking-wide text-ink-400 uppercase">Completed</dt>
                    <dd className="mt-1 text-ink-100">{formatDate(build.completed_on)}</dd>
                  </div>
                ) : null}
                {build.image_urls.length > 0 ? (
                  <div>
                    <dt className="text-xs tracking-wide text-ink-400 uppercase">Photos</dt>
                    <dd className="tnum mt-1 text-ink-100">{build.image_urls.length}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/build">Build something like this</ButtonLink>
                <ButtonLink href="/quote" variant="secondary">
                  Ask about a build
                </ButtonLink>
              </div>
            </div>

            {/* `fit="cover"` because these are photographs of a machine in a
                room, not product shots cut out on white. Letterboxing them over
                a light panel would look like a mistake. */}
            <ProductGallery
              imageUrl={build.hero_image_url ?? build.image_urls[0] ?? null}
              galleryUrls={build.image_urls}
              videoUrl={null}
              alt={build.title}
              category="case"
              fit="cover"
            />
          </div>
        </PageShell>
      </div>

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-10">
            {build.body ? (
              <section>
                <h2 className="text-xl font-semibold text-white">The build</h2>
                {/* whitespace-pre-line so the paragraph breaks the operator
                    typed survive. Nothing richer: this is not trusted HTML. */}
                <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-300">
                  {build.body}
                </p>
              </section>
            ) : null}

            {specRows.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-white">What went into it</h2>
                <dl className="mt-5 divide-y divide-ink-700 border-t border-ink-700 text-sm">
                  {specRows.map(({ note, split }) =>
                    split ? (
                      <div
                        key={note}
                        className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4"
                      >
                        <dt className="text-ink-400">{split.label}</dt>
                        <dd className="font-medium text-ink-100">{split.value}</dd>
                      </div>
                    ) : (
                      // A line with no tab is a heading or a loose note. Shown as
                      // written rather than forced into a two-column row.
                      <p key={note} className="py-2.5 text-xs tracking-wide text-ink-500 uppercase">
                        {note}
                      </p>
                    ),
                  )}
                </dl>
              </section>
            ) : null}

            {/* Only for a build recorded against catalogue rows, so the parts
                link to products still on sale. */}
            {resolved.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-white">Parts from the catalogue</h2>
                <dl className="mt-5 divide-y divide-ink-700 border-t border-ink-700 text-sm">
                  {resolved.map((item) => (
                    <div key={item.component.id} className="flex justify-between gap-6 py-3">
                      <dt className="shrink-0 text-ink-400">
                        {CATEGORY_LABELS[item.category]}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </dt>
                      <dd className="text-right font-medium text-ink-100">
                        {displayName(item.component)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {/* Rendered only when the operator has actually measured something.
                An empty "performance" section would invite filling in with
                numbers nobody took. */}
            {build.verified_performance_notes ? (
              <Card className="border-gold-600/30 p-6">
                <h2 className="text-sm font-semibold tracking-wide text-gold-400 uppercase">
                  Measured on this machine
                </h2>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-200">
                  {build.verified_performance_notes}
                </p>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Want one like it?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Every part here can be specified in the configurator, with socket, memory, clearance
                and power checked as you choose. Or describe what the machine is for and the parts
                list follows from that.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="/build" className="text-gold-400 hover:text-gold-300">
                  Open the configurator
                </Link>
                <Link href="/quote" className="text-gold-400 hover:text-gold-300">
                  Get a written quote
                </Link>
                <Link href="/gaming-pcs" className="text-gold-400 hover:text-gold-300">
                  See pre-built machines
                </Link>
              </div>
            </Card>

            {others.length > 0 ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Other builds
                </h2>
                <ul className="mt-4 space-y-3">
                  {others.map((other) => (
                    <li key={other.id}>
                      <Link href={`/portfolio/${other.slug}`} className="group block text-sm">
                        <span className="font-medium text-ink-100 group-hover:text-gold-400">
                          {other.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">
                          {other.purpose}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/portfolio"
                  className="mt-5 inline-block text-sm font-medium text-gold-400 hover:text-gold-300"
                >
                  All builds &rarr;
                </Link>
              </Card>
            ) : null}

            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Built and supported locally
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Assembled, cabled and tested before it leaves, then delivered and set up in person
                across {REGION_LABEL} or shipped Canada-wide.
              </p>
            </Card>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
