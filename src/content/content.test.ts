import { describe, expect, it } from 'vitest';
import { ALL_FAQS, FAQ_GROUPS } from '@/content/faqs';
import { POLICIES } from '@/content/policies';
import {
  CHANNELS,
  HOURS,
  HOURS_PUBLISHED,
  IN_PERSON,
  formatTime,
  summariseHours,
} from '@/content/business';
import { TAX_REGISTRATION } from '@/lib/pricing/tax';

/**
 * Customer-facing copy.
 *
 * Two classes of failure are guarded here, and both of them shipped at least
 * once on this site:
 *
 *   1. PLACEHOLDER LANGUAGE REACHING A CUSTOMER. Five policy pages told
 *      visitors that terms were "being finalised and will be published here".
 *      That is fine in a draft and indefensible on a site taking payments, and
 *      it is invisible to every other kind of test.
 *
 *   2. COPY THAT CLAIMS MORE THAN THE BUSINESS CAN BACK. An invented transit
 *      time, a restocking percentage nobody agreed, an address that does not
 *      exist, a rating nobody gave.
 */

/** Phrases that mean "this page is not finished" to somebody reading it. */
const UNFINISHED = [
  'coming soon',
  'will be published',
  'being finalised',
  'being finalized',
  'to be confirmed',
  'under construction',
  'lorem ipsum',
  'tbd',
  'todo',
  'xxx',
  'placeholder',
  'not yet reviewed',
];

function policyText(): string {
  return POLICIES.flatMap((policy) => [
    policy.title,
    policy.description,
    policy.summary,
    policy.lastReviewed,
    ...policy.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]),
  ]).join('\n');
}

function faqText(): string {
  return FAQ_GROUPS.flatMap((group) => [
    group.title,
    group.blurb,
    ...group.faqs.flatMap((faq) => [faq.question, ...faq.answer]),
  ]).join('\n');
}

describe('no unfinished copy reaches a customer', () => {
  it('has none in the policy pages', () => {
    const haystack = policyText().toLowerCase();
    for (const phrase of UNFINISHED) {
      expect(haystack, `policies contain "${phrase}"`).not.toContain(phrase);
    }
  });

  it('has none in the FAQ', () => {
    const haystack = faqText().toLowerCase();
    for (const phrase of UNFINISHED) {
      expect(haystack, `FAQ contains "${phrase}"`).not.toContain(phrase);
    }
  });

  it('gives every policy a real review date rather than a status word', () => {
    for (const policy of POLICIES) {
      // A date, not "Draft" — the field used to hold the latter.
      expect(policy.lastReviewed, policy.slug).toMatch(/\d{4}/);
    }
  });
});

