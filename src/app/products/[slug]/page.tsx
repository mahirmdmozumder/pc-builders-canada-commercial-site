import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { ProductJsonLd } from '@/components/seo/structured-data';
import { ProductGallery } from '@/components/shop/product-gallery';
import { BuyBox } from '@/components/shop/buy-box';
import { ShopCard } from '@/components/shop/shop-card';
import { RecentlyViewed } from '@/components/shop/recently-viewed';
import { ReviewSection } from '@/components/reviews/review-section';
import { Stars } from '@/components/reviews/stars';
import {
  getCatalogSource,
  getComponentBySlug,
  isOrderable,
  listComponents,
  relatedComponents,
} from '@/lib/catalog/repository';
import { buildSpecSheet } from '@/lib/catalog/spec-sheet';
import { toShopItem } from '@/lib/catalog/shop';
import {
  CATEGORY_LABELS,
  CONDITION_DESCRIPTIONS,
  CONDITION_LABELS,
  displayName,
  productHref,
  stockState,
  type PublicComponent,
} from '@/lib/catalog/types';
import { loadProductReviews } from '@/lib/reviews/repository';
import { REGION_LABEL } from '@/lib/seo/business';
import { formatMoney } from '@/lib/utils';
import { specChips } from '@/components/configurator/spec-chips';

/**
 * A page per product.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Before this, clicking a product in the shop ran a SEARCH for its own name.
 * Every product on the site shared one indexable URL, so a page for a specific
 * drive or switch could not rank for that drive or switch, the gallery images an
 * admin had already been able to upload were never rendered anywhere, and there
 * was nowhere to put a specification sheet or a review.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE DATA COMES FROM
 * ---------------------------------------------------------------------------
 * One row of `components_public`, plus reviews. Nothing is duplicated into
 * another table and nothing is authored here: the specification sheet is derived
 * from whatever columns and `specs` keys the row actually holds, the price and
 * stock are the live ones, and the rating is computed by Postgres over real
 * reviews. A field with no value produces no row rather than an em dash.
 *
 * ---------------------------------------------------------------------------
 * RENDERING, AND THE COOKIE THIS PAGE MUST NOT READ
 * ---------------------------------------------------------------------------
 * Statically generated per product with a short revalidation window, the same as
 * every other catalogue page.
 *
 * That is conditional on this file never reading the session. It did at first —
 * to render "your review" and the verified-purchase hint — and the result was that
 * the whole route came out of the build marked dynamic. Reading a cookie anywhere
 * in a server component opts the entire page out of static rendering, so every
 * visitor and every crawler got a fresh server render and the revalidate window
 * below did nothing.
 *
 * Those two facts are per-visitor and are fetched by the browser instead, from
 * /api/reviews/mine. Same reasoning as useClientSession in the header: keep the
 * cookie read out of the page so the page can be cached.
 */

// Matches the other catalogue pages. Admin writes call revalidateStorefront()
// for the immediate case; this is the backstop for changes made straight to the
// database, where no application code runs. See lib/catalog/revalidate.ts.
export const revalidate = 60;

/**
 * Prebuild a page for everything currently in the catalogue.
 *
 * `dynamicParams` is left at its default of true, which is the part that makes
 * this safe: a product added through the admin AFTER a deploy is not in this list,
 * renders on first request, and is then cached. It does not 404. Pre-generating
 * without that would recreate exactly the failure that bit the sitemap — new CMS
 * content invisible until the next deployment.
 *
 * So this is purely a warm cache for the products that exist at build time, which
 * is the set a crawler will hit first. A few dozen rows costs almost nothing to
 * prebuild.
 *
 * It also serves as a build-time assertion. A page that reads cookies cannot be
 * prerendered, so if a session read ever creeps back into this file the build
 * stops being able to do this and the route silently reverts to rendering per
 * request for every visitor. That is what happened in the first draft of this
 * page.
 */
export async function generateStaticParams() {
  const products = await listComponents();
  return products.map((product) => ({ slug: product.slug || product.id }));
}

