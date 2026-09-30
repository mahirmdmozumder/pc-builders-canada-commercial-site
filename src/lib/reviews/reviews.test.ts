import { describe, expect, it } from 'vitest';
import {
  arrangeReviews,
  ratingShare,
  starsFor,
  type PublicReview,
  type ReviewStats,
} from '@/lib/reviews/types';

/**
 * Review arithmetic.
 *
 * The thing worth guarding here is not the sorting — it is that no code path
 * produces a rating, a share or a filled histogram bar for a product nobody has
 * reviewed. A zero-review product that renders as "0.0 out of 5" or as five empty
 * stars has been rated as far as a reader is concerned, and it has not been.
 */

function review(overrides: Partial<PublicReview> & { id: string }): PublicReview {
  return {
    component_id: 'gpu-test',
    rating: 5,
    title: null,
    body: 'A perfectly ordinary review body, long enough to pass validation.',
    display_name: 'Test',
    verified_purchase: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function stats(overrides: Partial<ReviewStats> = {}): ReviewStats {
  return {
    component_id: 'gpu-test',
    review_count: 0,
    average_rating: 0,
    count_5: 0,
    count_4: 0,
    count_3: 0,
    count_2: 0,
    count_1: 0,
    verified_count: 0,
    latest_review_at: null,
    ...overrides,
  };
}

describe('rating distribution', () => {
  it('reports a real share per star', () => {
    const s = stats({ review_count: 10, count_5: 7, count_4: 2, count_1: 1 });
    expect(ratingShare(s, 5)).toBe(70);
    expect(ratingShare(s, 4)).toBe(20);
    expect(ratingShare(s, 1)).toBe(10);
    expect(ratingShare(s, 3)).toBe(0);
  });

  /**
   * A histogram bar whose width is NaN renders as a FULL-WIDTH bar in several
   * browsers, which would show a product with no reviews as unanimously
   * five-star. This is the specific reason ratingShare guards the divisor rather
   * than trusting the caller not to ask.
   */
  it('returns zero rather than NaN when there are no reviews', () => {
    const empty = stats();
    for (const rating of [5, 4, 3, 2, 1] as const) {
      expect(ratingShare(empty, rating)).toBe(0);
      expect(Number.isNaN(ratingShare(empty, rating))).toBe(false);
    }
  });

  it('maps every star value to its own count', () => {
    const s = stats({ review_count: 15, count_5: 5, count_4: 4, count_3: 3, count_2: 2, count_1: 1 });
    expect(starsFor(s, 5)).toBe(5);
    expect(starsFor(s, 4)).toBe(4);
    expect(starsFor(s, 3)).toBe(3);
    expect(starsFor(s, 2)).toBe(2);
    expect(starsFor(s, 1)).toBe(1);
  });

  it('shares add up to roughly the whole', () => {
    const s = stats({ review_count: 3, count_5: 1, count_4: 1, count_3: 1 });
    const total = ([5, 4, 3, 2, 1] as const).reduce((sum, r) => sum + ratingShare(s, r), 0);
    // Each share is rounded to one decimal, so thirds cannot sum to exactly 100.
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });
});

describe('sorting and filtering', () => {
  const reviews = [
    review({ id: 'a', rating: 3, created_at: '2026-03-01T00:00:00.000Z' }),
    review({ id: 'b', rating: 5, created_at: '2026-01-01T00:00:00.000Z' }),
    review({ id: 'c', rating: 5, created_at: '2026-02-01T00:00:00.000Z' }),
    review({ id: 'd', rating: 1, created_at: '2026-04-01T00:00:00.000Z' }),
  ];

  it('puts the newest first by default', () => {
    expect(arrangeReviews(reviews, 'newest', null).map((r) => r.id)).toEqual(['d', 'a', 'c', 'b']);
  });

  /**
   * Ties broken by date, so the order is TOTAL. Without that, two five-star
   * reviews swap places on every re-sort and the list appears to change content
   * when only its order changed.
   */
  it('breaks equal ratings by date, so the order is stable', () => {
    const highest = arrangeReviews(reviews, 'highest', null).map((r) => r.id);
    expect(highest).toEqual(['c', 'b', 'a', 'd']);
    // Re-sorting the already-sorted list must not move anything.
    const again = arrangeReviews(arrangeReviews(reviews, 'highest', null), 'highest', null);
    expect(again.map((r) => r.id)).toEqual(highest);
  });

  it('sorts lowest first when asked', () => {
    expect(arrangeReviews(reviews, 'lowest', null).map((r) => r.id)).toEqual(['d', 'a', 'c', 'b']);
  });

  it('filters to one star rating', () => {
    expect(arrangeReviews(reviews, 'newest', 5).map((r) => r.id)).toEqual(['c', 'b']);
    expect(arrangeReviews(reviews, 'newest', 2)).toHaveLength(0);
  });

  it('never mutates the array it was given', () => {
    const original = [...reviews];
    arrangeReviews(reviews, 'highest', null);
    expect(reviews.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });
});
