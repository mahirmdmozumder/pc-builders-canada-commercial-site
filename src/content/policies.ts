import { CHANNELS } from '@/content/business';
import { TAX_REGISTRATION } from '@/lib/pricing/tax';

/**
 * Policy content.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE ARE
 * ---------------------------------------------------------------------------
 * A plain description of how PC Builders Canada actually operates, confirmed by
 * the owner. They are NOT drafted by a lawyer, and having them reviewed before
 * relying on them as formal legal documents remains a sensible step.
 *
 * Consumer protection legislation differs by province and carries statutory
 * minimums that override whatever a policy page says. Every page therefore
 * states that provincial law prevails, which is both true and the honest
 * position for a small seller.
 *
 * ---------------------------------------------------------------------------
 * RULES FOR EDITING
 * ---------------------------------------------------------------------------
 * Nothing here may state a term the business has not confirmed. That is why
 * there is no invented transit time, no restocking percentage and no data
 * retention period: each was either confirmed by the owner, or written as the
 * thing that is actually true -- "quoted before you return anything", "kept as
 * long as required for tax and warranty purposes".
 *
 * Contact details come from src/content/business.ts rather than being typed
 * here, so a changed address changes on every page at once.
 */

const REVIEWED = '30 September 2026';

export interface PolicySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Policy {
  slug: string;
  title: string;
  description: string;
  summary: string;
  lastReviewed: string;
  sections: PolicySection[];
}

/**
 * Read from the single source of truth rather than typed into five sections.
 *
 * Falls back to naming the contact page when no address is configured, so a
 * policy can never instruct somebody to write to "null".
 */
const CONTACT = CHANNELS.email ?? 'the address on our contact page';

