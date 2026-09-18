import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveBuild } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceBuild } from '@/lib/pricing/pricing';
import { saveBuildSchema } from '@/lib/validation/schemas';
import {
  badRequest,
  created,
  handle,
  ok,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Saved builds.
 *
 * The estimated total and compatibility flag stored on the row are computed
 * HERE, from the catalogue, not taken from the request. A client can choose
 * which parts go in a build; it cannot tell the server what they cost.
 */

export async function GET() {
  return handle('GET /api/builds', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable('Saved builds need a database connection.');
    }
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase!
      .from('saved_builds')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return badRequest('Could not load your builds.');
    return ok({ builds: data ?? [] });
  });
}

export async function POST(request: Request) {
  return handle('POST /api/builds', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable(
        'Saved builds need a database connection. Your configuration is still in the configurator.',
      );
    }

    const user = await getSessionUser();
    if (!user) return unauthorized('Sign in to save this build to your account.');

    const parsed = saveBuildSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { build, missingIds } = await resolveBuild(parsed.data.items);
    if (missingIds.length > 0) {
      return badRequest('Some parts in this build are no longer in the catalogue.');
    }

    const report = checkCompatibility(build);
    const price = priceBuild(build);

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase!
      .from('saved_builds')
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        items: parsed.data.items,
        estimated_total_cents: price.totalCents,
        is_compatible: report.failures.length === 0,
      })
      .select('id')
      .single();

    if (error) return badRequest('Could not save this build.');
    return created({ id: (data as { id: string }).id });
  });
}
