/**
 * How long ago a product's price was last checked against the market.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS MATTERS HERE SPECIFICALLY
 * ---------------------------------------------------------------------------
 * This business does not hold stock. Parts are sourced after an order is paid,
 * which means every listed price is a promise to supply at that number, settled
 * before the cost of supplying it is known. A price that has drifted below
 * current retail is not a cosmetic problem: it is a sale made at a loss, or an
 * order that has to be cancelled after the customer's card was charged.
 *
 * That already happened. A graphics card sat at $1,249.99 for eighteen days
 * while the retailer moved to $1,399.00 — a $149 loss on every unit, found by
 * accident rather than by looking. Nothing in the application could have
 * surfaced it, because nothing read the one field that would have said so.
 *
 * ---------------------------------------------------------------------------
 * THE DATE WE ALREADY HAVE
 * ---------------------------------------------------------------------------
 * `specs.price_checked` has been recorded by hand on every seeded row since the
 * catalogue began — a date string saying when that price was read from a
 * retailer listing. It was written for a human reading the spec sheet. This
 * module turns it into something the admin can sort and filter by, so the next
 * drifted price gets found by looking rather than by stumbling.
 *
 * It is read out of `specs` rather than promoted to a column on purpose, for
 * now: the column would be the right home, and migration 0011 in the catalogue
 * plan proposes exactly that as `last_verified_at`. Until then this reads what
 * is actually there, because a report that only covers rows somebody has since
 * migrated is a report that misses the stale ones.
 *
 * ---------------------------------------------------------------------------
 * ABSENT IS NOT FRESH
 * ---------------------------------------------------------------------------
 * A row with no `price_checked` at all reports `unknown`, and `unknown` sorts
 * alongside the stale rather than the fresh. A missing date does not mean the
 * price is fine; it means nobody ever wrote down that they looked. Rows added
 * straight through the admin are the likeliest to have none, and they are also
 * the likeliest to have been entered once and never revisited.
 */

/**
 * ---------------------------------------------------------------------------
 * WHY THE WINDOW DEPENDS ON THE CATEGORY
 * ---------------------------------------------------------------------------
 * The first version of this module used one threshold for everything: fresh
 * for thirty days, stale after sixty. Checked against the one drift anybody
 * had actually found — a graphics card $149 under retail — it would have
 * called that card FRESH and said nothing. The price had moved in eighteen
 * days.
 *
 * A single window is therefore not a conservative choice, it is a wrong one.
 * sample-catalog.ts has said so since the catalogue began: memory and storage
 * pricing rose sharply through 2026, and graphics card availability churns
 * monthly. A case or a fan can sit for two months without moving a dollar.
 *
 * So the fast-moving categories get half the window. Eighteen days now reads
 * as ageing for a graphics card and fresh for a case, which is what the
 * underlying markets actually do.
 */
export const FAST_MOVING_CATEGORIES: ComponentCategory[] = ['gpu', 'ram', 'storage'];

/** Checked within this many days: no action needed. */
export const PRICE_FRESH_DAYS = 30;

/** Older than this: treat as unreliable until re-checked. */
export const PRICE_STALE_DAYS = 60;

/** The same two bounds for categories whose prices move monthly. */
export const PRICE_FRESH_DAYS_FAST = 14;
export const PRICE_STALE_DAYS_FAST = 30;

export interface FreshnessWindow {
  fresh: number;
  stale: number;
}

export function windowFor(category?: ComponentCategory | null): FreshnessWindow {
  return category && FAST_MOVING_CATEGORIES.includes(category)
    ? { fresh: PRICE_FRESH_DAYS_FAST, stale: PRICE_STALE_DAYS_FAST }
    : { fresh: PRICE_FRESH_DAYS, stale: PRICE_STALE_DAYS };
}

import type { ComponentCategory } from '@/lib/catalog/types';

export type PriceFreshness = 'fresh' | 'ageing' | 'stale' | 'unknown';

