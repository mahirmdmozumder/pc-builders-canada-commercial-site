import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Design primitives.
 *
 * Kept small and explicit rather than pulling in a component library: the
 * surface area this project needs is a dozen elements, and a hand-rolled set
 * keeps the bundle small and the visual language consistent.
 */

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-maple-600 text-white hover:bg-maple-500 active:bg-maple-700',
  secondary:
    'bg-ink-700 text-ink-100 hover:bg-ink-600 border border-ink-600 active:bg-ink-700',
  ghost: 'text-ink-200 hover:text-white hover:bg-ink-800',
  danger: 'bg-danger-500 text-white hover:bg-danger-400',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-ink-700 bg-ink-850', className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-300">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges and status
// ---------------------------------------------------------------------------

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-ink-700 text-ink-200 border-ink-600',
  ok: 'bg-ok-600/15 text-ok-400 border-ok-600/40',
  warn: 'bg-warn-500/15 text-warn-400 border-warn-500/40',
  danger: 'bg-danger-500/15 text-danger-400 border-danger-500/40',
  info: 'bg-info-500/15 text-info-400 border-info-500/40',
  accent: 'bg-maple-600/15 text-maple-400 border-maple-600/40',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium',
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Small coloured dot used in tables and status rows. */
export function Dot({ tone = 'neutral' }: { tone?: Tone }) {
  const colour: Record<Tone, string> = {
    neutral: 'bg-ink-400',
    ok: 'bg-ok-500',
    warn: 'bg-warn-400',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
    accent: 'bg-maple-500',
  };
  return <span className={cn('inline-block size-2 rounded-full', colour[tone])} aria-hidden />;
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-md border px-4 py-3 text-sm', TONE_STYLES[tone], className)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? (
        <div className={cn(title ? 'mt-1' : undefined, 'text-ink-200')}>{children}</div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typography / layout
// ---------------------------------------------------------------------------

export function PageShell({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-10 sm:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="text-xs font-semibold tracking-[0.18em] text-maple-400 uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <div className="mt-3 text-base leading-relaxed text-ink-300">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </PageShell>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-maple-400 uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-ink-300">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-600 px-6 py-12 text-center">
      <p className="font-medium text-ink-100">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const inputClass =
  'w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-400 focus:border-maple-500 focus:outline-none';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-100">
        {label}
        {required ? (
          <span className="ml-1 text-maple-400" aria-hidden>
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-400">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-danger-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'pr-8', className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

/** Horizontally scrollable table wrapper — tables stay readable on phones. */
export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('thin-scroll -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}
      {...props}
    />
  );
}

export function DefinitionList({
  items,
  className,
}: {
  items: { term: string; value: ReactNode }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <dl className={cn('spec-grid divide-y divide-ink-700 text-sm', className)}>
      {items.map((item) => (
        <div key={item.term} className="flex justify-between gap-6 py-2">
          <dt className="text-ink-300">{item.term}</dt>
          <dd className="tnum text-right font-medium text-ink-100">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
