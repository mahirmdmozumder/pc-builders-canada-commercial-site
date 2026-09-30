'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, Field, Input, Select } from '@/components/ui';
import { Stars } from '@/components/reviews/stars';
import { NoticeBar, type Notice } from '@/components/admin/content-controls';
import { reviewDate, type AdminReview } from '@/lib/reviews/types';
import { cn } from '@/lib/utils';

/**
 * Review moderation.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SCREEN DELIBERATELY CANNOT DO
 * ---------------------------------------------------------------------------
 * There is no edit control. Not because it was left out — because a seller who
 * can edit reviews has a review section that says whatever the seller wants, and
 * a customer reading it is being shown marketing copy dressed as testimony.
 *
 * The restriction is not enforced by this file. The database trigger in migration
 * 0009 discards the rating, title, body and name on any admin update, so it holds
 * even against SQL run by hand in the Supabase console.
 *
 * What the business CAN do is hide a review, with a recorded reason. That covers
 * the real cases: abuse, spam, a review filed against the wrong product, and
 * anything defamatory. Hiding is reversible, the reason is shown to the author on
 * the product page, and both directions go into the activity log.
 *
 * There is also no "approve" queue, which is a choice. Holding every review until
 * somebody clicks approve means the honest ones sit invisible for days and the
 * section looks dead, and in practice it becomes a filter on reviews the seller
 * dislikes. Reviews publish immediately and get removed when there is a reason.
 */

type Filter = 'all' | 'visible' | 'hidden' | 'unverified';

export function ReviewsManager({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (filter === 'visible' && review.hidden_at) return false;
      if (filter === 'hidden' && !review.hidden_at) return false;
      if (filter === 'unverified' && review.verified_purchase) return false;
      if (!needle) return true;
      return `${review.display_name} ${review.title ?? ''} ${review.body} ${review.component_id}`
        .toLowerCase()
        .includes(needle);
    });
  }, [reviews, filter, query]);

  const hiddenCount = reviews.filter((review) => review.hidden_at).length;

  async function moderate(review: AdminReview, hidden: boolean, reason?: string) {
    setBusyId(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden, reason }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'That did not save.');
      setNotice({
        tone: 'ok',
        text: hidden
          ? `Hidden. ${review.display_name}'s review no longer appears on the product page, and they can see the reason you gave.`
          : `Restored. ${review.display_name}'s review is visible again.`,
      });
      router.refresh();
    } catch (cause) {
      setNotice({
        tone: 'danger',
        text: cause instanceof Error ? cause.message : 'Something failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div>
        <h1 className="text-xl font-semibold text-white">Reviews</h1>
        <p className="mt-1 text-sm text-ink-400">
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          {hiddenCount > 0 ? `, ${hiddenCount} hidden` : ''}. You can hide a review and say why. You
          cannot edit one &mdash; what a customer wrote stays as they wrote it.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
          <Field label="Search" htmlFor="rv-q">
            <Input
              id="rv-q"
              value={query}
              placeholder="Name, product id or text"
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="Show" htmlFor="rv-filter">
            <Select
              id="rv-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
            >
              <option value="all">Everything</option>
              <option value="visible">Visible only</option>
              <option value="hidden">Hidden only</option>
              <option value="unverified">Not a verified purchase</option>
            </Select>
          </Field>
        </div>
      </Card>

      {reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium text-white">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-400">
            Nobody has reviewed a product yet. This table fills in when real customers write in it,
            and there is no way to add one from here &mdash; which is the point.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-400">
            The reliable way to get the first few is to ask, by name, a week after somebody&rsquo;s
            machine arrives.
          </p>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-400">Nothing matches that filter.</Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              busy={busyId === review.id}
              onHide={(reason) => moderate(review, true, reason)}
              onRestore={() => moderate(review, false)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewRow({
  review,
  busy,
  onHide,
  onRestore,
}: {
  review: AdminReview;
  busy: boolean;
  onHide: (reason: string) => void;
  onRestore: () => void;
}) {
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <li>
      <Card className={cn('p-5', review.hidden_at ? 'border-warn-500/40' : undefined)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Stars rating={review.rating} size="sm" />
              {review.title ? (
                <span className="font-medium text-white">{review.title}</span>
              ) : null}
              {review.verified_purchase ? (
                <Badge tone="ok">Verified purchase</Badge>
              ) : (
                <span title="No paid order from this account contains this product.">
                  <Badge tone="neutral">Unverified</Badge>
                </span>
              )}
              {review.hidden_at ? <Badge tone="warn">Hidden</Badge> : null}
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              {review.display_name} &middot; {reviewDate(review.created_at)} &middot;{' '}
              <Link
                href={`/products/${review.component_id}#reviews`}
                className="font-mono text-gold-400 hover:text-gold-300"
              >
                {review.component_id}
              </Link>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {review.hidden_at ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={onRestore}>
                {busy ? 'Saving…' : 'Restore'}
              </Button>
            ) : !hiding ? (
              <button
                type="button"
                onClick={() => setHiding(true)}
                className="text-sm text-ink-400 hover:text-warn-400"
              >
                Hide
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-200">
          {review.body}
        </p>

        {review.hidden_at ? (
          <p className="mt-3 rounded-md border border-warn-500/40 bg-ink-900 px-3 py-2 text-xs leading-relaxed text-warn-400">
            Hidden {reviewDate(review.hidden_at)}. Reason on record, and shown to the author:{' '}
            {review.hidden_reason}
          </p>
        ) : null}

        {hiding && !review.hidden_at ? (
          <div className="mt-4 border-t border-ink-700 pt-4">
            <Field
              label="Why is this being hidden?"
              htmlFor={`rv-reason-${review.id}`}
              required
              hint="Recorded against the review, shown to its author, and written to the activity log. Five characters minimum."
            >
              <Input
                id={`rv-reason-${review.id}`}
                value={reason}
                minLength={5}
                maxLength={300}
                placeholder="Abusive language / spam / review is about a different product"
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                disabled={busy || reason.trim().length < 5}
                onClick={() => onHide(reason.trim())}
              >
                {busy ? 'Hiding…' : 'Hide this review'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setHiding(false);
                  setReason('');
                }}
                className="text-sm text-ink-400 hover:text-ink-200"
              >
                Cancel
              </button>
              <span className="text-xs text-ink-500">
                Hiding is reversible and does not delete anything.
              </span>
            </div>
          </div>
        ) : null}
      </Card>
    </li>
  );
}
