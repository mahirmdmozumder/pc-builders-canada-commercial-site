import { revalidatePath } from 'next/cache';

/**
 * Storefront pages that read the catalogue, and are statically cached.
 *
 * `/build` is absent on purpose: it reads search params and the session, so it
 * renders per request and has no cache to invalidate.
 *
 * /services and /portfolio joined this list when their content moved into the
 * database. Before that they were static files and there was nothing to clear.
 */
const CATALOGUE_PATHS = [
  '/',
  '/gaming-pcs',
  '/workstations',
  '/networking',
  '/nas',
  '/mini-pcs',
  '/refurbished',
  '/services',
  '/portfolio',
] as const;

/**
 * Rebuilds the storefront after the catalogue changes.
 *
 * These pages are statically generated and served from a cache. Without this,
 * an admin who corrects a price or adds a product sees the old page for up to
 * a full revalidation window and reasonably concludes the save did not work.
 *
 * Called from every admin route that writes to `components`, so the common
 * case — someone editing the catalogue through the application — updates the
 * storefront immediately rather than eventually.
 *
 * It does NOT cover changes made straight to the database, because no
 * application code runs for those. That is what the short `revalidate` window
 * on each page is for, and it is not a hypothetical gap: loading the catalogue
 * by running seed.sql in the SQL editor left every one of these pages showing
 * an empty category until the window expired.
 *
 * Failures are swallowed deliberately. A cache that could not be cleared must
 * not turn a successful save into an error response; the page will catch up
 * when its window expires.
 */
export function revalidateStorefront(): void {
  for (const path of CATALOGUE_PATHS) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error('[revalidate] could not revalidate', path, error);
    }
  }
}
