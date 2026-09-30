'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@/components/ui';
import { Stars } from '@/components/reviews/stars';
import { ReviewForm } from '@/components/reviews/review-form';
import {
  arrangeReviews,
  RATING_VALUES,
  REVIEW_SORTS,
  ratingShare,
  reviewDate,
  starsFor,
  type OwnReview,
  type PublicReview,
  type RatingValue,
  type ReviewSort,
  type ReviewStats,
} from '@/lib/reviews/types';
import { cn } from '@/lib/utils';

/**
 * The reviews section of a product page.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT WILL NOT DO
 * ---------------------------------------------------------------------------
 * There is no code path here that renders a rating for a product nobody has
 * reviewed. `stats` is null in that case and the section says "No reviews yet" —
 * not "0.0 out of 5", not an empty five-star row, not a histogram of zeroes. A
 * greyed-out rating still reads as a rating, and a product with no reviews has
 * not been rated badly. It has not been rated.
 *
 * ---------------------------------------------------------------------------
 * WHY THE AVERAGE COMES FROM A PROP AND NOT FROM THE LIST
 * ---------------------------------------------------------------------------
 * `stats` is computed by Postgres over every visible review; `reviews` is at most
 * the first hundred. Averaging the array would publish the rating of the hundred
 * most recent reviews as the product's rating, and the number would shift when
 * the cap was crossed. See product_review_stats in migration 0009.
 *
 * Sorting and filtering happen here, in the browser, over reviews already sent.
 * A visitor narrowing to four-star reviews is filtering a list they can see;
 * a round trip for that would be slower and would need this logic on the server
 * as well.
 */
/** What /api/reviews/mine answers about the current visitor. */
interface Standing {
  signedIn: boolean;
  accounts: boolean;
  review: OwnReview | null;
  purchased: boolean;
  suggestedName: string | null;
}

