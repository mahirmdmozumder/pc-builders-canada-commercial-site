import { describe, expect, it } from 'vitest';
import { withReferral } from '@/lib/referral';
import { CHANNELS, REFERRAL } from '@/content/business';

/**
 * The referral prefix ends up in a stored quote and in the email that reaches
 * the inbox, so it has to survive the awkward inputs a real form produces:
 * an empty box, a box with only spaces, and notes that are themselves empty.
 */
describe('withReferral', () => {
  it('returns the notes untouched when nobody is named', () => {
    expect(withReferral('Needs it by Friday.', null)).toBe('Needs it by Friday.');
    expect(withReferral('Needs it by Friday.', undefined)).toBe('Needs it by Friday.');
  });

  it('treats a whitespace-only entry as nobody', () => {
    // A tapped-then-abandoned field submits spaces, not an empty string.
    expect(withReferral('Notes here.', '   ')).toBe('Notes here.');
  });

  it('puts the referral first so it is visible without scrolling', () => {
    const result = withReferral('Long description of the job.', 'Jane Doe');
    expect(result?.startsWith('[Referred by: Jane Doe]')).toBe(true);
    expect(result).toContain('Long description of the job.');
  });

  it('works when there are no notes at all', () => {
    expect(withReferral(null, 'Jane Doe')).toBe('[Referred by: Jane Doe]');
    expect(withReferral('', 'Jane Doe')).toBe('[Referred by: Jane Doe]');
  });

  it('returns null rather than an empty string when there is nothing to store', () => {
    // The column is nullable; an empty string would make a row look answered.
    expect(withReferral(null, null)).toBeNull();
    expect(withReferral('  ', '  ')).toBeNull();
  });

  it('trims the name so the label stays tidy', () => {
    expect(withReferral(null, '  Jane Doe  ')).toBe('[Referred by: Jane Doe]');
  });
});

describe('referral offer configuration', () => {
  it('credits both sides the same amount', () => {
    // The offer is advertised as "$X for them, $X for you" on printed cards,
    // so one number drives both halves and cannot drift apart.
    expect(REFERRAL.amountCents).toBeGreaterThan(0);
  });

  it('sets a minimum spend above the discount', () => {
    // A minimum at or below the discount would let a job bill nothing.
    expect(REFERRAL.minimumSpendCents).toBeGreaterThan(REFERRAL.amountCents);
  });

  it('carries a terms version, so a printed card can be matched to its terms', () => {
    expect(REFERRAL.termsVersion).toMatch(/^\d{4}-\d{2}$/);
  });

  it('gives credit a finite life', () => {
    expect(REFERRAL.expiryMonths).toBeGreaterThan(0);
  });
});

describe('business channels', () => {
  /**
   * These get printed on cards. A channel that is configured but malformed
   * produces a button that fails silently on a phone, which is the worst
   * possible first impression from a card someone paid to print.
   */
  it('stores any phone number in E.164 so tel: and sms: links work', () => {
    if (!CHANNELS.phone) return;
    expect(CHANNELS.phone).toMatch(/^\+[1-9]\d{7,14}$/);
  });

  it('stores social and review links as full URLs, not handles', () => {
    for (const url of [
      CHANNELS.instagram,
      CHANNELS.facebook,
      CHANNELS.googleReviewUrl,
      CHANNELS.googleProfileUrl,
    ]) {
      if (!url) continue;
      expect(() => new URL(url)).not.toThrow();
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('has a display form for any configured phone number', () => {
    if (!CHANNELS.phone) return;
    expect(CHANNELS.phoneDisplay).toBeTruthy();
  });
});
