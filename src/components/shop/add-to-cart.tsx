'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui';
import { useHydrated } from '@/lib/hooks/use-hydrated';

/**
 * Add-to-cart control for a single catalogue row.
 *
 * The snapshot price sent into the cart is for DISPLAY ONLY. /api/checkout
 * re-resolves every line against the catalogue and recalculates the total
 * server-side, so editing localStorage changes what the visitor sees and not
 * what they are charged. See src/lib/cart/store.ts.
 *
 * The button stays disabled until hydration. Before that the cart contents are
 * unknown — they live in localStorage, which the server cannot read — so a
 * click would be acting on state we do not have yet.
 */
export function AddToCart({
  componentId,
  name,
  priceCents,
  stockQuantity,
}: {
  componentId: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
}) {
  const addComponent = useCart((s) => s.addComponent);
  const hydrated = useHydrated();
  const [added, setAdded] = useState(false);

  if (stockQuantity <= 0) {
    return (
      <Button variant="secondary" size="sm" disabled>
        Out of stock
      </Button>
    );
  }

  return (
    <Button
      variant={added ? 'secondary' : 'primary'}
      size="sm"
      disabled={!hydrated}
      onClick={() => {
        addComponent({ componentId, name, snapshotPriceCents: priceCents });
        setAdded(true);
        // Reverts to the normal label so a second unit can be added without
        // the button looking stuck in a confirmed state.
        window.setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? 'Added ✓' : 'Add to cart'}
    </Button>
  );
}