export const POLICIES: Policy[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'What personal information PC Builders Canada collects, why, where it is stored, and how to ask for it to be removed.',
    summary:
      'We collect what an order needs and nothing else. Payment card details never reach our systems.',
    lastReviewed: REVIEWED,
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'We collect the information needed to quote, build, ship and support an order. Nothing is collected for advertising or sold to anyone.',
        ],
        bullets: [
          'Account details: email address, and a name and phone number if you choose to add them.',
          'Order details: the configuration purchased, totals, and the shipping address collected during payment.',
          'Quote and support content: what you write to us, and any configuration attached to it.',
          'Technical logs: server-side error and request logs used to diagnose faults.',
        ],
      },
      {
        heading: 'What we never collect',
        paragraphs: [
          'Card numbers, expiry dates and security codes are entered on Stripe systems and never pass through, or get stored by, this website. We receive only a payment reference and whether it succeeded.',
        ],
      },
      {
        heading: 'Where it is stored',
        paragraphs: [
          'Account, order and support data is stored in a managed Postgres database with row-level access rules, so an account can only read its own records. Payment records are held by Stripe under their own terms.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Order records are kept as long as required for tax and warranty purposes. Quote and contact messages are kept while they are useful for supporting the customer, and can be deleted on request.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          `You can ask for a copy of what we hold about you, ask for corrections, or ask for deletion of anything not required for a tax or warranty record. Write to ${CONTACT}.`,
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'The site sets a session cookie when you sign in, and stores your in-progress build and cart in your own browser. There are no advertising or cross-site tracking cookies.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    description:
      'The terms that apply to orders placed with PC Builders Canada, including pricing, availability and acceptance.',
    summary:
      'Configurator totals are estimates. An order is accepted when we confirm it, not when the page says thanks.',
    lastReviewed: REVIEWED,
    sections: [
      {
        heading: 'Prices and estimates',
        paragraphs: [
          'Prices shown in the configurator are estimates built from current catalogue prices and are not an offer. Component prices move, and a configuration priced today may cost differently tomorrow.',
          'The amount charged at checkout is the amount shown on the checkout page at the time of payment.',
        ],
      },
      {
        heading: 'Order acceptance',
        paragraphs: [
          'Payment does not by itself create a contract to supply. We review each order and confirm it, and we may decline an order where a part is unavailable, where pricing was clearly wrong, or where the configuration cannot be built as specified. If we decline, payment is refunded in full.',
        ],
      },
      {
        heading: 'Availability',
        paragraphs: [
          'Stock levels shown on the site reflect our records and can be wrong. If a part is unavailable after an order is placed, we will contact you with options: wait, substitute, or refund that part.',
        ],
      },
      {
        heading: 'Compatibility and power figures',
        paragraphs: [
          'The compatibility checks and power estimates in the configurator are calculated from structured component data. They are a decision aid, not a guarantee, and they are only as good as the specifications recorded for each part. Every order is also reviewed by a person before it is built.',
        ],
      },
      {
        heading: 'Software licences',
        paragraphs: [
          'Operating system and other software licences supplied with an order are subject to the terms of their publisher.',
        ],
      },
      /**
       * Follows TAX_REGISTRATION rather than being written once.
       *
       * Static prose here was a trap. Turning registration on is two values in
       * one file, and this page would have gone on telling customers the
       * business was not registered while the checkout charged them tax --
       * a contradiction on the one page that exists to be relied on.
       */
      TAX_REGISTRATION.registered
        ? {
            heading: 'Sales tax',
            paragraphs: [
              `Sales tax is charged at the rate for your province and shown as a separate line before you pay. Our GST/HST registration number is ${TAX_REGISTRATION.number ?? 'shown on your receipt'}.`,
              'Tax is calculated on the goods, the assembly labour and the shipping together, which is the normal treatment for a product shipped within Canada.',
            ],
          }
        : {
            heading: 'Sales tax',
            paragraphs: [
              'PC Builders Canada is not currently registered to collect GST/HST, so no sales tax is added to your order and the total shown is the total you pay.',
              'If that changes, tax will appear as a separate line before you pay, and it will never be applied to an order that was already placed.',
            ],
          },
      {
        heading: 'Who you are dealing with',
        paragraphs: [
          'PC Builders Canada is a small independent business operating from Ontario, Canada, which sells and services computer hardware. It trades under that name. Contact details are on our contact page.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. A dispute that cannot be resolved between us belongs to the courts of Ontario.',
          'This does not ask you to give up protection your own province gives you. Where the consumer protection legislation of your province applies to you, it applies regardless of this clause.',
        ],
      },
      {
        heading: 'Limitation',
        paragraphs: [
          'Nothing in these terms limits rights you have under applicable consumer protection legislation. Where a term conflicts with that legislation, the legislation applies.',
        ],
      },
    ],
  },
  {
    slug: 'shipping',
    title: 'Shipping Policy',
    description:
      'How PC Builders Canada packs and ships custom PCs, expected timelines, and what happens if something arrives damaged.',
    summary: 'Built to order, so shipping starts after assembly and testing, not after payment.',
    lastReviewed: REVIEWED,
    sections: [
      {
        heading: 'Build time comes first',
        paragraphs: [
          'A custom machine is assembled and tested before it ships. The order status shows where it is: confirmed, processing, building, testing, ready, then shipped.',
          'Build time depends on part availability and current workload. An expected date is confirmed after the order is reviewed.',
        ],
      },
      {
        heading: 'Where we ship',
        paragraphs: [
          'Canada-wide. Shipping is free on systems above the threshold shown at checkout; below it, a flat rate applies. The rate charged is shown before payment.',
        ],
      },
      {
        heading: 'How systems are packed',
        paragraphs: [
          'Graphics cards are braced or removed and packed separately where their weight makes transit damage likely. The machine goes back into its case box with its original foam and accessories.',
        ],
      },
      {
        heading: 'Damage in transit',
        paragraphs: [
          `Inspect the box on arrival. If there is visible damage, photograph it before unpacking and contact ${CONTACT} the same day. Photographs taken before unpacking make a carrier claim straightforward and their absence makes it difficult.`,
        ],
      },
      {
        heading: 'Carrier and transit times',
        paragraphs: [
          'Shipping is arranged per order with a national carrier, and you get a tracking number when the machine leaves. We do not publish a transit time, because it depends on the carrier and the destination, and a number printed here would be a promise we do not control.',
          'If a delivery date matters for your order, tell us before you pay and we will confirm in writing what is achievable.',
        ],
      },
      {
        heading: 'Local pickup',
        paragraphs: [
          'Customers in the Greater Toronto Area can collect an order in person instead of having it shipped, and there is no charge for that.',
          'Pickup is arranged in advance rather than by turning up. This is a workspace rather than a shop with a counter, so a time has to be agreed first — by email or phone, using the details on our contact page.',
        ],
      },
    ],
  },
  {
    slug: 'refunds',
    title: 'Refund Policy',
    description:
      'Returns, cancellations and refunds for custom-built PCs and individual components from PC Builders Canada.',
    summary: 'Cancel before assembly starts for a full refund. Custom builds differ from stock parts.',
    lastReviewed: REVIEWED,
    sections: [
      {
        heading: 'Cancelling before assembly',
        paragraphs: [
          'An order cancelled before assembly begins is refunded in full. Contact us with the order number as soon as possible: the earlier the cancellation, the simpler it is.',
        ],
      },
      {
        heading: 'Custom builds',
        paragraphs: [
          'A machine built to a specification chosen by the customer is not a stock item and cannot simply go back on a shelf. Once it has been assembled and tested, a return is handled case by case: we look at what was built, what it would be worth as a second-hand machine, and what the labour was. Any charge is quoted to you before you return it, not deducted afterwards.',
          'This does not affect a return for a faulty machine, which is covered by the warranty policy.',
        ],
      },
      {
        heading: 'Unopened components',
        paragraphs: [
          'An unopened component in its original packaging can be returned within 14 days of delivery. Contact us first with your order number so the return is recorded against it.',
          'Return shipping on a change of mind is paid by the customer. Return shipping on a confirmed fault is not — see below.',
        ],
      },
      {
        heading: 'Opened components',
        paragraphs: [
          'An opened component can sometimes be taken back and sometimes cannot, depending on what it is and what condition it is in. Where we can take it back, a charge may apply to cover the drop in value, and that charge is quoted to you before you send anything. We do not publish a fixed percentage, because it genuinely depends on the item.',
          'A few things cannot be returned once opened at all, chiefly software and anything with a licence key that has been redeemed. We tell you which applies before you return it rather than after.',
        ],
      },
      {
        heading: 'Faulty items',
        paragraphs: [
          'If something arrives faulty, contact us before returning it so the fault can be confirmed and the correct process started. Return shipping on a confirmed fault is not charged to the customer.',
        ],
      },
      {
        heading: 'How refunds are issued',
        paragraphs: [
          'Refunds go back to the original payment method through Stripe. The time to appear on a statement is set by the card issuer, not by us.',
        ],
      },
      {
        heading: 'Your rights under provincial law',
        paragraphs: [
          'Consumer protection legislation in your province may give you rights beyond this policy, and nothing here reduces them. Where this policy and that legislation disagree, the legislation applies.',
        ],
      },
    ],
  },
  {
    slug: 'warranty',
    title: 'Warranty Policy',
    description:
      'How warranty works on custom PCs from PC Builders Canada: manufacturer coverage on parts and our coverage on assembly.',
    summary:
      'Parts carry their manufacturer warranty. Our work on the assembly is covered separately.',
    lastReviewed: REVIEWED,
    sections: [
      {
        heading: 'Two kinds of coverage',
        paragraphs: [
          'Our own work is covered by us for one year. That means the building, the cabling, the configuration, the repair or the servicing: if we made a mistake doing any of it and that mistake causes a fault, we fix it at no charge for twelve months from the date you received the work.',
          'Components carry the warranty offered by their manufacturer, for whatever period that manufacturer sets. That is a separate thing from our one year, and it is not something we can extend or shorten. Our one year is not a manufacturer warranty, and we do not claim that every part carries one.',
          'In practice the distinction rarely costs you anything, because we do the diagnosis either way. If the fault turns out to be a faulty part rather than our work, we tell you whose warranty applies and help you claim under it.',
        ],
      },
      {
        heading: 'What is not covered',
        paragraphs: [
          'Physical damage, liquid damage, damage caused by modification, and faults caused by overclocking beyond the settings the machine shipped with are not covered.',
          'Software problems unrelated to hardware, and data loss, are not warranty matters. Keep backups: no warranty replaces data.',
        ],
      },
      {
        heading: 'Making a claim',
        paragraphs: [
          `Open a support ticket from your account, or write to ${CONTACT} with your order number and a description of the fault, including when it happens and what you have already tried. Diagnosis comes first: replacing parts without identifying the cause usually moves the symptom rather than fixing it.`,
        ],
      },
      {
        heading: 'Statutory rights',
        paragraphs: [
          'Consumer protection legislation in your province may give you rights beyond this policy. Nothing here limits them.',
        ],
      },
      {
        heading: 'How the repair happens',
        paragraphs: [
          'For customers in the Greater Toronto Area we come to you where the job can be done on site, or you drop the machine off with us by arrangement. Either way there is no shipping cost to you on a warranty repair that is our responsibility.',
          'For customers further away we work out the most sensible route with you before anything is sent, so nobody posts a tower across the country on a guess.',
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((policy) => policy.slug === slug);
}