describe('policies do not invent terms', () => {
  it('still has all five pages', () => {
    expect(POLICIES.map((p) => p.slug).sort()).toEqual([
      'privacy',
      'refunds',
      'shipping',
      'terms',
      'warranty',
    ]);
  });

  it('gives every section something to say', () => {
    for (const policy of POLICIES) {
      expect(policy.sections.length, policy.slug).toBeGreaterThan(2);
      for (const section of policy.sections) {
        expect(section.heading.trim(), policy.slug).not.toBe('');
        const body = [...section.paragraphs, ...(section.bullets ?? [])];
        expect(body.length, `${policy.slug} / ${section.heading}`).toBeGreaterThan(0);
        for (const line of body) {
          expect(line.trim().length, `${policy.slug} / ${section.heading}`).toBeGreaterThan(20);
        }
      }
    }
  });

  /**
   * No street address anywhere. There is no storefront, and a policy page is
   * exactly where an invented one would get written to look legitimate.
   */
  it('publishes no postal address', () => {
    const haystack = `${policyText()}\n${faqText()}`;
    // A unit/street-number pattern, e.g. "123 Main St" or "Unit 4, 55 King".
    expect(haystack).not.toMatch(/\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Way|Court|Crt)\b/);
    expect(haystack).not.toMatch(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/); // Canadian postal code
  });

  /**
   * The warranty is one year on OUR WORK. Representing it as a manufacturer
   * warranty, or implying every part carries a year, is the specific
   * misstatement the owner asked to avoid.
   */
  it('keeps our warranty distinct from a manufacturer warranty', () => {
    const warranty = POLICIES.find((p) => p.slug === 'warranty')!;
    const text = warranty.sections
      .flatMap((s) => s.paragraphs)
      .join(' ')
      .toLowerCase();

    expect(text).toContain('one year');
    // Must say plainly that the two are different things.
    expect(text).toContain('not a manufacturer warranty');
    // Must never assert a blanket one-year manufacturer term.
    expect(text).not.toMatch(/1-year manufacturer|one-year manufacturer|manufacturer warranty of one year/);
  });

  it('states the return window the owner confirmed, and only that', () => {
    const refunds = POLICIES.find((p) => p.slug === 'refunds')!;
    const text = refunds.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toContain('14 days');
    // No invented restocking percentage. The confirmed position is that a
    // charge is quoted per item, not published as a rate.
    expect(text).not.toMatch(/\b\d{1,2}\s?%/);
  });

  it('promises no transit time', () => {
    const shipping = POLICIES.find((p) => p.slug === 'shipping')!;
    const text = shipping.sections.flatMap((s) => s.paragraphs).join(' ').toLowerCase();
    expect(text).not.toMatch(/\b\d+\s*(to|-|–)\s*\d+\s*(business\s+)?days?\b/);
    expect(text).not.toMatch(/\bnext[- ]day\b|\bovernight\b|\bwithin \d+ days\b/);
  });

  it('names Ontario as the governing law, since that was confirmed', () => {
    const terms = POLICIES.find((p) => p.slug === 'terms')!;
    const text = terms.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toContain('Ontario');
  });

  /**
   * Asserted in BOTH directions, because only testing the current one is how
   * the flag became a trap. The original version checked the unregistered case
   * and would have passed silently while the page told registered customers
   * the business collected no tax.
   */
  it('describes the tax position that is actually configured', () => {
    const terms = POLICIES.find((p) => p.slug === 'terms')!;
    const text = terms.sections.flatMap((s) => s.paragraphs).join(' ');

    // Both branches state that GST/HST is charged at checkout, which is the
    // customer-facing fact. What must differ is the disclosure of whether
    // registration is in place yet.
    expect(text).toContain('GST/HST is charged at checkout');

    if (TAX_REGISTRATION.registered) {
      // A registrant must show its number where tax is charged.
      expect(TAX_REGISTRATION.number, 'registered with no business number').toBeTruthy();
      expect(text).toContain(TAX_REGISTRATION.number!);
      expect(text).not.toContain('completing our GST/HST registration');
    } else {
      // The status has to be disclosed rather than glossed over...
      expect(text).toContain('completing our GST/HST registration');
      // ...and it must not imply tax was taken on orders already placed, which
      // is the thing that would actually be a misstatement.
      expect(text).not.toMatch(/tax (has been|was) (collected|charged)/i);
    }
  });

  it('keeps exactly one tax section whichever way the flag is set', () => {
    const terms = POLICIES.find((p) => p.slug === 'terms')!;
    expect(terms.sections.filter((s) => s.heading === 'GST/HST')).toHaveLength(1);
  });

  /**
   * Pre-order terms. The business builds to order and takes payment before
   * sourcing, which is a material thing for a customer to know before paying and
   * the sort of term that gets quietly dropped in a rewrite.
   */
  it('states the pre-order terms a customer needs before paying', () => {
    const terms = POLICIES.find((p) => p.slug === 'terms')!;
    const text = terms.sections.flatMap((s) => s.paragraphs).join(' ');

    // Payment precedes sourcing, and the price is fixed at checkout.
    expect(text).toMatch(/payable in full before we source/i);
    expect(text).toContain('The price you pay is the price shown at checkout');

    // A material substitution needs the customer's agreement.
    expect(text).toMatch(/equal or better in specification/i);
    expect(text).toMatch(/we ask you first/i);
  });

  it('draws the cancellation line at sourcing, both sides of it', () => {
    const refunds = POLICIES.find((p) => p.slug === 'refunds')!;
    const headings = refunds.sections.map((s) => s.heading);
    expect(headings).toContain('Cancelling before we buy the parts');
    expect(headings).toContain('Cancelling after sourcing has started');

    const text = refunds.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/refunded in full/i);
    // Still no invented blanket fee on the post-sourcing side.
    expect(text).toMatch(/case by case/i);
  });

  it('covers a component that arrives faulty', () => {
    const warranty = POLICIES.find((p) => p.slug === 'warranty')!;
    expect(warranty.sections.map((s) => s.heading)).toContain('If it arrives faulty');
    const text = warranty.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/no cost to you including shipping both ways/i);
  });

  /**
   * Fulfilment is promised as a written per-order estimate, never as a published
   * range. There is no agreed build time to publish, and a number here would be
   * a commitment nobody made -- which is also why the shipping test below still
   * forbids numeric day ranges.
   */
  it('promises an estimate per order rather than a published build time', () => {
    const shipping = POLICIES.find((p) => p.slug === 'shipping')!;
    const text = shipping.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/written estimate for your specific order/i);
    expect(text).toMatch(/do not publish a single number/i);
  });
});

