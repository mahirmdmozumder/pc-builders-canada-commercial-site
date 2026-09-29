import { REFERRAL } from '@/content/business';

/**
 * Attaches a referral to the free-text field a form already has.
 *
 * There is deliberately no `referred_by` COLUMN. Adding one would mean a
 * schema migration, and the storefront already has an unapplied migration
 * waiting; shipping a second one would mean the referral box silently dropped
 * every answer until both were run. Prefixing the notes works the moment this
 * deploys, needs no migration, and puts the referral in front of whoever reads
 * the quote — which is the entire operational requirement at this volume.
 *
 * If referral reporting is ever wanted (how many, from whom, converting at
 * what rate), promote it to its own column then. Until somebody actually wants
 * that report, a column would be storage with no reader.
 */
export function withReferral(notes: string | null | undefined, referredBy: string | null | undefined): string | null {
  const referral = referredBy?.trim();
  const body = notes?.trim() ?? '';

  if (!referral || !REFERRAL.active) return body || null;

  // Leading, so it is the first thing visible in the admin list and in the
  // notification email rather than buried under a long description.
  const header = `[Referred by: ${referral}]`;
  return body ? `${header}\n\n${body}` : header;
}
