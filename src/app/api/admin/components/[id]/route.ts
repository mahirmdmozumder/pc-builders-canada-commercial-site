import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminComponentSchema } from '@/lib/validation/schemas';
import { logActivity, describeChange } from '@/lib/admin/activity';
import type { ComponentRecord } from '@/lib/catalog/types';
import { handle, notFound, ok, serviceUnavailable, zodErrorResponse } from '@/lib/api/respond';

/**
 * Edit or deactivate a component.
 *
 * DELETE performs a SOFT delete (`active: false`). Historical orders and
 * saved builds reference these rows; removing one would rewrite what a
 * customer actually bought. Deactivated parts disappear from the
 * configurator and stay intact in the record.
 */

const editableSchema = adminComponentSchema.partial().omit({ id: true });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/components/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = editableSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('components')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return notFound('That component could not be found.');
    const before = existing as ComponentRecord;

    const patch: Partial<ComponentRecord> = {};
    const changes: string[] = [];

    if (parsed.data.price_cents !== undefined && parsed.data.price_cents !== before.price_cents) {
      patch.price_cents = parsed.data.price_cents;
      changes.push(describeChange('price', before.price_cents, parsed.data.price_cents));
    }
    if (parsed.data.cost_cents !== undefined) patch.cost_cents = parsed.data.cost_cents ?? null;
    if (
      parsed.data.stock_quantity !== undefined &&
      parsed.data.stock_quantity !== before.stock_quantity
    ) {
      patch.stock_quantity = parsed.data.stock_quantity;
      changes.push(describeChange('stock', before.stock_quantity, parsed.data.stock_quantity));
    }
    if (parsed.data.low_stock_threshold !== undefined) {
      patch.low_stock_threshold = parsed.data.low_stock_threshold;
    }
    if (parsed.data.brand !== undefined) patch.brand = parsed.data.brand;
    if (parsed.data.model !== undefined) patch.model = parsed.data.model;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;
    if (parsed.data.image_url !== undefined) patch.image_url = parsed.data.image_url || null;
    if (parsed.data.active !== undefined && parsed.data.active !== before.active) {
      patch.active = parsed.data.active;
      changes.push(describeChange('active', before.active, parsed.data.active));
    }
    if (parsed.data.data_confidence !== undefined) {
      patch.data_confidence = parsed.data.data_confidence;
      if (parsed.data.data_confidence !== before.data_confidence) {
        changes.push(describeChange('spec confidence', before.data_confidence, parsed.data.data_confidence));
      }
    }

    if (Object.keys(patch).length === 0) return ok({ updated: false });

    const { error } = await supabase!.from('components').update(patch).eq('id', id);
    if (error) return notFound('Could not update that component.');

    await logActivity({
      actor: admin,
      action: 'component.updated',
      entityType: 'component',
      entityId: id,
      summary: `${before.brand} ${before.model}: ${changes.join('; ') || 'details updated'}`,
      metadata: { changes },
    });

    return ok({ updated: true });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('DELETE /api/admin/components/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: existing } = await supabase!
      .from('components')
      .select('id, brand, model')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return notFound('That component could not be found.');

    const { error } = await supabase!.from('components').update({ active: false }).eq('id', id);
    if (error) return notFound('Could not deactivate that component.');

    const row = existing as Pick<ComponentRecord, 'id' | 'brand' | 'model'>;
    await logActivity({
      actor: admin,
      action: 'component.deactivated',
      entityType: 'component',
      entityId: id,
      summary: `Deactivated ${row.brand} ${row.model}`,
    });

    return ok({ deactivated: true });
  });
}