async function load(slug: string) {
  const product = await getComponentBySlug(slug);
  if (!product) return null;

  // Reviews and related products are independent reads, so they overlap rather
  // than queueing.
  const [reviewData, related] = await Promise.all([
    loadProductReviews(product.id),
    relatedComponents(product, 8),
  ]);

  return { product, reviewData, related };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getComponentBySlug(slug);
  if (!product) return { title: 'Product not found' };

  const name = displayName(product);
  const category = CATEGORY_LABELS[product.category] ?? product.category;

  // The admin override wins. Otherwise the title is built from the product and
  // its category, which is what somebody searching for it actually types — and
  // no two products in the catalogue produce the same string.
  const title = product.seo_title ?? `${name} | ${category}`;

  const condition =
    product.condition === 'new' ? '' : `${CONDITION_LABELS[product.condition]}. `;

  // The admin override first, then the product's own copy, then a sentence built
  // from the row. The last one is a fallback for a product with no description at
  // all; it states the category and the region and claims nothing else.
  const description =
    product.seo_description ||
    (product.short_description ?? product.description).trim() ||
    `${name}. ${condition}Supplied and installed across ${REGION_LABEL}.`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: productHref(product) },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: productHref(product),
      type: 'website',
      ...(product.image_url ? { images: [{ url: product.image_url }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);

  // A real 404, not an empty shell. An unpublished or archived product must not
  // leave a live URL in the index pointing at nothing.
  if (!data) notFound();

  const { product, reviewData, related } = data;
  const { reviews, stats, truncated } = reviewData;

  const name = displayName(product);
  const orderable = isOrderable(getCatalogSource());
  const stock = stockState(product);
  const groups = buildSpecSheet(product);
  const chips = specChips(product);

  const unverified = product.specs?.unverified;
  const priceChecked = product.specs?.price_checked;

  return (
    <>
      <ProductJsonLd
        name={name}
        description={product.short_description ?? product.description}
        sku={product.sku}
        brand={product.brand}
        image={product.image_url}
        priceCents={product.price_cents}
        condition={product.condition}
        inStock={product.stock_quantity > 0}
        url={productHref(product)}
        // Only ever the real figure. Null when nobody has reviewed this, and the
        // property is then absent from the markup entirely.
        rating={stats ? { value: stats.average_rating, count: stats.review_count } : null}
      />

      <PageShell className="py-6 sm:py-10">
        <Breadcrumbs
          crumbs={[
            { name: 'Home', href: '/' },
            { name: 'Shop', href: '/shop' },
            {
              name: CATEGORY_LABELS[product.category] ?? product.category,
              // Back to the shop filtered to this category, which is a real
              // page rather than a category route that may not exist.
              href: `/shop?c=${encodeURIComponent(categoryFilterSlug(product))}`,
            },
            { name: name, href: productHref(product) },
          ]}
        />

        {/* --- main product section ---------------------------------------- */}
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
          <ProductGallery
            imageUrl={product.image_url}
            galleryUrls={product.gallery_urls ?? []}
            videoUrl={product.video_url}
            alt={name}
            category={product.category}
          />

          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{CATEGORY_LABELS[product.category] ?? product.category}</Badge>
              {product.condition !== 'new' ? (
                <span title={CONDITION_DESCRIPTIONS[product.condition]}>
                  <Badge tone="warn">{CONDITION_LABELS[product.condition]}</Badge>
                </span>
              ) : null}
              {product.featured ? <Badge tone="ok">Featured</Badge> : null}
            </div>

            {product.brand ? (
              <p className="mt-4 text-xs tracking-[0.14em] text-gold-400 uppercase">
                {product.brand}
              </p>
            ) : null}

            {/* Exactly one H1, and it is the product name. */}
            <h1 className="mt-1.5 text-2xl leading-snug font-semibold tracking-tight text-white sm:text-3xl">
              {name}
            </h1>

            <p className="mt-2 font-mono text-xs text-ink-500">SKU {product.sku}</p>

            {/* The rating, linked to the section rather than repeated. Absent
                entirely when there are no reviews — a greyed-out five stars
                still reads as a rating. */}
            {stats ? (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white"
              >
                <Stars rating={stats.average_rating} size="sm" />
                <span className="tnum">
                  {stats.average_rating} ({stats.review_count})
                </span>
              </a>
            ) : null}

            {product.short_description ? (
              <p className="mt-4 text-base leading-relaxed text-ink-300">
                {product.short_description}
              </p>
            ) : null}

            {chips.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded border border-ink-700 bg-ink-850 px-2 py-0.5 text-xs text-ink-200"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* --- price and availability ---------------------------------- */}
            <div className="mt-6 border-t border-ink-700 pt-5">
              <p className="tnum text-3xl font-semibold text-white">
                {product.price_cents > 0 ? formatMoney(product.price_cents) : 'Ask us'}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Canadian dollars. Shipping and tax are added at checkout.
                {typeof priceChecked === 'string' ? ` Price checked ${priceChecked}.` : ''}
              </p>

              <p className="mt-3 flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={
                    stock === 'out'
                      ? 'size-2 rounded-full bg-ink-500'
                      : stock === 'low'
                        ? 'size-2 rounded-full bg-warn-400'
                        : 'size-2 rounded-full bg-ok-400'
                  }
                />
                {stock === 'out' ? (
                  <span className="text-ink-300">Out of stock</span>
                ) : stock === 'low' ? (
                  <span className="tnum text-warn-400">
                    Low stock &mdash; only {product.stock_quantity} left
                  </span>
                ) : (
                  <span className="text-ok-400">In stock</span>
                )}
              </p>
            </div>

            <div className="mt-5">
              <BuyBox
                componentId={product.id}
                name={name}
                priceCents={product.price_cents}
                stockQuantity={product.stock_quantity}
                orderable={orderable}
              />
            </div>

            {/* --- the caveats, next to the price and not buried ------------ */}
            {product.condition !== 'new' && product.condition_notes ? (
              <Card className="mt-4 border-warn-500/30 p-4">
                <p className="text-xs font-semibold tracking-wide text-warn-400 uppercase">
                  {CONDITION_LABELS[product.condition]} &mdash; what that means here
                </p>
                {/* Printed word for word, not summarised into a grade. The whole
                    value of a lower price is the buyer knowing why it is lower. */}
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  {product.condition_notes}
                </p>
              </Card>
            ) : null}

            {typeof unverified === 'string' ? (
              <p className="mt-4 rounded-md border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs leading-relaxed text-ink-400">
                <span className="font-medium text-ink-200">Unverified:</span> {unverified} Ask us and
                we will confirm it against the manufacturer sheet before you order.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/quote" className="text-gold-400 hover:text-gold-300">
                Ask about this product
              </Link>
              <Link href="/build" className="text-gold-400 hover:text-gold-300">
                Use it in a build
              </Link>
            </div>
          </div>
        </div>
      </PageShell>

      <PageShell className="pb-16 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-12">
            {/* --- description ------------------------------------------- */}
            {product.description ? (
              <section>
                <h2 className="text-xl font-semibold text-white">About this product</h2>
                {/* whitespace-pre-line so paragraph breaks an admin typed
                    survive, and no truncation: the full description is the
                    point of having one. */}
                <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-300">
                  {product.description}
                </p>
              </section>
            ) : null}

            {/* --- specifications ---------------------------------------- */}
            {groups.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-white">Specifications</h2>
                <p className="mt-2 text-xs text-ink-400">
                  {product.data_confidence === 'verified'
                    ? 'Read from the manufacturer or retailer listing for this model.'
                    : 'Recorded from the supplier listing. Anything marked unverified above has not been confirmed against a manufacturer sheet.'}
                </p>

                <div className="mt-5 space-y-8">
                  {groups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
                        {group.title}
                      </h3>
                      {/* A definition list, not a table. There are two columns
                          and no column relationships, which is what a dl is for
                          — and it collapses to stacked rows on a phone without
                          a horizontal scrollbar. */}
                      <dl className="mt-3 divide-y divide-ink-700 border-t border-ink-700 text-sm">
                        {group.rows.map((row) => (
                          <div
                            key={`${group.title}-${row.label}`}
                            className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-4"
                          >
                            <dt className="text-ink-400">
                              {row.label}
                              {row.checked ? (
                                <span
                                  title="Used by the compatibility checker when you put this in a build."
                                  className="ml-1.5 text-gold-500"
                                  aria-label="checked by the compatibility engine"
                                >
                                  &bull;
                                </span>
                              ) : null}
                            </dt>
                            <dd className="font-medium text-ink-100">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-ink-500">
                  <span className="text-gold-500">&bull;</span> marks a figure the compatibility
                  checker compares when this part goes into a build.
                </p>
              </section>
            ) : null}

            {/* --- reviews ------------------------------------------------ */}
            <ReviewSection
              componentId={product.id}
              productName={name}
              reviews={reviews}
              stats={stats}
              truncated={truncated}
              productHref={productHref(product)}
            />
          </div>

          {/* --- sidebar -------------------------------------------------- */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Buying this from us
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-300">
                <li>
                  Fitted and configured if you want it done for you, across {REGION_LABEL}.
                </li>
                <li>
                  Compatibility checked against your existing machine before you order &mdash; ask
                  rather than guess.
                </li>
                <li>Shipped Canada-wide, or collected and set up in person locally.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link href="/services/upgrades" className="text-gold-400 hover:text-gold-300">
                  Fitting service
                </Link>
                <Link href="/contact" className="text-gold-400 hover:text-gold-300">
                  Talk to us
                </Link>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Keep browsing
              </h2>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link
                  href={`/shop?c=${encodeURIComponent(categoryFilterSlug(product))}`}
                  className="text-gold-400 hover:text-gold-300"
                >
                  More {(CATEGORY_LABELS[product.category] ?? '').toLowerCase()}
                </Link>
                <Link href="/shop" className="text-gold-400 hover:text-gold-300">
                  The whole catalogue
                </Link>
                <Link href="/gaming-pcs" className="text-gold-400 hover:text-gold-300">
                  Pre-built machines
                </Link>
              </div>
            </Card>
          </aside>
        </div>

        {/* --- related -------------------------------------------------- */}
        {related.length > 0 ? (
          <section className="mt-16" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-xl font-semibold text-white">
              You may also like
            </h2>
            <p className="mt-2 text-sm text-ink-400">
              Same category first, then the parts that usually go with it.
            </p>
            {/* The existing shop card, unchanged. Two card designs for the same
                product is how a grid ends up inconsistent. */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((item) => (
                <ShopCard key={item.id} item={toShopItem(item)} orderable={orderable} />
              ))}
            </div>
          </section>
        ) : null}

        {/* --- recently viewed ------------------------------------------ */}
        <div className="mt-16">
          <RecentlyViewed
            current={{
              href: productHref(product),
              name,
              priceCents: product.price_cents,
              imageUrl: product.image_url,
              at: 0,
            }}
          />
        </div>
      </PageShell>
    </>
  );
}

/**
 * Which shop filter a category belongs under.
 *
 * The shop's tiles are saved filters, not a one-to-one map of database
 * categories — a PoE switch is still a switch, and `components` is one tile
 * covering nine categories. So a breadcrumb for a CPU links to the components
 * tile rather than inventing a `/shop?c=cpu` that matches no filter and silently
 * falls back to Everything.
 */
function categoryFilterSlug(product: PublicComponent): string {
  switch (product.category) {
    case 'networking':
      return 'networking';
    case 'nas':
      return 'nas';
    case 'mini-pc':
      return 'mini-pcs';
    case 'monitor':
    case 'accessory':
    case 'os':
    case 'other':
      return 'all';
    default:
      return 'components';
  }
}

