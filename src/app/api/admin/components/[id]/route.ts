import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminComponentEditSchema } from '@/lib/validation/schemas';
import { logActivity, describeChange } from '@/lib/admin/activity';
import { revalidateStorefront } from '@/lib/catalog/revalidate';
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/components/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = adminComponentEditSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = await getSupabaseServerClient();
    const { data: existing } = await supabase!
      .from('components')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return notFound('That component could not be found.');

    // Everything the schema validated is written through, rather than a
    // hand-maintained list of fields. The previous version copied ~10 columns
    // by name, which meant every new CMS field was silently dropped on save
    // until somebody remembered to add it here.
    const { active: legacyActive, ...incoming } = parsed.data;
    const patch: Record<string, unknown> = { ...incoming };

    // `active` is derived from `status` by a trigger. An older client sending
    // only `active` still works; it is translated rather than written.
    if (patch.status === undefined && legacyActive !== undefined) {
      patch.status = legacyActive ? 'published' : 'archived';
    }
    if (patch.image_url === '') patch.image_url = null;

    const changes: string[] = [];
    const before = existing as ComponentRecord;
    const watched: (keyof ComponentRecord)[] = [
      'price_cents',
      'stock_quantity',
      'status',
      'condition',
      'data_confidence',
      'featured',
    ];
    for (const key of watched) {
      if (patch[key] !== undefined && patch[key] !== before[key]) {
        changes.push(describeChange(String(key), before[key], patch[key]));
      }
    }

    if (Object.keys(patch).length === 0) return ok({ updated: false });

    // The patch is assembled dynamically, so the row type cannot be inferred
    // from it. Every key came from the validated schema.
    const { error } = await supabase!.from('components').update(patch as never).eq('id', id);
    if (error) return notFound('Could not update that component.');

    await logActivity({
      actor: admin,
      action: 'component.updated',
      entityType: 'component',
      entityId: id,
      summary: `${before.brand} ${before.model}: ${changes.join('; ') || 'details updated'}`,
      metadata: { changes },
    });

    revalidateStorefront();
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

    revalidateStorefront();
    return ok({ deactivated: true });
  });
}
