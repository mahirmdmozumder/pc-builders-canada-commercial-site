'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart/store';

/**
 * Empties the cart once the customer has reached the confirmation page.
 * Runs client-side because the cart lives in the browser, and only after the
 * order exists, so a failed checkout never loses someone's configuration.
 */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
