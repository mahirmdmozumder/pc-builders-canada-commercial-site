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
// Opening hours
// ---------------------------------------------------------------------------

/**
 * When somebody can expect an answer.
 *
 * One table, because these appear on the contact page, the about page, the FAQ
 * and in LocalBusiness structured data. Hours that disagree between the page
 * and the markup are the kind of thing Google flags, and the kind of thing a
 * customer turns up for.
 *
 * `null` means closed that day, which is a different statement from "hours not
 * published" — see HOURS_PUBLISHED below.
 *
 * Times are 24-hour local, and the zone is stated rather than assumed. A
 * customer in Vancouver reading "10 to 8" without a zone is being told
 * something untrue by omission.
 */
export interface DayHours {
  /** Schema.org day name, used directly in openingHoursSpecification. */
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  /** 'HH:MM' in TIMEZONE_LABEL, or null when closed. */
  opens: string | null;
  closes: string | null;
}

export const TIMEZONE = 'America/Toronto';
export const TIMEZONE_LABEL = 'Eastern time';

export const HOURS: DayHours[] = [
  { day: 'Monday', opens: '10:00', closes: '20:00' },
  { day: 'Tuesday', opens: '10:00', closes: '20:00' },
  { day: 'Wednesday', opens: '10:00', closes: '20:00' },
  { day: 'Thursday', opens: '10:00', closes: '20:00' },
  { day: 'Friday', opens: '10:00', closes: '20:00' },
  { day: 'Saturday', opens: '10:00', closes: '20:00' },
  { day: 'Sunday', opens: null, closes: null },
];

/**
 * Whether to publish hours at all.
 *
 * Set false to withdraw them everywhere, including from structured data, rather
 * than editing seven rows to null — which would publish "closed every day".
 */
export const HOURS_PUBLISHED = true;

/** '10:00' as '10am', because nobody says "ten hundred" about a repair shop. */
export function formatTime(time: string): string {
  const [rawHour, minute] = time.split(':');
  const hour = Number(rawHour);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minute === '00' ? `${twelve}${suffix}` : `${twelve}:${minute}${suffix}`;
}

/**
 * Collapses the week into the shortest honest description.
 *
 * "Monday to Saturday, 10am to 8pm" rather than six identical rows. Runs of
 * matching days are grouped, so changing one day's hours changes the summary
 * automatically instead of leaving a hand-written sentence behind.
 */
export function summariseHours(): { label: string; hours: string }[] {
  const groups: { days: DayHours[]; opens: string | null; closes: string | null }[] = [];

  for (const entry of HOURS) {
    const last = groups[groups.length - 1];
    if (last && last.opens === entry.opens && last.closes === entry.closes) {
      last.days.push(entry);
    } else {
      groups.push({ days: [entry], opens: entry.opens, closes: entry.closes });
    }
  }

  return groups.map((group) => {
    const first = group.days[0].day;
    const last = group.days[group.days.length - 1].day;
    const label = group.days.length === 1 ? first : `${first} to ${last}`;
    const hours =
      group.opens && group.closes
        ? `${formatTime(group.opens)} to ${formatTime(group.closes)}`
        : 'Closed';
    return { label, hours };
  });
}

// ---------------------------------------------------------------------------
// In person
// ---------------------------------------------------------------------------

/**
 * Whether, and how, a customer can meet the business in person.
 *
 * NO ADDRESS IS PUBLISHED, and there is no field for one. This is a service-area
 * business working out of a workspace, not a shop with a counter. Publishing an
 * address would invite people to turn up to something that is not a storefront,
 * and inventing one would be worse.
 *
 * Pickup and drop-off happen, but by arrangement — so the copy says "arrange it
 * first" everywhere rather than implying a door that can be walked through.
 */
export interface InPersonPolicy {
  /** Finished machines and hardware can be collected. */
  pickup: boolean;
  /** A machine can be left with us for work. */
  dropOff: boolean;
  /** Both require arranging in advance. */
  byAppointment: boolean;
  /** We travel to the customer for on-site work. */
  onSite: boolean;
  /** True only if there is a storefront the public may walk into. There is not. */
  walkIn: boolean;
}

export const IN_PERSON: InPersonPolicy = {
  pickup: true,
  dropOff: true,
  byAppointment: true,
  onSite: true,
  walkIn: false,
};

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
