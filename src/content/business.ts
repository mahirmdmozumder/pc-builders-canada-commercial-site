/**
 * Business contact details and the referral offer.
 *
 * One place, because these appear on the scan landing page, on printed cards,
 * in structured data and in the referral terms, and four copies of a phone
 * number is three chances to have the wrong one.
 *
 * ---------------------------------------------------------------------------
 * NULL MEANS "NOT SET UP YET", AND THE UI RESPECTS THAT
 * ---------------------------------------------------------------------------
 * Every channel below is nullable, and every consumer renders only the ones
 * that are filled in. A missing phone number shows no Call button at all,
 * rather than a button that dials nothing. A missing Google listing shows no
 * Reviews link, rather than one pointing at a profile with no reviews on it.
 *
 * This matters more than usual here: these links get printed on a card and
 * handed to strangers. A dead button on a page someone reached from a physical
 * card is worse than no button, because they cannot tell whether the business
 * is broken or just new.
 *
 * To turn one on, replace the null with the real value and deploy. Nothing
 * else needs changing.
 */

export interface BusinessChannels {
  /** E.164 for the link, e.g. '+14165550123'. Null until a business line exists. */
  phone: string | null;
  /** How the number should read on screen, e.g. '(416) 555-0123'. */
  phoneDisplay: string | null;
  /** Whether that number accepts SMS. A landline does not. */
  phoneAcceptsSms: boolean;
  /** Public business address. Null while trading without a shopfront. */
  email: string | null;
  /** Full profile URL, not a handle. */
  instagram: string | null;
  facebook: string | null;
  /**
   * The "write a review" short link from a Google Business Profile.
   * Requires a verified profile first — see docs/local-marketing.md.
   */
  googleReviewUrl: string | null;
  /** The profile itself, for people who want to read reviews rather than leave one. */
  googleProfileUrl: string | null;
}

export const CHANNELS: BusinessChannels = {
  phone: '+17788773823',
  phoneDisplay: '+1 778-877-3823',
  phoneAcceptsSms: true,
  email: 'hellopcbuilderscanada@gmail.com',
  instagram: null,
  facebook: null,
  googleReviewUrl: null,
  googleProfileUrl: null,
};

/** True when at least one direct channel exists, so the section can be hidden wholesale. */
export const hasDirectContact = Boolean(CHANNELS.phone || CHANNELS.email);

// ---------------------------------------------------------------------------
// Referral offer
// ---------------------------------------------------------------------------

/**
 * The referral offer, as it is advertised and as it is honoured.
 *
 * Two deliberate choices, both of them about not losing money on a promise
 * printed on a card that cannot be recalled:
 *
 *   1. It applies to LABOUR, not to hardware. Parts are sold on thin margin,
 *      so $25 off a $2,000 build can exceed the margin on the whole order,
 *      while $25 off a service is a known cost.
 *
 *   2. The referrer is credited only after the friend's job is PAID. Crediting
 *      on the booking invites a no-show to cost real money.
 *
 * `active: false` hides the offer everywhere at once, which is the switch to
 * reach for if it ever needs pulling faster than a reprint allows.
 */
export interface ReferralOffer {
  active: boolean;
  /** Discount in cents, for both sides. */
  amountCents: number;
  /** Minimum service value before the discount applies, in cents. */
  minimumSpendCents: number;
  /** How long a credit stays claimable, in months. */
  expiryMonths: number;
  /** Version string printed on cards, so a card can be matched to its terms. */
  termsVersion: string;
}

export const REFERRAL: ReferralOffer = {
  active: true,
  amountCents: 2500,
  minimumSpendCents: 7500,
  expiryMonths: 12,
  termsVersion: '2026-09',
};
