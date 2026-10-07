import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Card, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { ProductJsonLd } from '@/components/seo/structured-data';
import { BuildImage } from '@/components/shop/product-image';
import { listPublishedPresets } from '@/lib/cms/repository';
import { resolveBuild } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { assemblyFeeFor, priceBuild } from '@/lib/pricing/pricing';
import { CATEGORY_LABELS, displayName } from '@/lib/catalog/types';
import { PRESET_AUDIENCE_LABELS } from '@/lib/cms/types';
import { REGION_LABEL } from '@/lib/seo/business';
import { formatMoney } from '@/lib/utils';
import { presetHref } from '@/lib/cms/types';

/**
 * A page per pre-built machine, for both audiences.
 *
 * Before this, a preset existed only as /build?preset=slug. Google largely
 * ignores query-parameter URLs for indexing, so machines with genuinely
 * distinct specifications had no page that could rank for anything.
 *
 * Each page is built from the same catalogue rows the configurator uses, so
 * the parts list, the price and the compatibility verdict are the ones a
 * customer would get by loading it — there is no second copy of the data to
 * drift.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS LIVES HERE RATHER THAN IN A ROUTE
 * ---------------------------------------------------------------------------
 * Two routes serve it: /pre-built-gaming-pcs/[slug] and /workstations/[slug].
 * Every preset used to sit under the gaming path regardless of audience, so
 * /pre-built-gaming-pcs/creator-workstation was a page whose own title read
 * "Workstation PC" — a link that contradicted itself when shared, and a gaming
 * URL offered to a search engine for the higher-value of the two searches.
 *
 * The routes differ only in which slugs they pre-render and where they send a
 * slug belonging to the other audience. Keeping one implementation is what
 * stops the two pages drifting apart.
 */

export async function loadPreset(slug: string) {
  const { rows } = await listPublishedPresets();
  const preset = rows.find((p) => p.slug === slug);
  if (!preset) return null;

  const { build } = await resolveBuild(preset.items);
  const price = priceBuild(build);
  const report = checkCompatibility(build);

  return { preset, build, price, report, siblings: rows.filter((p) => p.slug !== slug) };
}

export async function presetMetadata(slug: string): Promise<Metadata> {
  const data = await loadPreset(slug);
  if (!data) return { title: 'Build not found' };

  const { preset, build, price } = data;
  const cpu = build.find((b) => b.category === 'cpu');
  const gpu = build.find((b) => b.category === 'gpu');

  // A title built from the actual parts, so no two of these are alike.
  const audience =
    preset.audience === 'workstation' ? 'Workstation PC' : 'Pre-Built Gaming PC';
  const title = preset.seo_title ?? `${preset.name} | ${audience}`;

  const specs = [cpu && displayName(cpu.component), gpu && displayName(gpu.component)]
    .filter(Boolean)
    .join(' · ');

  const description =
    preset.seo_description ??
    `${preset.tagline} ${specs ? `${specs}. ` : ''}Assembled, cabled and tested in ${REGION_LABEL}. From ${formatMoney(price.subtotalCents + assemblyFeeFor(price.subtotalCents), { whole: true })}.`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: presetHref(preset) },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: presetHref(preset),
      type: 'website',
      ...(preset.hero_image_url ? { images: [{ url: preset.hero_image_url }] } : {}),
    },
  };
}

/**
 * The body of a pre-built machine's page, shared by both audiences.
 *
 * Both routes render this. What differs between them is only which slugs they
 * pre-render and where a slug belonging to the other audience is redirected —
 * the page itself is the same, because a workstation and a gaming PC are the
 * same kind of thing to a customer reading a spec sheet.
 */
