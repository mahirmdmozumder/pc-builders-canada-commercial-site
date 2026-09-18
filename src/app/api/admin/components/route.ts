import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminComponentSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import {
  badRequest,
  conflict,
  created,
  handle,
  notFound,
  serviceUnavailable,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Create a catalogue component.
 *
 * New rows are created with `data_confidence: 'sample'` unless the operator
 * explicitly marks them verified. That default is deliberate: an unchecked
 * specification should never present itself as a confirmed figure, and the
 * public UI labels sample rows accordingly.
 */
export async function POST(request: Request) {
  return handle('POST /api/admin/components', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const parsed = adminComponentSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    const supabase = await getSupabaseServerClient();
    const { data: clash } = await supabase!
      .from('components')
      .select('id')
      .or(`id.eq.${input.id},sku.eq.${input.sku}`)
      .maybeSingle();

    if (clash) return conflict('A component with that id or SKU already exists.');

    const { error } = await supabase!.from('components').insert({
      id: input.id,
      slug: input.id,
      sku: input.sku,
      category: input.category,
      brand: input.brand,
      model: input.model,
      description: input.description,
      price_cents: input.price_cents,
      cost_cents: input.cost_cents ?? null,
      stock_quantity: input.stock_quantity,
      low_stock_threshold: input.low_stock_threshold,
      active: input.active,
      data_confidence: input.data_confidence,
      image_url: input.image_url || null,
      specs: {},
    });

    if (error) {
      console.error('[admin] component insert failed', error.message);
      return badRequest('Could not create that component.');
    }

    await logActivity({
      actor: admin,
      action: 'component.created',
      entityType: 'component',
      entityId: input.id,
      summary: `Created ${input.brand} ${input.model} (${input.sku})`,
      metadata: { price_cents: input.price_cents, category: input.category },
    });

    return created({ id: input.id });
  });
}
