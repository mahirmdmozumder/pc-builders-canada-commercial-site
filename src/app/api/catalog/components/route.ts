import { listComponentsWithSource } from '@/lib/catalog/repository';
import { COMPONENT_CATEGORIES, type ComponentCategory } from '@/lib/catalog/types';
import { badRequest, handle, ok } from '@/lib/api/respond';

/**
 * One category's worth of parts, for the configurator to fetch when a picker
 * opens.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * /build used to serialise the entire configurator catalogue into its own HTML.
 * That was fine at 64 rows and survivable at 92. A 300-row motherboard import
 * took it to 273 rows and 552 KB, with motherboards alone accounting for 73% of
 * it — and every byte of that is blocking HTML for a page whose first screen
 * shows one picker.
 *
 * The cost was never only bandwidth. The configurator runs the compatibility
 * engine once per candidate to mark the incompatible ones, so opening the
 * motherboard picker ran it 199 times, and re-ran it on every change to the
 * build. Both problems have the same cause: the browser was handed every part
 * in the shop whether or not anybody looked at it.
 *
 * So a picker now asks for its own category when it opens. The engine still
 * runs client-side against the SELECTED parts, which is at most a dozen rows,
 * so compatibility feedback stays instant — that was never the part that needed
 * moving.
 *
 * ---------------------------------------------------------------------------
 * PUBLIC, AND CACHEABLE
 * ---------------------------------------------------------------------------
 * This reads `components_public`, the same view every storefront page uses,
 * which does not contain cost_cents at all. There is nothing per-visitor in the
 * response, so it is cached at the edge: a hundred people opening the
 * motherboard picker should cost one query, not a hundred.
 *
 * `truncated` is passed through rather than swallowed. PostgREST caps responses
 * at its configured max_rows, and a category that quietly returns 1000 of 1500
 * rows would be a picker missing a third of its options with nothing saying so.
 */

/**
 * Explicitly dynamic, and cached at the CDN by the header below instead.
 *
 * `revalidate` was the first attempt and it does not work here: it asks Next to
 * render the route statically, which it cannot do because the handler reads a
 * query parameter from `request.url`. The build said so rather than shipping
 * something subtly wrong, which is the good outcome.
 *
 * The caching is not lost, it just moves. `s-maxage` is honoured by the CDN for
 * a dynamic route, so a hundred people opening the motherboard picker still
 * cost one query.
 */
export const dynamic = 'force-dynamic';

function isCategory(value: string): value is ComponentCategory {
  return (COMPONENT_CATEGORIES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  return handle('GET /api/catalog/components', async () => {
    const raw = new URL(request.url).searchParams.get('category')?.trim() ?? '';

    // Validated against the enum rather than passed through. The repository
    // builds a PostgREST filter from this, and an unchecked value in a filter
    // is the shape of problem that bit getComponentBySlug once already.
    if (!isCategory(raw)) {
      return badRequest('Unknown category.');
    }

    const { components, source, truncated } = await listComponentsWithSource({ category: raw });

    return ok(
      { components, source, truncated },
      {
        headers: {
          // Stale-while-revalidate so a picker never waits on a cold cache.
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      },
    );
  });
}
