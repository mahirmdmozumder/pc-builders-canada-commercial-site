/**
 * Policy content.
 *
 * IMPORTANT: these are operational drafts describing how the business
 * intends to work. They are NOT legal advice and have not been reviewed by a
 * lawyer. Consumer protection legislation differs by province, and some of
 * these areas (warranty, returns, privacy) carry statutory minimums that
 * override whatever a policy page says.
 *
 * Every page renders a visible notice to that effect. Remove the notice only
 * once the text has been reviewed and the placeholders below are filled in:
 *   - legal business name and address
 *   - contact address for privacy and warranty claims
 *   - actual carrier, transit times and service area
 *   - the return window and restocking terms the business will honour
 */

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

const PLACEHOLDER_CONTACT = 'the contact address published on our contact page';

export const POLICIES: Policy[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'What personal information PC Builders Canada collects, why, where it is stored, and how to ask for it to be removed.',
    summary:
      'We collect what an order needs and nothing else. Payment card details never reach our systems.',
    lastReviewed: 'Draft — not yet reviewed',
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
          `You can ask for a copy of what we hold about you, ask for corrections, or ask for deletion of anything not required for a tax or warranty record. Write to ${PLACEHOLDER_CONTACT}.`,
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
    lastReviewed: 'Draft — not yet reviewed',
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
    lastReviewed: 'Draft — not yet reviewed',
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
          `Inspect the box on arrival. If there is visible damage, photograph it before unpacking and contact ${PLACEHOLDER_CONTACT} the same day. Photographs taken before unpacking make a carrier claim straightforward and their absence makes it difficult.`,
        ],
      },
      {
        heading: 'Carrier and transit times',
        paragraphs: [
          'Carrier selection and published transit times are being finalised and will be listed here.',
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
    lastReviewed: 'Draft — not yet reviewed',
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
          'A machine built to a specification chosen by the customer is not a stock item. Once assembled and tested, returns are handled case by case, and a restocking charge may apply to cover the labour and the loss in value of opened components.',
          'This does not affect a return for a faulty machine, which is covered by the warranty policy.',
        ],
      },
      {
        heading: 'Individual components',
        paragraphs: [
          'Unopened components in original packaging can be returned within the return window shown at checkout. Opened components may be subject to a restocking charge, and some categories cannot be returned once opened.',
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
        heading: 'To be confirmed',
        paragraphs: [
          'The exact return window and restocking percentages are being finalised and will be published here before they are applied to any order.',
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
    lastReviewed: 'Draft — not yet reviewed',
    sections: [
      {
        heading: 'Two kinds of coverage',
        paragraphs: [
          'Components carry the warranty offered by their manufacturer, for the period that manufacturer sets. That coverage is between you and them, and we will help you use it.',
          'Our own work, meaning the assembly, cabling and configuration, is covered by us. If something we did causes a fault, we fix it.',
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
          `Open a support ticket from your account, or write to ${PLACEHOLDER_CONTACT} with your order number and a description of the fault, including when it happens and what you have already tried. Diagnosis comes first: replacing parts without identifying the cause usually moves the symptom rather than fixing it.`,
        ],
      },
      {
        heading: 'Statutory rights',
        paragraphs: [
          'Consumer protection legislation in your province may give you rights beyond this policy. Nothing here limits them.',
        ],
      },
      {
        heading: 'To be confirmed',
        paragraphs: [
          'The coverage period for assembly work, and the process for on-site versus return-to-base service, are being finalised and will be published here.',
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((policy) => policy.slug === slug);
}