export async function PresetDetail({ slug }: { slug: string }) {
  const data = await loadPreset(slug);
  if (!data) notFound();

  const { preset, build, price, report, siblings } = data;
  const totalCents = price.subtotalCents + assemblyFeeFor(price.subtotalCents);
  const inStock = build.every((item) => item.component.stock_quantity >= item.quantity);

  return (
    <>
      {/* Only emitted when the machine actually prices. A build whose parts
          have been discontinued has no honest offer to advertise. */}
      {price.subtotalCents > 0 ? (
        <ProductJsonLd
          name={preset.name}
          description={preset.tagline}
          brand="PC Builders Canada"
          image={preset.hero_image_url}
          priceCents={totalCents}
          condition="new"
          inStock={inStock}
          url={`/pre-built-gaming-pcs/${preset.slug}`}
        />
      ) : null}

      <div className="border-b border-ink-700 bg-ink-850">
        <PageShell className="py-8 sm:py-12">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Pre-built Gaming PCs', href: '/gaming-pcs' },
              { name: preset.name, href: `/pre-built-gaming-pcs/${preset.slug}` },
            ]}
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{PRESET_AUDIENCE_LABELS[preset.audience]}</Badge>
                {report.failures.length === 0 ? (
                  <Badge tone="ok">Compatibility checks pass</Badge>
                ) : (
                  <Badge tone="warn">Review before ordering</Badge>
                )}
                {!inStock ? <Badge tone="warn">Some parts on order</Badge> : null}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {preset.name}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-ink-300">{preset.tagline}</p>

              <div className="mt-6 border-t border-ink-700 pt-5">
                <p className="text-xs tracking-wide text-ink-400 uppercase">Price</p>
                <p className="tnum mt-1 text-3xl font-semibold text-white">
                  {formatMoney(totalCents)}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {formatMoney(price.subtotalCents)} in parts plus{' '}
                  {formatMoney(assemblyFeeFor(price.subtotalCents))} assembly, cabling and testing.
                  Shipping and tax are added at checkout.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={`/build?preset=${preset.slug}`} size="lg">
                  Configure &amp; order
                </ButtonLink>
                <ButtonLink href="/quote" variant="secondary" size="lg">
                  Ask about this build
                </ButtonLink>
              </div>
              <p className="mt-3 text-xs text-ink-400">
                Every part can be changed before you order, and the compatibility and power checks
                follow you as you do.
              </p>
            </div>

            <BuildImage
              src={preset.hero_image_url ?? preset.gallery_urls?.[0] ?? null}
              alt={`${preset.name} pre-built PC`}
              galleryCount={Math.max(0, (preset.gallery_urls?.length ?? 0) - 1)}
              priority
            />
          </div>
        </PageShell>
      </div>

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-white">Full specification</h2>
              <dl className="mt-5 divide-y divide-ink-700 border-t border-ink-700 text-sm">
                {build.map((item) => (
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

            {preset.rationale ? (
              <section>
                <h2 className="text-xl font-semibold text-white">Why these parts</h2>
                <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-300">
                  {preset.rationale}
                </p>
              </section>
            ) : null}

            {preset.highlights?.length ? (
              <section>
                <h2 className="text-xl font-semibold text-white">What this machine is for</h2>
                <ul className="mt-5 space-y-3">
                  {preset.highlights.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-200">
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h2 className="text-xl font-semibold text-white">Power and cooling</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">
                Estimated draw is{' '}
                <span className="tnum text-ink-100">{report.power.estimatedWatts} W</span> under
                load, against a recommended supply of{' '}
                <span className="tnum text-ink-100">{report.power.recommendedPsuWatts} W</span>.
                These are calculated from component data rather than measured on this machine, and
                the configurator shows the breakdown part by part.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">Built and supported locally</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">
                Assembled, cabled and tested before it leaves, then shipped Canada-wide or
                delivered and set up in person across {REGION_LABEL}. If something goes wrong
                later, the same person who built it is the one who looks at it &mdash; see{' '}
                <Link href="/services/diagnostics" className="text-gold-400 hover:text-gold-300">
                  diagnostics
                </Link>{' '}
                and{' '}
                <Link href="/services/onsite-it" className="text-gold-400 hover:text-gold-300">
                  on-site support
                </Link>
                .
              </p>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {siblings.length > 0 ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Other builds
                </h2>
                <ul className="mt-4 space-y-3">
                  {siblings.slice(0, 5).map((other) => (
                    <li key={other.id}>
                      <Link
                        href={`/pre-built-gaming-pcs/${other.slug}`}
                        className="group block text-sm"
                      >
                        <span className="font-medium text-ink-100 group-hover:text-gold-400">
                          {other.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">
                          {other.tagline}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Prefer to design your own?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Start from nothing and pick every part, with socket, memory, clearance and power
                checked as you go.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link href="/build" className="text-gold-400 hover:text-gold-300">
                  Open the configurator
                </Link>
                <Link href="/shop" className="text-gold-400 hover:text-gold-300">
                  Shop parts
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
