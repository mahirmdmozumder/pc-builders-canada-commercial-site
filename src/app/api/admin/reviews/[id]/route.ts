import { revalidatePath } from 'next/cache';
import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { reviewModerationSchema } from '@/lib/validation/schemas';
import { logActivity } from '@/lib/admin/activity';
import {
  badRequest,
  handle,
  notFound,
  ok,
  serviceUnavailable,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Moderation: hide or unhide one review.
 *
 * ---------------------------------------------------------------------------
 * THE ONLY REVIEW WRITE THE BUSINESS GETS
 * ---------------------------------------------------------------------------
 * This route can set `hidden_at` and `hidden_reason`. It cannot change a rating,
 * a title, a body or a name, and neither can any other route — the trigger in
 * migration 0009 discards those columns on an admin update, so the restriction
 * holds even if a future handler sends them.
 *
 * That is not a technicality. A seller who can edit reviews has a review section
 * that says whatever the seller wants, which is worth nothing to a customer and
 * is exactly what Google's review-snippet policy exists to catch. Hiding abuse is
 * legitimate; rewriting an opinion is not.
 *
 * Hiding requires a reason, it is recorded on the row, it is shown to the author
 * on the product page, and it goes into the activity log. An unexplained removal
 * is indistinguishable from burying a bad review.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/admin/reviews/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Admin needs a database connection.');

    const admin = await getAdminOrNull();
    // A 404 rather than a 403: there is no reason to confirm this route exists
    // to somebody probing it.
    if (!admin) return notFound();

    const { id } = await params;
    const parsed = reviewModerationSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { hidden, reason } = parsed.data;

    const supabase = await getSupabaseServerClient();
    if (!supabase) return serviceUnavailable('Admin is unavailable right now.');

    const { data: existing } = await supabase
      .from('product_reviews')
      .select('id, component_id, rating, display_name')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return notFound('That review could not be found.');

    const { error } = await supabase
      .from('product_reviews')
      .update({
        hidden_at: hidden ? new Date().toISOString() : null,
        hidden_reason: hidden ? (reason ?? '').trim() : null,
      } as never)
      .eq('id', id);

    if (error) {
      console.error('[reviews] moderation failed', error.message);
      return badRequest('Could not update that review.');
    }

    const row = existing as {
      component_id: string;
      rating: number;
      display_name: string;
    };

    await logActivity({
      actor: admin,
      action: hidden ? 'review.hidden' : 'review.restored',
      entityType: 'product_review',
      entityId: id,
      summary: hidden
        ? `Hid a ${row.rating}-star review by ${row.display_name} on ${row.component_id}: ${(reason ?? '').trim()}`
        : `Restored a ${row.rating}-star review by ${row.display_name} on ${row.component_id}`,
      metadata: { component_id: row.component_id, rating: row.rating },
    });

    try {
      revalidatePath(`/products/${row.component_id}`);
    } catch (cause) {
      console.error('[reviews] could not revalidate product page', cause);
    }

    return ok({ hidden });
  });
}
