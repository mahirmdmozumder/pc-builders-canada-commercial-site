import { getSupabasePublicClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { AdminReview, OwnReview, PublicReview, ReviewStats } from '@/lib/reviews/types';

/**
 * Review reads.
 *
 * ---------------------------------------------------------------------------
 * NO FALLBACK, DELIBERATELY
 * ---------------------------------------------------------------------------
 * Every other repository in this codebase falls back to in-repo content when
 * Supabase is unreachable, so the site stays browsable from a fresh clone. This
 * one does not, and must not.
 *
 * A fallback catalogue is sample data labelled as sample data. A fallback review
 * would be a fabricated customer opinion, and there is no label that makes that
 * acceptable. When the database is unavailable, a product has no reviews to show
 * and the page says exactly that.
 *
 * Public reads go through `product_reviews_public`, a view that does not contain
 * user_id. Nothing outside the admin and the author's own account reads the
 * table.
 */

/** How many reviews one product page renders. */
const PAGE_LIMIT = 100;

export interface ProductReviewData {
  reviews: PublicReview[];
  /** Null when the product has no visible reviews at all. */
  stats: ReviewStats | null;
  /** True when more reviews exist than were returned. */
  truncated: boolean;
}

/**
 * Everything the product page needs about reviews, in two parallel queries.
 *
 * The aggregate comes from the database rather than from averaging the rows
 * above it. That matters precisely because the row list is capped: averaging a
 * capped list would publish the rating of the most recent hundred reviews as
 * though it were the product's rating, and the figure would move whenever the
 * cap was crossed. See the note on product_review_stats in migration 0009.
 */
export async function loadProductReviews(componentId: string): Promise<ProductReviewData> {
  const empty: ProductReviewData = { reviews: [], stats: null, truncated: false };

  const supabase = getSupabasePublicClient();
  if (!supabase) return empty;

  const [reviewResult, statsResult] = await Promise.all([
    supabase
      .from('product_reviews_public')
      .select('*')
      .eq('component_id', componentId)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT),
    supabase
      .from('product_review_stats')
      .select('*')
      .eq('component_id', componentId)
      .maybeSingle(),
  ]);

  if (reviewResult.error) {
    // Logged, not thrown. A review query failing must not take a product page
    // down: the price, the specifications and Add to cart are all still valid.
    console.error('[reviews] query failed', reviewResult.error.message);
    return empty;
  }
  if (statsResult.error) {
    console.error('[reviews] stats query failed', statsResult.error.message);
  }

  const reviews = (reviewResult.data ?? []) as unknown as PublicReview[];
  const stats = (statsResult.data ?? null) as ReviewStats | null;

  return {
    reviews,
    stats,
    truncated: stats ? stats.review_count > reviews.length : false,
  };
}

/**
 * Review counts for a set of products, for listing pages.
 *
 * One query for the whole grid rather than one per card. A shop page showing
 * twenty-four products would otherwise make twenty-four round trips to render a
 * star rating, which is the kind of thing that makes a listing page slow for a
 * decoration.
 *
 * Products absent from the map have no reviews. Callers must treat a missing
 * entry as "none", never as zero stars.
 */
export async function reviewStatsFor(componentIds: string[]): Promise<Map<string, ReviewStats>> {
  if (componentIds.length === 0) return new Map();

  const supabase = getSupabasePublicClient();
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from('product_review_stats')
    .select('*')
    .in('component_id', componentIds);

  if (error || !data) {
    if (error) console.error('[reviews] bulk stats query failed', error.message);
    return new Map();
  }

  return new Map((data as unknown as ReviewStats[]).map((row) => [row.component_id, row]));
}

/**
 * The signed-in visitor's own review of this product, if they have written one.
 *
 * Reads the TABLE rather than the public view, through the session client, so
 * Row Level Security scopes it to the caller. That is also why it returns a
 * hidden review: an author is entitled to know their review was removed and
 * why, and the public view would simply have shown them nothing.
 *
 * Returns null when nobody is signed in, which the form treats as "sign in to
 * review" rather than as "you have not reviewed this".
 */
export async function getOwnReview(componentId: string): Promise<OwnReview | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('component_id', componentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[reviews] own-review query failed', error.message);
    return null;
  }
  return (data ?? null) as OwnReview | null;
}

/**
 * Whether the signed-in visitor bought this product.
 *
 * Used only to set expectations in the form ("this will be marked a verified
 * purchase"). The badge itself is decided by the database trigger on write, so a
 * client that lies about this changes a sentence of copy and nothing else.
 */
export async function hasPurchased(componentId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Two explicit queries rather than a PostgREST embed. The Database type in
  // this codebase declares no foreign-key relationships (see the note on it),
  // so an embedded select would not type-check — and the codebase reads related
  // rows this way throughout.
  //
  // RLS on `orders` already restricts the first query to the caller's own
  // orders, so the user filter is the policy's job and the payment filter is
  // ours.
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_status', 'paid');

  if (orderError || !orders || orders.length === 0) return false;

  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('component_id, configuration')
    .in(
      'order_id',
      orders.map((order) => order.id),
    );

  if (itemError || !items) return false;

  return items.some((item) => {
    if (item.component_id === componentId) return true;
    // A part bought inside a build counts, matching the database function.
    if (!Array.isArray(item.configuration)) return false;
    return (item.configuration as { component_id?: string }[]).some(
      (part) => part?.component_id === componentId,
    );
  });
}

/**
 * The moderation queue: every review, hidden ones included.
 *
 * Admin-only by policy, not merely by convention. This reads the table through
 * the SESSION client, so if a caller ever forgets its requireAdmin() check the
 * query returns the caller's own reviews and nothing else, rather than
 * everybody's. A service-role client would have happily returned the lot.
 */
export async function listAllReviews(limit = 200): Promise<AdminReview[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error('[reviews] admin list failed', error.message);
    return [];
  }
  return data as unknown as AdminReview[];
}
