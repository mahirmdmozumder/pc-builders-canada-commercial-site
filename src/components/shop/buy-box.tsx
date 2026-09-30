'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { cn } from '@/lib/utils';

/**
 * Quantity selector and Add to cart, for a product page.
 *
 * ---------------------------------------------------------------------------
 * THE SAME CART, NOT A SECOND ONE
 * ---------------------------------------------------------------------------
 * This calls `useCart().addComponent` — the identical store the shop cards use,
 * with the quantity argument it has always accepted. There is no separate
 * product-page cart, no duplicated price logic, and no new persistence key. The
 * only thing this adds over the card button is a number input.
 *
 * The price passed in is a DISPLAY snapshot. /api/checkout re-resolves every
 * line against the catalogue and recalculates server-side, so editing
 * localStorage changes what a visitor sees and not what they are charged. That
 * contract is documented on the store and holds here unchanged.
 *
 * ---------------------------------------------------------------------------
 * THE STOCK CAP
 * ---------------------------------------------------------------------------
 * The quantity cannot exceed what is on the shelf. The cart store caps at 20 and
 * checkout re-checks stock, so this is a courtesy rather than the enforcement —
 * but letting somebody select 9 of something we have 2 of and discovering it at
 * checkout is a worse experience than not offering it.
 */
export function BuyBox({
  componentId,
  name,
  priceCents,
  stockQuantity,
  orderable = true,
}: {
  componentId: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
  /** False when this row came from the sample fallback on a live deployment. */
  orderable?: boolean;
}) {
  const addComponent = useCart((state) => state.addComponent);
  const hydrated = useHydrated();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(0);

  const max = Math.max(1, Math.min(stockQuantity, 20));

  if (!orderable) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
        <p className="text-sm text-ink-200">
          This item is not available to order online yet.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          It is listed from our reference catalogue rather than live inventory, so the cart cannot
          price it. Ask us and we will source it and quote you directly.
        </p>
        <Link
          href="/quote"
          className="mt-3 inline-block text-sm font-medium text-gold-400 hover:text-gold-300"
        >
          Ask for a quote &rarr;
        </Link>
      </div>
    );
  }

  if (stockQuantity <= 0) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
        <Button variant="secondary" size="lg" disabled className="w-full">
          Out of stock
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          We can usually get this in within a few days. Tell us what you need and we will confirm a
          price and a date before you commit to anything.
        </p>
        <Link
          href="/quote"
          className="mt-2 inline-block text-sm font-medium text-gold-400 hover:text-gold-300"
        >
          Ask us to source it &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="buy-quantity"
            className="block text-xs tracking-wide text-ink-400 uppercase"
          >
            Quantity
          </label>
          <div className="mt-1.5 flex items-center rounded-md border border-ink-600 bg-ink-850">
            <StepButton
              label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              &minus;
            </StepButton>
            {/* A real number input, so a phone shows a numeric keypad and
                somebody ordering eight case fans can type 8 rather than tapping
                a plus button eight times. */}
            <input
              id="buy-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setQuantity(Math.min(max, Math.max(1, Math.round(next))));
              }}
              className="tnum w-14 border-0 bg-transparent py-2 text-center text-sm text-ink-100 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <StepButton
              label="Increase quantity"
              disabled={quantity >= max}
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            >
              +
            </StepButton>
          </div>
        </div>

        <div className="min-w-[10rem] flex-1">
          <Button
            size="lg"
            variant={added > 0 ? 'secondary' : 'primary'}
            disabled={!hydrated}
            className="w-full"
            onClick={() => {
              addComponent({ componentId, name, snapshotPriceCents: priceCents }, quantity);
              setAdded(quantity);
              // Reverts so a second batch can be added without the button
              // looking stuck in a confirmed state.
              window.setTimeout(() => setAdded(0), 2500);
            }}
          >
            {added > 0 ? `Added ${added} ✓` : 'Add to cart'}
          </Button>
        </div>
      </div>

      {quantity >= max && stockQuantity <= 20 ? (
        <p className="tnum mt-3 text-xs text-ink-400">
          {stockQuantity} in stock. Need more? <Link href="/quote" className="text-gold-400 hover:text-gold-300">Ask us</Link>.
        </p>
      ) : null}

      {added > 0 ? (
        <p className="mt-3 text-xs text-ink-300">
          <Link href="/cart" className="font-medium text-gold-400 hover:text-gold-300">
            Go to cart &rarr;
          </Link>{' '}
          or keep browsing.
        </p>
      ) : null}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // 40px minimum, so it is a comfortable tap target rather than a
        // desktop-sized affordance shrunk onto a phone.
        'flex size-10 items-center justify-center text-lg text-ink-200 transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:text-white',
      )}
    >
      {children}
    </button>
  );
}
