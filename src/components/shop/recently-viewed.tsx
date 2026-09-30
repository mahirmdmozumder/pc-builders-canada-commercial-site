'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { formatMoney } from '@/lib/utils';

/**
 * Recently viewed products.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS localStorage AND NOT A TABLE
 * ---------------------------------------------------------------------------
 * A browsing history is per-device, worth nothing to anybody but the visitor,
 * and needed only for the row at the bottom of a product page. Storing it
 * server-side would mean a table, a write on every product view, a privacy
 * question about how long we keep a browsing history of people who never bought
 * anything, and an authenticated read to render a decoration. None of that buys
 * the visitor anything the browser cannot do for free.
 *
 * It also means the product page stays statically rendered. A server-side
 * history would be per-visitor data on the page, which forces dynamic rendering
 * and gives up the cache on the site's most-crawled route.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS STORED
 * ---------------------------------------------------------------------------
 * A capped list of {href, name, priceCents, imageUrl}. Enough to draw the row
 * without a database read.
 *
 * The price is a SNAPSHOT from when the product was viewed and is labelled
 * "when you viewed it" if it is stale, because a cached number presented as a
 * current price is a quiet lie. It is never used for anything but this row —
 * adding to cart from here is a link to the product page, not an add-to-cart.
 *
 * Every read and write is wrapped, because localStorage throws rather than
 * returning null in a private window with site data blocked, and a decoration
 * must not take a product page down.
 */

const KEY = 'pcbc-recently-viewed-v1';
const LIMIT = 8;

export interface ViewedProduct {
  href: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  /** When it was viewed, so a stale price can be labelled. */
  at: number;
}

function read(): ViewedProduct[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validated on read, not trusted. This is data a visitor can edit, and a
    // malformed entry should drop out rather than crash the row.
    return parsed.filter(
      (entry): entry is ViewedProduct =>
        entry &&
        typeof entry.href === 'string' &&
        entry.href.startsWith('/products/') &&
        typeof entry.name === 'string' &&
        typeof entry.priceCents === 'number',
    );
  } catch {
    return [];
  }
}

function write(entries: ViewedProduct[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    // Full, blocked or unavailable. Nothing here is worth surfacing.
  }
}

/**
 * Records the current product, then renders the ones viewed before it.
 *
 * Recording and rendering in one component on purpose: they share the same read,
 * and splitting them would mean two effects racing over the same key.
 *
 * ---------------------------------------------------------------------------
 * WHY useHydrated RATHER THAN setState IN AN EFFECT
 * ---------------------------------------------------------------------------
 * The list lives in localStorage, which the server cannot read, so the markup the
 * server sends and the first client render would disagree — a hydration error.
 * The usual fix is `useState([])` plus an effect that sets the real value, but
 * that sets state synchronously inside an effect and re-renders the whole subtree
 * a second time.
 *
 * `useHydrated` returns false on the server and true on the client in a single
 * pass (it is built on useSyncExternalStore), so the read can simply be a
 * `useMemo` gated on it. The effect below only WRITES, which is exactly what an
 * effect is for: pushing state out to an external system.
 */
export function RecentlyViewed({ current }: { current: ViewedProduct }) {
  const hydrated = useHydrated();

  // Read once hydrated. Deliberately keyed on the href rather than on `current`,
  // so a re-render with an equal-but-not-identical object does not re-read.
  const others = useMemo(() => {
    if (!hydrated) return [];
    return read()
      .filter((entry) => entry.href !== current.href)
      .slice(0, LIMIT);
  }, [hydrated, current.href]);

  useEffect(() => {
    if (!hydrated) return;
    // What to STORE puts this product at the front of the previous list.
    const history = read().filter((entry) => entry.href !== current.href);
    write([{ ...current, at: Date.now() }, ...history]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, current.href]);

  if (others.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading">
      <h2 id="recently-viewed-heading" className="text-xl font-semibold text-white">
        Recently viewed
      </h2>
      {/* A scroll rail on every size. Eight tiles wrapping would compete with
          Related products directly above it for the same space. */}
      <ul className="thin-scroll -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {others.map((entry) => (
          <li key={entry.href} className="w-36 shrink-0 sm:w-40">
            <Link
              href={entry.href}
              className="group block rounded-lg border border-ink-700 bg-ink-850 p-3 transition-colors hover:border-gold-600/40"
            >
              <span className="block aspect-square overflow-hidden rounded-md border border-ink-700 bg-gradient-to-b from-ink-100 to-ink-200">
                {entry.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={entry.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-ink-900 text-[0.6rem] tracking-wide text-ink-500 uppercase">
                    No photo
                  </span>
                )}
              </span>
              <span className="mt-2.5 line-clamp-2 block text-xs leading-snug font-medium text-ink-100 group-hover:text-white">
                {entry.name}
              </span>
              <span className="tnum mt-1 block text-xs text-ink-400">
                {formatMoney(entry.priceCents)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">
        Kept in this browser only, and the prices are the ones shown when you looked. Open a product
        for its current price.
      </p>
    </section>
  );
}
