'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONE,
  type ContentStatus,
} from '@/lib/cms/types';

/**
 * Shared controls for every content screen.
 *
 * Six screens edit different things but all need the same handful of
 * behaviours: a publish state, a feature flag, an ordering number, SEO
 * overrides, list-of-strings editing, and a destructive action that asks
 * first. Building them once means all six behave identically, which is most of
 * what makes an admin feel coherent rather than assembled.
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={CONTENT_STATUS_TONE[status]}>{CONTENT_STATUS_LABELS[status]}</Badge>;
}

export function StatusSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ContentStatus;
  onChange: (value: ContentStatus) => void;
}) {
  return (
    <Field
      label="Status"
      htmlFor={id}
      hint={
        value === 'published'
          ? 'Visible on the public site.'
          : value === 'draft'
            ? 'Only visible here. Nothing public changes.'
            : 'Withdrawn from the site but kept, because orders may reference it.'
      }
    >
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as ContentStatus)}>
        {CONTENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CONTENT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Ordering and feature flag
// ---------------------------------------------------------------------------

export function DisplayControls({
  idPrefix,
  featured,
  sortOrder,
  onFeaturedChange,
  onSortOrderChange,
  featuredHint = 'Featured items are highlighted on the homepage.',
}: {
  idPrefix: string;
  featured: boolean;
  sortOrder: number;
  onFeaturedChange: (value: boolean) => void;
  onSortOrderChange: (value: number) => void;
  featuredHint?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Display order"
        htmlFor={`${idPrefix}-sort`}
        hint="Lower numbers come first. Leave gaps (10, 20, 30) so things can be slotted between later."
      >
        <Input
          id={`${idPrefix}-sort`}
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => onSortOrderChange(Number(e.target.value) || 0)}
        />
      </Field>

      <div className="flex items-end pb-1">
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="size-4 rounded border-ink-600 bg-ink-900 accent-gold-500"
          />
          <span>
            Featured
            <span className="block text-xs text-ink-400">{featuredHint}</span>
          </span>
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

/**
 * SEO overrides.
 *
 * Both fields are optional, and blank is the right default. The site already
 * derives a sensible title and description from the content itself; an
 * override exists for the cases where that is not good enough, not as a field
 * to fill in for its own sake. Empty means "use the page's own".
 */
export function SeoFields({
  idPrefix,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  idPrefix: string;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <details className="rounded-md border border-ink-700 bg-ink-900 px-4 py-3">
      <summary className="cursor-pointer text-sm text-gold-400">Search engine overrides</summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs leading-relaxed text-ink-400">
          Leave these blank unless you have a reason. The page already builds a title and
          description from the content, and an override that is worse than the default is worse
          than no override.
        </p>
        <Field
          label="SEO title"
          htmlFor={`${idPrefix}-seo-title`}
          hint={`${title.length}/60 characters is the usual limit before Google truncates.`}
        >
          <Input
            id={`${idPrefix}-seo-title`}
            value={title}
            maxLength={120}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </Field>
        <Field
          label="Meta description"
          htmlFor={`${idPrefix}-seo-description`}
          hint={`${description.length}/160 characters is the usual limit.`}
        >
          <Textarea
            id={`${idPrefix}-seo-description`}
            rows={2}
            maxLength={320}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </Field>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// String list
// ---------------------------------------------------------------------------

/**
 * Editing a list of short strings: bullet points, highlights, parts notes.
 *
 * A textarea with one entry per line rather than a row of inputs with add and
 * remove buttons. It is faster to type, it pastes from a document, and
 * reordering is just moving a line.
 */
export function StringListEditor({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  // Local state so a trailing blank line survives while typing. It is seeded
  // once and never re-synced from props: every form using this is keyed on the
  // record id, so switching records remounts the component and the seed runs
  // again. Syncing in an effect would mean setState during render, which this
  // codebase treats as a defect rather than a warning.
  const [text, setText] = useState(() => value.join(String.fromCharCode(10)));

  return (
    <Field label={label} htmlFor={id} hint={hint ?? 'One per line.'}>
      <Textarea
        id={id}
        rows={rows}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export type Notice = { tone: 'ok' | 'danger'; text: string } | null;

/**
 * A transient success or failure message.
 *
 * Success messages clear themselves; failures do not. An error that vanishes
 * before it is read is worse than no error.
 */
export function NoticeBar({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  useEffect(() => {
    if (notice?.tone !== 'ok') return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <div
      role={notice.tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'mb-4 flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm',
        notice.tone === 'ok'
          ? 'border-ok-600/40 bg-ok-600/10 text-ok-400'
          : 'border-danger-500/40 bg-danger-500/10 text-danger-400',
      )}
    >
      <span>{notice.text}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 text-xs opacity-70 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
}

/**
 * A destructive action that asks first.
 *
 * Two clicks, in place, rather than a modal. The confirmation resets itself
 * after a few seconds so a half-pressed button does not stay armed.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Confirm',
  disabled,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (armed) {
    return (
      <span className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setArmed(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs text-ink-400 hover:text-ink-200"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setArmed(true)}
      className={cn('text-xs text-ink-400 hover:text-danger-400 disabled:opacity-40', className)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

export function SlugField({
  id,
  value,
  onChange,
  suggestion,
  hint = 'Used in the page address. Changing it breaks any existing link.',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestion?: string;
  hint?: string;
}) {
  return (
    <Field label="Slug" htmlFor={id} hint={hint} required>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder={suggestion}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        {suggestion && suggestion !== value ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(suggestion)}>
            Use name
          </Button>
        ) : null}
      </div>
    </Field>
  );
}
