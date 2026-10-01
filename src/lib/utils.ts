/** Tiny class-name joiner. Avoids pulling in clsx/tailwind-merge for this. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

const CAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
});

const CAD_WHOLE = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Money is stored and calculated in cents; format only at the edge. */
export function formatMoney(cents: number, opts: { whole?: boolean } = {}): string {
  const value = cents / 100;
  return opts.whole && Number.isInteger(value) ? CAD_WHOLE.format(value) : CAD.format(value);
}

/**
 * Turns a dollar figure typed by a person into integer cents.
 *
 * The rounding is the whole point. `19.99 * 100` is 1998.9999999999998 in
 * IEEE754, so truncating sells the part for $19.98 — a bug that is invisible in
 * review, shows up as a one-cent discrepancy nobody can reproduce, and compounds
 * once a quantity multiplies it.
 *
 * Returns null for anything that is not a usable amount: blank, non-numeric,
 * negative, or infinite. The caller decides what to say about that, because "you
 * left it blank" and "that is not a number" are different messages.
 */
export function dollarsToCents(input: string | number): number | null {
  const text = String(input).trim();
  if (text === '') return null;

  const dollars = Number(text);
  if (!Number.isFinite(dollars) || dollars < 0) return null;

  return Math.round(dollars * 100);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Human-quotable reference, e.g. PCB-7K2M9Q. Ambiguous characters (0/O, 1/I)
 * are excluded so references survive being read out over the phone.
 */
export function generateReference(prefix: string): string {
  let body = '';
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    body += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `${prefix}-${body}`;
}

export function titleCase(input: string): string {
  return input.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** Truncate for table cells without breaking mid-entity. */
export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}
