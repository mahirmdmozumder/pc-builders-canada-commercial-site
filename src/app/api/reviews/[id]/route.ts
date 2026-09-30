import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { reviewEditSchema } from '@/lib/validation/schemas';
import {
  badRequest,
  handle,
  notFound,
  ok,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Revise or withdraw your own review.
 *
 * ---------------------------------------------------------------------------
 * HOW "YOUR OWN" IS ENFORCED
 * ---------------------------------------------------------------------------
 * Three times, at three layers, and the layers are not redundant:
 *
 *   1. The `.eq('user_id', user.id)` filter below. Convenience: it turns
 *      somebody else's review into a clean 404.
 *   2. The RLS policies on product_reviews, which scope update and delete to
 *      `user_id = auth.uid()`. This is the ENFORCEMENT. If the filter above were
 *      deleted, the write would still match no rows.
 *   3. The trigger, which pins component_id, user_id, created_at and the
 *      moderation columns to their stored values. So even an authorised edit
 *      cannot move a review onto a different product or unhide itself.
 *
 * Only (2) and (3) would survive a mistake in this file, which is why they exist.
 */

async function ownedReview(id: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, review: null };

  const { data } = await supabase
    .from('product_reviews')
    .select('id, component_id, user_id')
    .eq('id', id)
    .maybeSingle();

  return { supabase, review: (data ?? null) as { id: string; component_id: string } | null };
}

/** Clears the product page cache so the change is visible immediately. */
function refreshProduct(componentId: string) {
  try {
    // The slug equals the id for every row the admin creates, and the page
    // resolves either, so this is the right path without a second query.
    revalidatePath(`/products/${componentId}`);
  } catch (cause) {
    console.error('[reviews] could not revalidate product page', cause);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('PATCH /api/reviews/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Reviews need a database connection.');

    const user = await getSessionUser();
    if (!user) return unauthorized('Sign in to edit your review.');

    const { id } = await params;
    const parsed = reviewEditSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const values: Record<string, unknown> = { ...parsed.data };
    // An empty headline means "remove the headline", not "leave it alone".
    if (values.title === '') values.title = null;
    if (Object.keys(values).length === 0) return ok({ updated: false });

    const { supabase, review } = await ownedReview(id);
    if (!supabase) return serviceUnavailable('Reviews are unavailable right now.');
    // Either it does not exist, or RLS hid somebody else's. Both are "not
    // found" as far as the caller is entitled to know.
    if (!review) return notFound('That review could not be found.');

    const { error } = await supabase
      .from('product_reviews')
      .update(values as never)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[reviews] update failed', error.message);
      return badRequest('Could not save that change.');
    }

    refreshProduct(review.component_id);
    return ok({ updated: true });
  });
}

/**
 * Withdraw a review.
 *
 * A real delete, not a soft one — and this is the one place in the codebase that
 * deletes rather than archives. Everywhere else, archiving protects a historical
 * record: an order references a product, so removing the product would rewrite
 * what somebody bought.
 *
 * A review is the opposite case. It is the customer's own statement about their
 * own purchase, nothing references it, and a customer who withdraws their opinion
 * is entitled to have it gone rather than flagged invisible in our database. The
 * rating aggregate recomputes from what remains.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('DELETE /api/reviews/[id]', async () => {
    if (!isSupabaseConfigured) return serviceUnavailable('Reviews need a database connection.');

    const user = await getSessionUser();
    if (!user) return unauthorized('Sign in to delete your review.');

    const { id } = await params;
    const { supabase, review } = await ownedReview(id);
    if (!supabase) return serviceUnavailable('Reviews are unavailable right now.');
    if (!review) return notFound('That review could not be found.');

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[reviews] delete failed', error.message);
      return badRequest('Could not delete that review.');
    }

    refreshProduct(review.component_id);
    return ok({ deleted: true });
  });
}
