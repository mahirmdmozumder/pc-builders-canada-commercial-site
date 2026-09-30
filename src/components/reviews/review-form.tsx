'use client';

import { useState } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import { StarInput } from '@/components/reviews/stars';
import { RATING_LABELS, type OwnReview } from '@/lib/reviews/types';

/**
 * Write or revise a review.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FORM DOES NOT PROMISE
 * ---------------------------------------------------------------------------
 * It does not offer a "verified purchase" checkbox, and it does not tell the
 * writer their review WILL be marked verified. The badge is decided by the
 * database from paid order data (see review_verified_purchase in migration
 * 0009), so anything said here is a description of what the server will
 * probably find, not an instruction to it.
 *
 * `purchased` is used only to set that expectation in one sentence. A client
 * that lies about it changes a line of copy and nothing else.
 *
 * ---------------------------------------------------------------------------
 * VALIDATION
 * ---------------------------------------------------------------------------
 * The limits below mirror the Zod schema, which mirrors the database CHECK
 * constraints. Three layers saying the same thing is deliberate: this one exists
 * so a reviewer finds out about a 20-character minimum while they are typing
 * rather than after submitting, and the other two are what actually enforce it.
 */

const BODY_MIN = 20;
const BODY_MAX = 4000;

export function ReviewForm({
  componentId,
  productName,
  purchased,
  existing,
  suggestedName,
  onDone,
  onCancel,
}: {
  componentId: string;
  productName: string;
  purchased: boolean;
  /** Present when revising an existing review rather than writing a new one. */
  existing?: OwnReview;
  suggestedName?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [displayName, setDisplayName] = useState(existing?.display_name ?? suggestedName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyLength = body.trim().length;
  const tooShort = bodyLength > 0 && bodyLength < BODY_MIN;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (rating < 1) {
      setError('Choose a rating from one to five stars.');
      return;
    }
    if (bodyLength < BODY_MIN) {
      setError(`Please write at least ${BODY_MIN} characters.`);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        existing ? `/api/reviews/${existing.id}` : '/api/reviews',
        {
          method: existing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(existing ? {} : { component_id: componentId }),
            rating,
            title: title.trim() || null,
            body: body.trim(),
            display_name: displayName.trim(),
          }),
        },
      );

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'That could not be saved.');

      onDone();
      // A full reload, not a router refresh. The rating average and the
      // histogram are computed by Postgres, so they have to be re-read rather
      // than patched in the browser — and a summary that disagrees with the list
      // below it is worse than a reload.
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be saved.');
      setBusy(false);
    }
  }

  return (
    <Card className="border-gold-600/30 p-5">
      <h3 className="text-base font-semibold text-white">
        {existing ? 'Edit your review' : 'Write a review'}
        {!existing && productName ? (
          <span className="ml-1 font-normal text-ink-400">of {productName}</span>
        ) : null}
      </h3>

      <form className="mt-5 space-y-5" onSubmit={submit}>
        <div>
          <p className="text-sm font-medium text-ink-200">Your rating</p>
          <div className="mt-2 flex items-center gap-3">
            <StarInput value={rating} onChange={setRating} name="review-rating" />
            <span className="text-sm text-ink-400">
              {rating > 0 ? RATING_LABELS[rating] : 'Pick a rating'}
            </span>
          </div>
        </div>

        <Field
          label="Headline"
          htmlFor="review-title"
          hint="Optional. One line somebody skimming would find useful."
        >
          <Input
            id="review-title"
            value={title}
            maxLength={120}
            placeholder="Quiet, and it fit the case"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <Field
          label="Your review"
          htmlFor="review-body"
          required
          hint={
            tooShort
              ? `${BODY_MIN - bodyLength} more character${BODY_MIN - bodyLength === 1 ? '' : 's'} needed.`
              : `What you used it for and how it went. ${bodyLength}/${BODY_MAX}`
          }
        >
          <Textarea
            id="review-body"
            rows={5}
            required
            maxLength={BODY_MAX}
            value={body}
            placeholder="Installed this in a mini-ITX build. Ran cool under load and the bracket fitted without modification."
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>

        <Field
          label="Name to show"
          htmlFor="review-name"
          required
          hint="Shown on the review. A first name or initials is fine — your email is never published."
        >
          <Input
            id="review-name"
            value={displayName}
            required
            minLength={2}
            maxLength={60}
            placeholder="Arnob S."
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>

        <p className="rounded-md border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-xs leading-relaxed text-ink-400">
          {purchased ? (
            <>
              We have a paid order from you containing this product, so this will be marked a{' '}
              <span className="text-ok-400">verified purchase</span>. That label is set from the
              order record, not from this form.
            </>
          ) : (
            <>
              This will not be marked a verified purchase, because we have no paid order from this
              account containing this product. Your review still counts toward the rating — the badge
              only states what the order record shows.
            </>
          )}
        </p>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger-500/40 bg-danger-500/10 px-3.5 py-2.5 text-sm text-danger-400"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink-400 hover:text-ink-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