export function ReviewSection({
  componentId,
  productName,
  reviews,
  stats,
  truncated,
  productHref,
}: {
  componentId: string;
  productName: string;
  reviews: PublicReview[];
  stats: ReviewStats | null;
  truncated: boolean;
  /** Where to send somebody back to after signing in. */
  productHref: string;
}) {
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [starFilter, setStarFilter] = useState<RatingValue | null>(null);
  const [writing, setWriting] = useState(false);

  /**
   * Who the viewer is, fetched after mount rather than rendered on the server.
   *
   * The reviews and the rating are public and arrive with the cached page. Only
   * this — whether you are signed in, whether you already reviewed this, whether
   * you bought it — depends on a cookie, and reading a cookie on the server would
   * have made the entire product page dynamic for every visitor including
   * crawlers. See the note on /api/reviews/mine.
   *
   * `null` means "not known yet", which is deliberately distinct from "signed
   * out": the panel renders nothing while unknown rather than flashing a
   * "sign in to review" prompt at somebody who is already signed in.
   */
  const [standing, setStanding] = useState<Standing | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews/mine?component_id=${encodeURIComponent(componentId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setStanding(data as Standing);
      })
      .catch(() => {
        // A failed lookup means the write controls stay hidden. Everything that
        // matters on this page — the reviews, the rating — is already rendered.
      });
    return () => {
      cancelled = true;
    };
  }, [componentId]);

  const visible = useMemo(
    () => arrangeReviews(reviews, sort, starFilter),
    [reviews, sort, starFilter],
  );

  const ownReview = standing?.review ?? null;
  const signedIn = standing?.signedIn ?? false;
  const canWrite = signedIn && !ownReview;

  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Customer reviews</h2>
        {stats ? (
          <p className="tnum text-sm text-ink-400">
            {stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'}
          </p>
        ) : null}
      </div>

      {stats ? (
        <Summary
          stats={stats}
          starFilter={starFilter}
          onFilter={(value) => setStarFilter(value === starFilter ? null : value)}
        />
      ) : (
        <Card className="mt-5 p-6 text-center">
          <p className="font-medium text-white">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-400">
            Nobody has reviewed this yet. We would rather show you an empty section than fill it in
            ourselves — every review here is written by somebody who bought from us.
          </p>
        </Card>
      )}

      {/* --- writing ------------------------------------------------------ */}
      {/* Reserves its height so the reviews below do not shift when the panel
          resolves. A list that jumps as somebody starts reading it is the cost of
          fetching this after paint, and it is avoidable. */}
      <div className="mt-6 min-h-[3.5rem]">
        {standing === null ? null : !standing.accounts ? (
          <p className="text-sm text-ink-400">
            Reviews need an account, and accounts are not available on this deployment.
          </p>
        ) : ownReview ? (
          <OwnReviewPanel
            review={ownReview}
            componentId={componentId}
            suggestedName={standing.suggestedName ?? undefined}
          />
        ) : !signedIn ? (
          <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
            <p className="text-sm leading-relaxed text-ink-300">
              Bought this from us?{' '}
              <Link
                href={`/login?next=${encodeURIComponent(`${productHref}#reviews`)}`}
                className="font-medium text-gold-400 hover:text-gold-300"
              >
                Sign in
              </Link>{' '}
              to leave a review. We require an account so every review is attached to a real
              customer.
            </p>
          </div>
        ) : writing ? (
          <ReviewForm
            componentId={componentId}
            productName={productName}
            purchased={standing.purchased}
            suggestedName={standing.suggestedName ?? undefined}
            onDone={() => setWriting(false)}
            onCancel={() => setWriting(false)}
          />
        ) : canWrite ? (
          <Button variant="secondary" onClick={() => setWriting(true)}>
            Write a review
          </Button>
        ) : null}
      </div>

      {/* --- the list ----------------------------------------------------- */}
      {reviews.length > 0 ? (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-700 pt-5">
            <label htmlFor="review-sort" className="text-xs tracking-wide text-ink-400 uppercase">
              Sort
            </label>
            <select
              id="review-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
              className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
            >
              {REVIEW_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {starFilter !== null ? (
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="text-sm text-gold-400 hover:text-gold-300"
              >
                Clear {starFilter}-star filter
              </button>
            ) : null}

            <span className="tnum ml-auto text-sm text-ink-400">
              Showing {visible.length} of {reviews.length}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-400">
              No {starFilter}-star reviews for this product.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-700">
              {visible.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}

          {truncated ? (
            <p className="mt-5 text-xs text-ink-400">
              Showing the {reviews.length} most recent reviews. The rating above is calculated from
              all {stats?.review_count} of them.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Summary({
  stats,
  starFilter,
  onFilter,
}: {
  stats: ReviewStats;
  starFilter: RatingValue | null;
  onFilter: (rating: RatingValue) => void;
}) {
  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center">
        <div className="text-center sm:text-left">
          <p className="tnum text-4xl font-semibold text-white">{stats.average_rating}</p>
          <Stars rating={stats.average_rating} size="lg" className="mt-2" />
          <p className="tnum mt-2 text-sm text-ink-400">
            Based on {stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'}
          </p>
          {stats.verified_count > 0 ? (
            <p className="tnum mt-1 text-xs text-ok-400">
              {stats.verified_count} verified{' '}
              {stats.verified_count === 1 ? 'purchase' : 'purchases'}
            </p>
          ) : null}
        </div>

        {/* The distribution doubles as the star filter. A bar a visitor can see
            but not act on is the more common design and the less useful one. */}
        <div className="space-y-1.5">
          {RATING_VALUES.map((rating) => {
            const count = starsFor(stats, rating);
            const share = ratingShare(stats, rating);
            const active = starFilter === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => onFilter(rating)}
                aria-pressed={active}
                disabled={count === 0}
                className={cn(
                  'flex w-full items-center gap-3 rounded px-1.5 py-1 text-left transition-colors',
                  count === 0
                    ? 'cursor-default opacity-50'
                    : active
                      ? 'bg-ink-800'
                      : 'hover:bg-ink-800/60',
                )}
              >
                <span className="tnum w-10 shrink-0 text-xs text-ink-300">{rating} star</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <span
                    className="block h-full rounded-full bg-gold-500"
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-xs text-ink-400">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars rating={review.rating} size="sm" />
        {review.title ? (
          <p className="font-medium text-white">{review.title}</p>
        ) : null}
        {review.verified_purchase ? (
          <span title="This customer's order for this product is recorded as paid.">
            <Badge tone="ok">Verified purchase</Badge>
          </span>
        ) : null}
      </div>

      {/* whitespace-pre-line, so a reviewer's paragraph breaks survive. Nothing
          richer than that: review text is not trusted HTML and never will be. */}
      <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-ink-200">
        {review.body}
      </p>

      <p className="mt-3 text-xs text-ink-400">
        {review.display_name} &middot; {reviewDate(review.created_at)}
        {review.updated_at !== review.created_at ? ' (edited)' : ''}
      </p>
    </li>
  );
}

/**
 * The author's own review, with the controls only they get.
 *
 * Shows a hidden review to its author, with the reason. Being told your review
 * was removed, and why, is part of removing it honestly — the alternative is a
 * customer who believes their review is live and cannot see it.
 */
function OwnReviewPanel({
  review,
  componentId,
  suggestedName,
}: {
  review: OwnReview;
  componentId: string;
  suggestedName?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ReviewForm
        componentId={componentId}
        productName=""
        purchased={review.verified_purchase}
        existing={review}
        suggestedName={suggestedName}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className={cn('p-5', review.hidden_at ? 'border-warn-500/40' : 'border-gold-600/30')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Your review</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-gold-400 hover:text-gold-300"
          >
            Edit
          </button>
          <DeleteReview reviewId={review.id} />
        </div>
      </div>

      {review.hidden_at ? (
        <p className="mt-3 rounded-md border border-warn-500/40 bg-ink-900 px-3 py-2 text-xs leading-relaxed text-warn-400">
          This review is currently hidden from the product page. Reason given:{' '}
          {review.hidden_reason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars rating={review.rating} size="sm" />
        {review.title ? <p className="font-medium text-white">{review.title}</p> : null}
        {review.verified_purchase ? <Badge tone="ok">Verified purchase</Badge> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-200">{review.body}</p>
      <p className="mt-3 text-xs text-ink-400">
        Signed {review.display_name} &middot; {reviewDate(review.created_at)}
      </p>
    </Card>
  );
}

function DeleteReview({ reviewId }: { reviewId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-ink-400 hover:text-danger-400"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      {error ? <span className="text-danger-400">{error}</span> : <span className="text-ink-400">Sure?</span>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.error ?? 'Could not delete that.');
            }
            // A full reload rather than a router refresh: the rating aggregate
            // is computed server-side, so the summary above has to be re-read
            // rather than patched in the browser.
            window.location.reload();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not delete that.');
            setBusy(false);
          }
        }}
        className="font-medium text-danger-400 hover:text-danger-500"
      >
        {busy ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-ink-400 hover:text-ink-200"
      >
        No
      </button>
    </span>
  );
}
