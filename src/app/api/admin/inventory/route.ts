import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { inventoryAdjustSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import type { ComponentRecord } from '@/lib/catalog/types';
import { handle, notFound, ok, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * Stock adjustment.
 *
 * Separate from the component editor because it is a different job done at a
 * different time: counting shelves, not editing a product page. Every
 * adjustment is logged with the delta and an optional reason, so a stock
 * discrepancy can be traced back to a specific action.
 */
export async function POST(request: Request) {
  return handle('POST /api/admin/inventory', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const parsed = inventoryAdjustSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('components')
      .select('id, brand, model, sku, stock_quantity')
      .eq('id', parsed.data.component_id)
      .maybeSingle();

    if (!existing) return notFound('That component could not be found.');
    const before = existing as Pick<
      ComponentRecord,
      'id' | 'brand' | 'model' | 'sku' | 'stock_quantity'
    >;

    const { error } = await supabase!
      .from('components')
      .update({ stock_quantity: parsed.data.stock_quantity })
      .eq('id', parsed.data.component_id);

    if (error) return notFound('Could not adjust that stock level.');

    const delta = parsed.data.stock_quantity - before.stock_quantity;
    await logActivity({
      actor: admin,
      action: 'inventory.adjusted',
      entityType: 'component',
      entityId: before.id,
      summary: `${before.brand} ${before.model} stock ${before.stock_quantity} -> ${parsed.data.stock_quantity} (${delta >= 0 ? '+' : ''}${delta})${parsed.data.reason ? `: ${parsed.data.reason}` : ''}`,
      metadata: {
        sku: before.sku,
        from: before.stock_quantity,
        to: parsed.data.stock_quantity,
        delta,
        reason: parsed.data.reason ?? null,
      },
    });

    return ok({ stock_quantity: parsed.data.stock_quantity });
  });
}
