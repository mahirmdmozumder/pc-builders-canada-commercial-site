import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { priceUpdateSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import { revalidateStorefront } from '@/lib/catalog/revalidate';
import type { ComponentRecord } from '@/lib/catalog/types';
import { handle, notFound, ok, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * Price change.
 *
 * Deliberately built the same way as the inventory route next door, and for the
 * same reason: repricing is a different job from editing a product, done at a
 * different time and far more often. Opening a form with forty fields to change
 * one number is how prices end up out of date.
 *
 * It writes the SAME COLUMN the product editor writes, `components.price_cents`.
 * There is no second price, no override table and no pricing layer — which is
 * what makes the new figure the real one everywhere at once. The cart, the
 * configurator, the checkout, the preset totals and the product pages all read
 * that column already, so nothing downstream needs to know this screen exists.
 *
 * The write goes through the SESSION client, not the service-role client. If
 * this handler ever lost its admin check the database would refuse the update
 * rather than performing it.
 */
export async function POST(request: Request) {
  return handle('POST /api/admin/pricing', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    // A 404 rather than a 403: no reason to confirm the route exists to
    // somebody probing it.
    if (!admin) return notFound();

    const parsed = priceUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('components')
      .select('id, brand, model, sku, price_cents, cost_cents')
      .eq('id', parsed.data.component_id)
      .maybeSingle();

    if (!existing) return notFound('That component could not be found.');
    const before = existing as Pick<
      ComponentRecord,
      'id' | 'brand' | 'model' | 'sku' | 'price_cents' | 'cost_cents'
    >;

    // Nothing to write, nothing to log. Without this a double-click or a
    // re-submitted draft would fill the activity log with "price 149.99 ->
    // 149.99" entries and bury the changes that mattered.
    if (before.price_cents === parsed.data.price_cents) {
      return ok({ price_cents: before.price_cents, changed: false });
    }

    const { error } = await supabase!
      .from('components')
      .update({ price_cents: parsed.data.price_cents })
      .eq('id', parsed.data.component_id);

    if (error) {
      console.error('[pricing] update failed', error.message);
      return notFound('Could not update that price.');
    }

    const delta = parsed.data.price_cents - before.price_cents;
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    await logActivity({
      actor: admin,
      action: 'price.changed',
      entityType: 'component',
      entityId: before.id,
      summary: `${before.brand} ${before.model} price ${money(before.price_cents)} -> ${money(parsed.data.price_cents)} (${delta >= 0 ? '+' : '-'}${money(Math.abs(delta))})${parsed.data.reason ? `: ${parsed.data.reason}` : ''}`,
      metadata: {
        sku: before.sku,
        from: before.price_cents,
        to: parsed.data.price_cents,
        delta,
        // Recorded because it is what makes the change judgeable later. A price
        // cut is a different event depending on what the part cost.
        cost_cents: before.cost_cents,
        reason: parsed.data.reason ?? null,
      },
    });

    // Clears the storefront pages and every product page, so the new figure is
    // live immediately rather than when each cache window happens to expire.
    revalidateStorefront();
    return ok({ price_cents: parsed.data.price_cents, changed: true });
  });
}
