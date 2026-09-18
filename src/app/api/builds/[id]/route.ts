import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveBuild } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceBuild } from '@/lib/pricing/pricing';
import { updateBuildSchema } from '@/lib/validation/schemas';
import type { SavedBuild } from '@/types/domain';
import {
  handle,
  notFound,
  ok,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Update or delete one saved build.
 *
 * Ownership is enforced by the Row Level Security policy on `saved_builds`:
 * an update or delete for someone else's row matches zero rows rather than
 * being rejected, so the response is a plain 404 and reveals nothing about
 * whether that id exists.
 */

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/builds/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Saved builds need a database connection.');
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const parsed = updateBuildSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const patch: Partial<SavedBuild> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

    // Recompute derived figures whenever the parts change; never accept them
    // from the client.
    if (parsed.data.items) {
      const { build } = await resolveBuild(parsed.data.items);
      patch.items = parsed.data.items;
      patch.estimated_total_cents = priceBuild(build).totalCents;
      patch.is_compatible = checkCompatibility(build).failures.length === 0;
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase!
      .from('saved_builds')
      .update(patch)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) return notFound('That build could not be found.');
    return ok({ id });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('DELETE /api/builds/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Saved builds need a database connection.');
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase!.from('saved_builds').delete().eq('id', id);

    if (error) return notFound('That build could not be found.');
    return ok({ deleted: true });
  });
}