describe('FAQ', () => {
  it('asks and answers enough to be worth a page', () => {
    expect(ALL_FAQS.length).toBeGreaterThanOrEqual(20);
    expect(FAQ_GROUPS.length).toBeGreaterThanOrEqual(5);
  });

  it('gives every question a substantive answer', () => {
    for (const faq of ALL_FAQS) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true);
      expect(faq.answer.length, faq.question).toBeGreaterThan(0);
      for (const paragraph of faq.answer) {
        // A one-line answer written to fill a slot is worse than no question.
        expect(paragraph.trim().length, faq.question).toBeGreaterThan(40);
      }
    }
  });

  it('asks nothing twice', () => {
    const questions = ALL_FAQS.map((f) => f.question.toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('gives every group a unique anchor, since the sidebar links to them', () => {
    const ids = FAQ_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  /**
   * The FAQ restates the policies. If it starts quoting a figure the policies do
   * not contain, one of them is wrong and the customer cannot tell which.
   */
  it('quotes no price or duration the policies do not support', () => {
    const text = faqText();
    // The only durations that may appear are the confirmed ones.
    const durations = text.match(/\b\d+\s*(day|days|week|weeks|month|months|year|years)\b/gi) ?? [];
    for (const found of durations) {
      expect(
        /14 days|one year|12 months|twelve months/i.test(found),
        `FAQ mentions an unconfirmed duration: "${found}"`,
      ).toBe(true);
    }
  });

  it('describes the in-person position that is actually configured', () => {
    const text = faqText().toLowerCase();
    if (!IN_PERSON.walkIn) {
      // Must not imply a shop somebody can walk into.
      expect(text).toContain('rather than a storefront');
    }
    if (IN_PERSON.pickup) {
      expect(text).toContain('pickup is arranged in advance');
    }
  });

  it('only states contact details that are configured', () => {
    const text = faqText();
    if (CHANNELS.email) expect(text).toContain(CHANNELS.email);
    if (CHANNELS.phoneDisplay) expect(text).toContain(CHANNELS.phoneDisplay);
  });
});

describe('business hours', () => {
  it('covers all seven days exactly once', () => {
    expect(HOURS).toHaveLength(7);
    expect(new Set(HOURS.map((d) => d.day)).size).toBe(7);
  });

  it('pairs an opening time with a closing time, or neither', () => {
    for (const day of HOURS) {
      expect(Boolean(day.opens), day.day).toBe(Boolean(day.closes));
      if (day.opens) expect(day.opens, day.day).toMatch(/^\d{2}:\d{2}$/);
      if (day.closes) expect(day.closes, day.day).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('closes later than it opens', () => {
    for (const day of HOURS) {
      if (day.opens && day.closes) {
        expect(day.closes.localeCompare(day.opens), day.day).toBeGreaterThan(0);
      }
    }
  });

  it('reads times the way a person says them', () => {
    expect(formatTime('10:00')).toBe('10am');
    expect(formatTime('20:00')).toBe('8pm');
    expect(formatTime('12:00')).toBe('12pm');
    expect(formatTime('00:00')).toBe('12am');
    expect(formatTime('17:30')).toBe('5:30pm');
  });

  it('collapses identical days into a range', () => {
    const summary = summariseHours();
    // Mon-Sat identical, Sunday closed: two groups, not seven rows.
    expect(summary.length).toBeLessThan(7);
    expect(summary.some((g) => g.hours === 'Closed')).toBe(true);
    expect(HOURS_PUBLISHED).toBe(true);
  });
});