export interface PriceCheck {
  /** The date exactly as recorded, or null when nothing was recorded. */
  checkedOn: string | null;
  /** Whole days between the recorded date and `now`, or null. */
  daysAgo: number | null;
  freshness: PriceFreshness;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

/**
 * Parses a 'YYYY-MM-DD' string as UTC midnight.
 *
 * UTC rather than local, because the alternative is a date that shifts by a day
 * depending on where the server runs. "Checked 29 days ago" turning into 30 and
 * crossing a threshold because a deployment moved region is not a real change in
 * the data.
 *
 * Returns null for anything that is not that exact shape, including a real date
 * written another way. Being strict is the point: a value this cannot parse is a
 * value nobody should be reassured by, and guessing at '10/05/26' would mean
 * choosing between May and October on a coin flip.
 */
function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Rejects 2026-02-30, which Date happily rolls forward to 2 March.
  if (parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

function classify(daysAgo: number, window: FreshnessWindow): PriceFreshness {
  if (daysAgo <= window.fresh) return 'fresh';
  if (daysAgo <= window.stale) return 'ageing';
  return 'stale';
}

/**
 * Reads the price-check date out of a product's `specs` bag.
 *
 * `now` is a parameter rather than a call to Date.now() so this is testable and
 * so a report can be run "as at" a date. Callers in the UI pass new Date().
 *
 * A date in the FUTURE reports zero days ago and reads as fresh. It is a typo
 * rather than a signal, and treating it as stale would hide a row behind an
 * alarm about the wrong thing.
 */
export function readPriceCheck(
  specs: Record<string, unknown> | null | undefined,
  now: Date,
  category?: ComponentCategory | null,
): PriceCheck {
  const raw = specs?.price_checked;
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { checkedOn: null, daysAgo: null, freshness: 'unknown' };
  }

  const checked = parseIsoDate(raw.trim());
  if (!checked) {
    return { checkedOn: null, daysAgo: null, freshness: 'unknown' };
  }

  const daysAgo = Math.max(0, Math.floor((now.getTime() - checked.getTime()) / MS_PER_DAY));
  return {
    checkedOn: raw.trim(),
    daysAgo,
    freshness: classify(daysAgo, windowFor(category)),
  };
}

/**
 * Staleness score: HIGHER means more in need of a look. Sort DESCENDING.
 *
 * The direction is stated twice because the first version of this function got
 * it wrong in a way that type-checked perfectly. It was documented as "lowest
 * first" while returning +Infinity for the never-checked rows, which would have
 * buried the most urgent rows at the bottom of the screen built to surface
 * them. A score and a sort direction have to be described together or one of
 * them is a guess.
 *
 * `unknown` scores above every dated row, for the reason in the header: no
 * recorded check is not evidence of a current price, and a dated row at least
 * tells you how far out it might be.
 */
export function priceCheckSortWeight(check: PriceCheck): number {
  if (check.freshness === 'unknown') return Number.POSITIVE_INFINITY;
  return check.daysAgo ?? 0;
}

/** Short label for a table cell. */
export function describePriceCheck(check: PriceCheck): string {
  if (check.freshness === 'unknown') return 'Never recorded';
  if (check.daysAgo === 0) return 'Today';
  if (check.daysAgo === 1) return 'Yesterday';
  return `${check.daysAgo} days ago`;
}

export interface FreshnessSummary {
  total: number;
  fresh: number;
  ageing: number;
  stale: number;
  unknown: number;
  /** Past the window entirely, or never recorded. These cannot be trusted. */
  needsAttention: number;
  /**
   * Everything not fresh, which is what the admin banner counts.
   *
   * `needsAttention` alone was the wrong trigger and the live catalogue proved
   * it. Checked against real data the day this shipped, no row was stale or
   * undated — but eleven were ageing, and among them sat the very graphics card
   * that had drifted $149. A banner keyed on stale-or-never would have stayed
   * silent on the one row the whole feature was built to surface.
   *
   * Ageing is not an emergency; it is the point at which looking is cheap and
   * the drift is still small. That is the thing worth putting on screen.
   */
  dueRecheck: number;
}

export function summarisePriceChecks(checks: PriceCheck[]): FreshnessSummary {
  const summary: FreshnessSummary = {
    total: checks.length,
    fresh: 0,
    ageing: 0,
    stale: 0,
    unknown: 0,
    needsAttention: 0,
    dueRecheck: 0,
  };
  for (const check of checks) {
    summary[check.freshness] += 1;
  }
  summary.needsAttention = summary.stale + summary.unknown;
  summary.dueRecheck = summary.ageing + summary.stale + summary.unknown;
  return summary;
}
