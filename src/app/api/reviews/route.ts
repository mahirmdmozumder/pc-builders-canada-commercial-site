import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { reviewSchema } from '@/lib/validation/schemas';
import { getComponent } from '@/lib/catalog/repository';
import { productHref } from '@/lib/catalog/types';
import {
  badRequest,
  conflict,
  created,
  handle,
  notFound,
  serviceUnavailable,
  unauthorized,
  zodErrorResponse,
} from '@/lib/api/respond';

/**
 * Submit a review.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS ROUTE IS AND IS NOT RESPONSIBLE FOR
 * ---------------------------------------------------------------------------
 * It validates shape, confirms the product exists, and writes through the
 * SESSION client so Row Level Security applies. That last part is the important
 * one: if this handler ever lost its sign-in check, the insert would be refused
 * by the database rather than succeeding with a forged author. A service-role
 * client would have written the row.
 *
 * It does NOT decide who the author is, and it does NOT decide whether the
 * purchase is verified. Both are set by the trigger in migration 0009 from
 * auth.uid() and from paid order data. A request body claiming somebody else's
 * user id or a verified badge is corrected, not merely rejected.
 *
 * One review per customer per product is a unique constraint, so a duplicate
 * comes back as a 23505 and is reported as a conflict — there is no read-then-
 * write race here that could let two through.
 */
export async function POST(request: Request) {
  return handle('POST /api/reviews', async () => {
    if (!isSupabaseConfigured) {
      return serviceUnavailable('Reviews need a database connection.');
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized('Sign in to leave a review.');
    }

    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    // Confirms the product is real and published before writing a review
    // against it. The foreign key would catch a nonexistent id, but it would
    // not catch a review filed against an archived product, and a review that
    // no page will ever render is a dead row.
    const product = await getComponent(input.component_id);
    if (!product) {
      return notFound('That product could not be found.');
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) return serviceUnavailable('Reviews are unavailable right now.');

    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        component_id: input.component_id,
        // Set here so the RLS insert policy passes; the trigger overwrites it
        // with auth.uid() regardless, which is what makes it trustworthy.
        user_id: user.id,
        rating: input.rating,
        title: input.title ? input.title : null,
        body: input.body,
        display_name: input.display_name,
      })
      .select('id, verified_purchase')
      .single();

    if (error) {
      if (error.code === '23505') {
        return conflict('You have already reviewed this product. Edit your review instead.');
      }
      console.error('[reviews] insert failed', error.message);
      return badRequest('Could not save that review.');
    }

    // The product page caches, and its rating comes from the database. Without
    // this the reviewer would post a review and then not see it, which reads as
    // the submission having failed.
    try {
      revalidatePath(productHref(product));
    } catch (cause) {
      console.error('[reviews] could not revalidate product page', cause);
    }

    const row = data as { id: string; verified_purchase: boolean };
    return created({ id: row.id, verified_purchase: row.verified_purchase });
  });
}
