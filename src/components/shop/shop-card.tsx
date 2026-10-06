import Link from 'next/link';
import { Badge } from '@/components/ui';
import { formatMoney } from '@/lib/utils';
import { CONDITION_DESCRIPTIONS, CONDITION_LABELS } from '@/lib/catalog/types';
import type { ShopItem } from '@/lib/catalog/shop';
import { ProductImage } from '@/components/shop/product-image';
import { AddToCart } from '@/components/shop/add-to-cart';

/**
 * One tile in the shop grid.
 *
 * Handles both things the shop sells. A part gets an Add to cart button and a
 * stock line; a pre-built gets a link through to its own page, because there is
 * no single stock number for something assembled to order.
 *
 * ---------------------------------------------------------------------------
 * THE CLICK TARGET
 * ---------------------------------------------------------------------------
 * The image and the title are links to the product page; the card itself is not.
 * A whole-card <a> is the tempting version and it breaks two things: the Add to
 * cart button inside it becomes a nested interactive element, which is invalid
 * HTML and behaves differently in every browser, and selecting the description
 * text to copy a model number navigates away instead.
 *
 * Two links to the same place also means a keyboard user tabs past the same card
 * twice, so the image link is aria-hidden and taken out of the tab order — the
 * title link is the accessible one, and it carries the name.
 *
 * Condition is a badge, never a footnote. Anything not sold as new says so next
 * to its price, with the claim spelled out on hover, because the entire value of
 * a lower price is a buyer knowing why it is lower.
 */
export function ShopCard({ item, orderable = true }: { item: ShopItem; orderable?: boolean }) {
  const secondHand = item.condition !== 'new';
  const unverified = item.specs?.unverified;

  return (
    <article className="group flex flex-col rounded-lg border border-ink-700 bg-ink-850 p-4 transition-colors hover:border-gold-600/40">
      <Link
        href={item.href}
        aria-hidden
        tabIndex={-1}
        className="mb-3 block focus:outline-none"
      >
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          category={item.category ?? 'case'}
          brand={item.brand}
          galleryCount={item.galleryCount}
        />
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={item.kind === 'prebuilt' ? 'accent' : 'neutral'}>
          {item.kind === 'prebuilt' ? 'Pre-built' : item.categoryLabel}
        </Badge>
        {secondHand ? (
          <span title={CONDITION_DESCRIPTIONS[item.condition]}>
            <Badge tone="warn">{CONDITION_LABELS[item.condition]}</Badge>
          </span>
        ) : null}
        {item.featured ? <Badge tone="ok">Featured</Badge> : null}
      </div>

      {item.brand ? (
        <p className="text-xs tracking-wide text-gold-400 uppercase">{item.brand}</p>
      ) : null}
      <h3 className="mt-0.5 leading-snug font-semibold text-white">
        <Link
          href={item.href}
          className="rounded transition-colors hover:text-gold-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          {item.name}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-300">
        {item.description}
      </p>

      {typeof unverified === 'string' ? (
        <p className="mt-3 rounded border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-xs leading-relaxed text-ink-400">
          <span className="font-medium text-ink-200">Unverified:</span> {unverified}
        </p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-ink-700 pt-3">
        <div className="min-w-0">
          <p className="tnum text-lg font-semibold text-white">
            {item.priceCents > 0 ? formatMoney(item.priceCents) : 'Ask us'}
          </p>
          {item.kind === 'prebuilt' ? (
            <p className="mt-0.5 text-xs text-ink-400">Assembled &amp; tested</p>
          ) : (
            <StockLine item={item} />
          )}
        </div>

        {item.kind === 'prebuilt' ? (
          <Link
            href={item.href}
            className="shrink-0 rounded-md border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm font-medium text-ink-100 transition-colors hover:border-gold-600/50 hover:text-white"
          >
            View build
          </Link>
        ) : (
          <AddToCart
            componentId={item.id}
            name={item.name}
            priceCents={item.priceCents}
            stockQuantity={item.stockQuantity ?? 0}
            orderable={orderable}
          />
        )}
      </div>
    </article>
  );
}

function StockLine({ item }: { item: ShopItem }) {
  const stock = item.stockQuantity ?? 0;
  if (stock <= 0) return <p className="mt-0.5 text-xs text-ink-400">Out of stock</p>;
  if (stock <= item.lowStockThreshold) {
    return <p className="tnum mt-0.5 text-xs text-warn-400">Only {stock} left</p>;
  }
  return <p className="mt-0.5 text-xs text-ok-400">In stock</p>;
}
