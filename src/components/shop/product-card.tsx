import {
  CONDITION_LABELS,
  displayName,
  isLowStock,
  type PublicComponent,
} from '@/lib/catalog/types';
import { specChips } from '@/components/configurator/spec-chips';
import { formatMoney } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { AddToCart } from '@/components/shop/add-to-cart';

/**
 * A single catalogue row on a storefront page.
 *
 * Three labels here are non-negotiable, and all three exist to stop the card
 * reading better than the underlying data justifies:
 *
 *   - Condition, whenever the unit is not new, with the seller’s own note
 *     printed in full rather than summarised into a grade.
 *   - An unverified-specification warning, naming the field in question.
 *   - Stock, including the fact that seeded counts are not real counts.
 *
 * A storefront that quietly drops any of these is making a claim the catalogue
 * does not support.
 */
export function ProductCard({
  component,
  orderable = true,
}: {
  component: PublicComponent;
  orderable?: boolean;
}) {
  const chips = specChips(component);
  const name = displayName(component);
  const unverified = component.specs?.unverified;
  const saleObserved = component.specs?.sale_price_observed;
  const availability = component.specs?.availability_note;
  const isNew = component.condition === 'new';

  return (
    <article className="flex flex-col rounded-lg border border-ink-700 bg-ink-850 p-5 transition-colors hover:border-gold-600/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-gold-400 uppercase">{component.brand}</p>
          <h3 className="mt-1 leading-snug font-semibold text-white">{component.model}</h3>
        </div>
        {!isNew ? (
          <Badge tone="warn" className="shrink-0">
            {CONDITION_LABELS[component.condition]}
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">{component.description}</p>

      {chips.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded border border-ink-600 bg-ink-900 px-2 py-0.5 text-xs text-ink-200"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      {/* The condition note describes one specific physical unit, so it is
          printed verbatim and never shortened. */}
      {!isNew && component.condition_notes ? (
        <p className="mt-4 rounded border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-xs leading-relaxed text-ink-200">
          <span className="font-semibold text-warn-400">
            {CONDITION_LABELS[component.condition]}:
          </span>{' '}
          {component.condition_notes}
        </p>
      ) : null}

      {typeof unverified === 'string' ? (
        <p className="mt-4 rounded border border-ink-600 bg-ink-900 px-3 py-2 text-xs leading-relaxed text-ink-300">
          <span className="font-semibold text-ink-100">Unverified:</span> {unverified}
        </p>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-ink-700 pt-4">
        <div>
          <p className="tnum text-lg font-semibold text-white">
            {formatMoney(component.price_cents)}
          </p>
          {typeof saleObserved === 'string' ? (
            <p className="mt-0.5 text-xs text-ink-400">Seen on sale at {saleObserved}</p>
          ) : null}
          <StockLine component={component} />
        </div>
        <AddToCart
          componentId={component.id}
          name={name}
          priceCents={component.price_cents}
          stockQuantity={component.stock_quantity}
          orderable={orderable}
        />
      </div>

      {typeof availability === 'string' ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-400">{availability}</p>
      ) : null}
    </article>
  );
}

function StockLine({ component }: { component: PublicComponent }) {
  if (component.stock_quantity <= 0) {
    return <p className="mt-0.5 text-xs text-ink-400">Out of stock &mdash; ask for an ETA</p>;
  }
  if (isLowStock(component)) {
    return (
      <p className="tnum mt-0.5 text-xs text-warn-400">
        Only {component.stock_quantity} left
      </p>
    );
  }
  return <p className="mt-0.5 text-xs text-ok-400">In stock</p>;
}
