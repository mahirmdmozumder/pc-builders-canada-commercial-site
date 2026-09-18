'use client';

import { useSyncExternalStore } from 'react';

/**
 * True once the component has hydrated on the client.
 *
 * Anything that reads browser-only state (localStorage carts, saved drafts)
 * has to wait for this, otherwise the server-rendered markup and the first
 * client render disagree and React throws a hydration error.
 *
 * Implemented with useSyncExternalStore rather than the usual
 * `useState(false)` + `useEffect(() => setMounted(true))`: that pattern sets
 * state synchronously inside an effect, which triggers a second render pass
 * of the whole subtree. This returns false on the server and true on the
 * client in a single pass.
 */
const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
