import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, EmptyState, PageHeader, PageShell } from '@/components/ui';
import { ShopCard } from '@/components/shop/shop-card';
import { isOrderable, getCatalogSource } from '@/lib/catalog/repository';
import {
  SHOP_FILTERS,
  findShopFilter,
  findSubCategory,
  loadShopCatalogue,
  rotateShopItems,
  type ShopItem,
} from '@/lib/catalog/shop';
import { CATEGORY_LABELS, COMPONENT_CONDITIONS, CONDITION_LABELS } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';

export const metadata: Metadata = {
  title: 'Shop PC Parts, Pre-built PCs, Networking & NAS | Toronto',
  description:
    'Pre-built PCs, components, networking switches, NAS enclosures, drives, mini PCs and open-box hardware. Supplied and supported across the Greater Toronto Area.',
  alternates: { canonical: '/shop' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

const PAGE_SIZE = 24;

/**
 * The shop.
 *
 * One page listing everything on sale, rather than a category page per kind of
 * product. Somebody browsing should not have to guess which of six routes has
 * the thing they want.
 *
 * All state lives in the URL: filter, search, condition, sort and page. That
 * makes every view shareable and linkable, it works with the back button, and
 * the page stays a server component with no client-side catalogue to hydrate.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const activeFilter = findShopFilter(one('c'));
  // Resolved against the active filter, so a stale `?sub=` from a shared link
  // falls back to the whole filter rather than an empty grid.
  const subCategory = findSubCategory(activeFilter, one('sub'));
  const query = (one('q') ?? '').trim();
  const condition = one('condition') ?? 'all';
  const sort = one('sort') ?? 'featured';
  const page = Math.max(1, Number(one('page') ?? '1') || 1);

  const { items, sample } = await loadShopCatalogue();
  const orderable = isOrderable(getCatalogSource());

  let visible = items.filter(activeFilter.matches);

  // Narrows within the filter rather than replacing it, so "PC components" plus
  // "Graphics card" means graphics cards that are also components -- which keeps
  // the parent count honest as the sum of its children.
  if (subCategory) {
    visible = visible.filter((item) => item.category === subCategory);
  }

  if (condition !== 'all') {
    visible = visible.filter((item) => item.condition === condition);
  }

  if (query) {
    // Brand, model, category and description, so "tplink", "switch" and
    // "8-port" all find the same thing.
    const needle = query.toLowerCase();
    visible = visible.filter((item) =>
      `${item.name} ${item.brand ?? ''} ${item.categoryLabel} ${item.description}`
        .toLowerCase()
        .includes(needle),
    );
  }

  visible = sortItems(visible, sort);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Rebuilds the query string, dropping defaults so URLs stay short. */
  function hrefWith(changes: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      c: activeFilter.slug,
      // Carried, so changing the sort or paging does not silently drop the
      // chosen subcategory. Cleared explicitly by the category tiles below,
      // because a subcategory of one filter is meaningless under another.
      sub: subCategory ?? undefined,
      q: query || undefined,
      condition: condition === 'all' ? undefined : condition,
      sort: sort === 'featured' ? undefined : sort,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === 'c' && value === 'all')) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/shop?${qs}` : '/shop';
  }

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Everything we supply"
        description="Pre-built PCs, parts, networking, storage and small machines in one place. Anything here can be supplied on its own, or installed and configured as a service."
        actions={
          <>
            <ButtonLink href="/build">Build your own</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Ask for a quote
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-8 sm:py-12">
        <div className="mb-6">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Shop', href: '/shop' },
            ]}
          />
        </div>

        {sample ? (
          <p className="mb-6 rounded-md border border-ink-600 bg-ink-850 px-4 py-3 text-sm text-ink-300">
            Some of this list comes from the in-repo sample catalogue rather than live inventory.
            Prices were checked against Canadian retail on the date shown per item; stock counts
            are placeholders.
          </p>
        ) : null}

        {/* --- category tiles ------------------------------------------- */}
        <nav aria-label="Shop categories">
          <ul className="thin-scroll -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:flex-wrap sm:gap-2 sm:px-0 sm:overflow-visible">
            {SHOP_FILTERS.map((filter) => {
              const count = items.filter(filter.matches).length;
              const active = filter.slug === activeFilter.slug;
              return (
                <li key={filter.slug} className="shrink-0">
                  <Link
                    href={hrefWith({ c: filter.slug, sub: undefined, page: undefined })}
                    aria-current={active ? 'page' : undefined}
                    title={filter.description}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm',
                      active
                        ? 'border-gold-500 bg-gold-500 font-medium text-ink-950'
                        : 'border-ink-700 bg-ink-850 text-ink-200 hover:border-gold-600/50 hover:text-white',
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        'tnum rounded px-1 py-px text-[0.65rem] sm:px-1.5 sm:py-0.5 sm:text-xs',
                        active ? 'bg-ink-950/15 text-ink-950' : 'bg-ink-900 text-ink-400',
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* --- subcategories ---------------------------------------------
            Only rendered for a filter that declares them, which today is PC
            components alone. Forty-odd parts across nine categories is too many
            to scan, and somebody after a graphics card does not want to wade
            through power supplies to find one.

            A category with nothing in it is still shown, disabled, rather than
            hidden. "Graphics card 0" tells a shopper we are out of them; an
            absent tile tells them nothing and looks like we never sold any.
        ----------------------------------------------------------------- */}
        {activeFilter.subCategories ? (
          <nav aria-label={`${activeFilter.label} subcategories`} className="mt-2">
            <ul className="thin-scroll -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:flex-wrap sm:gap-2 sm:px-0 sm:overflow-visible">
              <li className="shrink-0">
                <Link
                  href={hrefWith({ sub: undefined, page: undefined })}
                  aria-current={subCategory === null ? 'true' : undefined}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] transition-colors sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs',
                    subCategory === null
                      ? 'border-gold-600/60 bg-gold-600/15 font-medium text-gold-300'
                      : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-gold-600/40 hover:text-white',
                  )}
                >
                  All {activeFilter.label.toLowerCase()}
                  <span className="tnum text-[0.65rem] text-ink-400">
                    {items.filter(activeFilter.matches).length}
                  </span>
                </Link>
              </li>
              {activeFilter.subCategories.map((category) => {
                const count = items.filter(
                  (item) => activeFilter.matches(item) && item.category === category,
                ).length;
                const active = subCategory === category;
                return (
                  <li key={category} className="shrink-0">
                    <Link
                      href={hrefWith({ sub: category, page: undefined })}
                      aria-current={active ? 'true' : undefined}
                      aria-disabled={count === 0 ? 'true' : undefined}
                      className={cn(
                        'flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] transition-colors sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs',
                        active
                          ? 'border-gold-600/60 bg-gold-600/15 font-medium text-gold-300'
                          : count === 0
                            ? 'pointer-events-none border-ink-800 bg-ink-900 text-ink-600'
                            : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-gold-600/40 hover:text-white',
                      )}
                    >
                      {CATEGORY_LABELS[category]}
                      <span className="tnum text-[0.65rem] text-ink-400">{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        <p className="mt-2 text-xs text-ink-400 sm:text-sm">
          {subCategory
            ? `${CATEGORY_LABELS[subCategory]} within ${activeFilter.label.toLowerCase()}.`
            : activeFilter.description}
        </p>

        {/* --- search, condition, sort ----------------------------------- */}
        <form
          method="get"
          action="/shop"
          className="mt-4 grid gap-2 rounded-lg border border-ink-700 bg-ink-850 p-2.5 sm:gap-3 sm:p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)_auto]"
        >
          {/* Carried through so searching does not drop the chosen category,
              or the subcategory under it. */}
          <input type="hidden" name="c" value={activeFilter.slug} />
          {subCategory ? <input type="hidden" name="sub" value={subCategory} /> : null}

          <div>
            <label htmlFor="shop-q" className="sr-only">
              Search products
            </label>
            <input
              id="shop-q"
              name="q"
              defaultValue={query}
              placeholder="Search by name, brand or model"
              className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
            />
          </div>

          {/* `sm:contents` dissolves this wrapper from the small breakpoint
              up, so the four controls sit in the parent's four columns exactly
              as before. It only exists to pair these two on a phone. */}
          <div className="grid grid-cols-2 gap-2 sm:contents">
          <div>
            <label htmlFor="shop-condition" className="sr-only">
              Condition
            </label>
            <select
              id="shop-condition"
              name="condition"
              defaultValue={condition}
              className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="all">Any condition</option>
              {COMPONENT_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shop-sort" className="sr-only">
              Sort
            </label>
            <select
              id="shop-sort"
              name="sort"
              defaultValue={sort}
              className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="featured">Featured first</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name">Name A&ndash;Z</option>
            </select>
          </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-400 sm:px-5"
          >
            <span className="sm:hidden">Apply filters</span>
            <span className="hidden sm:inline">Apply</span>
          </button>
        </form>

        {/* --- results --------------------------------------------------- */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-ink-400">
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
            {query ? (
              <>
                {' '}
                matching <span className="text-ink-100">{query}</span>
              </>
            ) : null}
          </p>
          {query || condition !== 'all' || activeFilter.slug !== 'all' || subCategory ? (
            <Link href="/shop" className="text-sm text-gold-400 hover:text-gold-300">
              Clear filters
            </Link>
          ) : null}
        </div>

        {pageItems.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Nothing matches that"
              description="Try a different category, or tell us what you are after and we will source it."
              action={<ButtonLink href="/quote">Ask for a quote</ButtonLink>}
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((item) => (
              <ShopCard key={`${item.kind}-${item.id}`} item={item} orderable={orderable} />
            ))}
          </div>
        )}

        {pageCount > 1 ? (
          <nav
            aria-label="Pagination"
            className="mt-10 flex items-center justify-between border-t border-ink-700 pt-6"
          >
            {safePage > 1 ? (
              <Link
                href={hrefWith({ page: String(safePage - 1) })}
                className="rounded-md border border-ink-600 bg-ink-850 px-4 py-2 text-sm text-ink-200 hover:border-gold-600/50 hover:text-white"
              >
                &larr; Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-ink-400">
              Page {safePage} of {pageCount}
            </span>
            {safePage < pageCount ? (
              <Link
                href={hrefWith({ page: String(safePage + 1) })}
                className="rounded-md border border-ink-600 bg-ink-850 px-4 py-2 text-sm text-ink-200 hover:border-gold-600/50 hover:text-white"
              >
                Next &rarr;
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </PageShell>
    </>
  );
}

/**
 * Sorting.
 *
 * "Featured first" is the rotating order from rotateShopItems: featured items
 * lead, then the admin's display order, then a stable hourly shuffle. The
 * explicit sorts are plain and predictable, because somebody who asks for
 * price order wants price order and nothing else.
 */
function sortItems(items: ShopItem[], sort: string): ShopItem[] {
  switch (sort) {
    case 'price-asc':
      return [...items].sort((a, b) => a.priceCents - b.priceCents);
    case 'price-desc':
      return [...items].sort((a, b) => b.priceCents - a.priceCents);
    case 'name':
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return rotateShopItems(items);
  }
}
