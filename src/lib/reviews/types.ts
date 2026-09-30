/**
 * Customer reviews.
 *
 * ---------------------------------------------------------------------------
 * THE RULE THIS MODULE EXISTS TO HOLD
 * ---------------------------------------------------------------------------
 * Every number here is derived from rows a customer actually wrote. There is no
 * seeded review, no default rating, no "4.5 out of 5" placeholder, and no code
 * path that produces a rating for a product nobody has reviewed. A product with
 * no reviews returns `null` stats, and the UI says it has none.
 *
 * That is not squeamishness. Fabricated ratings are a Competition Act problem
 * in Canada, they are the single most reliable way to get review structured
 * data ignored by Google, and they destroy the only thing a review is for.
 */

/** A review as the storefront sees it: no user id, no moderation fields. */
export interface PublicReview {
  id: string;
  component_id: string;
  rating: number;
  title: string | null;
  body: string;
  display_name: string;
  /**
   * Computed in the database from paid orders, never accepted from a client.
   * See review_verified_purchase() in migration 0009.
   */
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

/** The author's own view, which also shows whether it has been hidden. */
export interface OwnReview extends PublicReview {
  user_id: string;
  hidden_at: string | null;
  hidden_reason: string | null;
}

/** A review in the moderation queue. */
export interface AdminReview extends OwnReview {
  /** Filled in by the admin page from the catalogue, not stored on the row. */
  product_name?: string;
  product_href?: string;
}

/**
 * The aggregate, as the `product_review_stats` view returns it.
 *
 * A product with no visible reviews has NO ROW in that view, so the absence of
 * stats is represented by `null` rather than by a zeroed object. "No reviews
 * yet" and "rated 0 out of 5" are different claims and only one is true.
 */
export interface ReviewStats {
  component_id: string;
  review_count: number;
  /** Two decimal places, as Postgres rounded it. */
  average_rating: number;
  count_5: number;
  count_4: number;
  count_3: number;
  count_2: number;
  count_1: number;
  verified_count: number;
  latest_review_at: string | null;
}

export const RATING_VALUES = [5, 4, 3, 2, 1] as const;
export type RatingValue = (typeof RATING_VALUES)[number];

/** What each star count is taken to mean, shown beside the rating input. */
export const RATING_LABELS: Record<number, string> = {
  5: 'Excellent',
  4: 'Good',
  3: 'Okay',
  2: 'Poor',
  1: 'Bad',
};

export function starsFor(stats: ReviewStats, rating: RatingValue): number {
  switch (rating) {
    case 5:
      return stats.count_5;
    case 4:
      return stats.count_4;
    case 3:
      return stats.count_3;
    case 2:
      return stats.count_2;
    case 1:
      return stats.count_1;
  }
}

/**
 * The share of reviews at a given star rating, 0-100.
 *
 * Returns 0 rather than NaN when there are no reviews. A histogram bar of width
 * NaN renders as a full-width bar in some browsers, which would show a product
 * with no reviews as unanimously five-star.
 */
export function ratingShare(stats: ReviewStats, rating: RatingValue): number {
  if (stats.review_count <= 0) return 0;
  return Math.round((starsFor(stats, rating) / stats.review_count) * 1000) / 10;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'helpful-length';

export const REVIEW_SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'newest', label: 'Most recent' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];

/**
 * Sorting and star filtering, in one pure function.
 *
 * Done in the browser over the already-loaded page of reviews rather than as a
 * round trip. A visitor who clicks "4 stars" is narrowing a list they can
 * already see; refetching for that would be slower and would need the same
 * ordering logic on the server anyway.
 *
 * "Highest" and "lowest" break ties by date, so the order is total and stable.
 * Without that, re-sorting shuffles same-rating reviews on every click and the
 * list appears to change content when only its order changed.
 */
export function arrangeReviews(
  reviews: PublicReview[],
  sort: ReviewSort,
  starFilter: RatingValue | null,
): PublicReview[] {
  const filtered = starFilter === null ? reviews : reviews.filter((r) => r.rating === starFilter);
  const byNewest = (a: PublicReview, b: PublicReview) => b.created_at.localeCompare(a.created_at);

  switch (sort) {
    case 'highest':
      return [...filtered].sort((a, b) => b.rating - a.rating || byNewest(a, b));
    case 'lowest':
      return [...filtered].sort((a, b) => a.rating - b.rating || byNewest(a, b));
    default:
      return [...filtered].sort(byNewest);
  }
}

/**
 * A date a reader can place, without a timezone argument.
 *
 * Reviews are dated to the day. An exact timestamp invites a rendering mismatch
 * between the server's timezone and the visitor's, which React reports as a
 * hydration error on a page that is otherwise fine.
 */
export function reviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
