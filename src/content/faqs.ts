import { CHANNELS, IN_PERSON, summariseHours, TIMEZONE_LABEL } from '@/content/business';
import { PRICING_CONFIG } from '@/lib/pricing/pricing';
import { TAX_REGISTRATION } from '@/lib/pricing/tax';
import { formatMoney } from '@/lib/utils';

/**
 * Frequently asked questions.
 *
 * ---------------------------------------------------------------------------
 * THE RULE THIS FILE FOLLOWS
 * ---------------------------------------------------------------------------
 * Every answer here restates something the site already commits to elsewhere:
 * a policy page, the pricing config, the business details, or a service that
 * actually exists. No answer invents a lead time, a price, a delivery estimate,
 * a payment method or a guarantee.
 *
 * Several obvious questions are deliberately ABSENT because the honest answer
 * is not known yet:
 *
 *   "How long does a build take?"      No published build time. It depends on
 *                                      part availability and workload, and a
 *                                      number here would become a promise.
 *   "How much is a repair?"            Service rates are not published; every
 *                                      job is quoted. Saying "from $X" would be
 *                                      inventing the X.
 *   "When will it arrive?"             No carrier is contracted and no transit
 *                                      time is published.
 *   "Do you price match?"              Never been offered.
 *
 * Leaving a question out is better than answering it with a number nobody
 * agreed to. Each of these becomes answerable the moment the underlying fact
 * exists, and the shipping and refund policies are where that fact lands first.
 *
 * ---------------------------------------------------------------------------
 * WHY FIGURES ARE INTERPOLATED
 * ---------------------------------------------------------------------------
 * The free-shipping threshold, the business hours and the tax position are read
 * from their source rather than typed. An FAQ that disagrees with the checkout
 * is worse than no FAQ, and that is precisely what happens when a number is
 * copied into prose and then changed in one place only.
 */

export interface Faq {
  question: string;
  /** Plain paragraphs. Rendered with paragraph breaks preserved, no HTML. */
  answer: string[];
}

export interface FaqGroup {
  id: string;
  title: string;
  blurb: string;
  faqs: Faq[];
}

const hoursSummary = summariseHours()
  .filter((group) => group.hours !== 'Closed')
  .map((group) => `${group.label}, ${group.hours}`)
  .join('; ');

const closedDays = summariseHours()
  .filter((group) => group.hours === 'Closed')
  .map((group) => group.label)
  .join(' and ');

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'custom-builds',
    title: 'Custom PC builds',
    blurb: 'Choosing parts, having them assembled, and what happens before the machine ships.',
    faqs: [
      {
        question: 'Can I request a custom PC build?',
        answer: [
          'Yes, and it is the main thing we do. You can either use the configurator to pick every part yourself, or describe what you need the machine for and let us put the parts list together and send it to you.',
          'If you would rather start from something proven, the pre-built pages list machines that are already specified. Every part in them can still be changed before you order.',
        ],
      },
      {
        question: 'Can I choose my own components?',
        answer: [
          'Yes. The configurator lets you select each part individually, and nothing is locked to a bundle.',
          'If you want something we do not stock, ask. We can usually source a specific part rather than talk you into the nearest thing on the shelf.',
        ],
      },
      {
        question: 'Do you check that the parts I picked actually work together?',
        answer: [
          'Yes, twice. The configurator checks compatibility as you build: processor socket against the motherboard, memory generation against what the board accepts, graphics card length against the case, radiator size against the case mounting points, and estimated power draw against the supply.',
          'Where a specification is missing for a part, the check says it could not run rather than guessing and calling it compatible. On top of that, a person reviews the parts list before anything is ordered.',
        ],
      },
      {
        question: 'Do you test custom-built PCs before sending them out?',
        answer: [
          'Yes. Every machine is assembled, cabled, and then tested under sustained load before the operating system goes on. Cabling is done with airflow and future access in mind rather than just closing the panel.',
        ],
      },
      {
        question: 'Can you build a gaming PC or a workstation?',
        answer: [
          'Both. They are different machines, and the difference matters: a gaming build puts the budget into the graphics card and single-thread speed, while a workstation usually wants cores, memory capacity and storage throughput instead.',
          'Tell us what software you actually run and the parts follow from that. It is the fastest way to avoid paying for the wrong thing.',
        ],
      },
      {
        question: 'Are the prices and power figures in the configurator exact?',
        answer: [
          'The total is an estimate built from current catalogue prices, and component prices move. The amount you are charged is the amount shown on the checkout page when you pay.',
          'The power figure is calculated from published component draw plus an allowance for fans and conversion losses. It is a calculation, not a measurement taken from your machine, and the site says so wherever it appears.',
        ],
      },
    ],
  },
  {
    id: 'repairs',
    title: 'Repairs, upgrades and support',
    blurb: 'Work on machines you already own.',
    faqs: [
      {
        question: 'What kinds of problems do you troubleshoot?',
        answer: [
          'Machines that will not boot, crash under load, run hot, have become slow, or have developed a fault nobody has pinned down. Also Windows problems, driver problems, and networking that has stopped working.',
          'Diagnosis comes first. Replacing parts without identifying the cause usually moves the symptom rather than fixing it, and it costs more.',
        ],
      },
      {
        question: 'Can you upgrade a PC I already own?',
        answer: [
          'Yes. Common ones are more memory, a faster drive, a better graphics card, or a cooler that lets the processor hold its clocks.',
          'Send us what you have and we will tell you what is worth changing. Sometimes the honest answer is that an upgrade costs more than it returns, and we would rather say that than sell it to you.',
        ],
      },
      {
        question: 'Can you diagnose a hardware fault rather than just replacing parts?',
        answer: [
          'That is the point of the diagnostic service. The aim is to identify the faulty component rather than swap parts until the problem disappears, because the second approach often hides the cause instead of removing it.',
        ],
      },
      {
        question: 'Can you install or replace a component for me?',
        answer: [
          'Yes, including parts you buy from us and parts you already have. If you bought the part elsewhere, that is fine.',
          'For anything where fit is a question, ask before you buy and we will check the clearance and compatibility against your existing machine.',
        ],
      },
      {
        question: 'Do you set up networking, NAS or small servers?',
        answer: [
          'Yes. Network and Wi-Fi setup, NAS and shared storage, and small always-on machines including home servers and Raspberry Pi builds. The services pages describe each one and what it includes.',
        ],
      },
      {
        question: 'How much does a repair or a service cost?',
        answer: [
          'Rates are not published, because the work varies too much for a price list to be honest. Describe the problem and you get a written quote before any work starts, so nothing is a surprise.',
        ],
      },
    ],
  },
  {
    id: 'products',
    title: 'Products and ordering',
    blurb: 'Buying hardware on its own.',
    faqs: [
      {
        question: 'Do you sell parts and accessories on their own?',
        answer: [
          'Yes. Processors, motherboards, memory, graphics cards, drives, power supplies, cases and cooling, plus networking switches, NAS enclosures, mini PCs and single-board computers. You do not have to buy a whole machine.',
        ],
      },
      {
        question: 'Can I order online, or do I have to contact you?',
        answer: [
          'Online. Add what you want to the cart and check out; a person reviews the order before it is built or picked.',
          'For anything you are unsure about, or anything not listed, sending a message first is usually faster than guessing.',
        ],
      },
      {
        question: 'Do you hold stock, or is everything ordered in?',
        answer: [
          'Everything is ordered in. We do not hold a warehouse of parts: each product page says either "Available to order" or "Not available right now", and "available to order" means we can source it for you once the order is placed, not that it is sitting on a shelf.',
          'That is why you will not see a countdown of units remaining anywhere on this site. There is no shelf to count, and a number implying one would be inventing urgency.',
          'Sourcing can still go wrong. If a part turns out to be unavailable after you order, we contact you with the options: wait, substitute, or refund that part. Our pre-order terms set out how that works.',
        ],
      },
      {
        question: 'What payment methods do you accept?',
        answer: [
          'Card, processed by Stripe. Card numbers are entered on Stripe systems and never reach or get stored by this website — we receive a payment reference and whether it succeeded, nothing more.',
        ],
      },
      ...(TAX_REGISTRATION.registered
        ? []
        : [
            {
              question: 'Why is there no tax on my order?',
              answer: [
                'PC Builders Canada is not currently registered to collect GST/HST, so no sales tax is added and the total you see is the total you pay.',
                'If that changes, tax will appear as a separate line before you pay, and it will never be applied to an order that was already placed.',
              ],
            },
          ]),
      {
        question: 'Do you sell used or open-box hardware?',
        answer: [
          'Sometimes, and it is always labelled. Anything not sold as new carries its condition next to the price, along with a note saying what was actually done to it: tested, refurbished, open-box or used as-is.',
          'Those words mean different things and we keep them apart. "Tested" means it was checked and works with nothing replaced; "refurbished" means something was actually repaired or reconditioned, and the note says what.',
        ],
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping and pickup',
    blurb: 'Getting the order to you.',
    faqs: [
      {
        question: 'Where do you ship?',
        answer: [
          `Canada-wide. Shipping is free on systems over ${formatMoney(PRICING_CONFIG.freeShippingThresholdCents, { whole: true })}; below that a flat rate applies, and parts-only orders use a lower rate. The exact charge is shown before you pay.`,
        ],
      },
      {
        question: 'How long will delivery take?',
        answer: [
          'We do not publish a transit time, because it depends on the carrier and the destination and a number here would be a promise we do not control. You get a tracking number when the order leaves.',
          'A custom machine is also built before it ships, and build time depends on part availability and current workload. If a date matters, tell us before you pay and we will confirm in writing what is achievable.',
        ],
      },
      ...(IN_PERSON.pickup
        ? [
            {
              question: 'Can I pick my order up instead of having it shipped?',
              answer: [
                'Yes, if you are in the Greater Toronto Area, and there is no charge for it.',
                'Pickup is arranged in advance rather than by turning up. We work from a workspace rather than a storefront, so there is no counter to walk up to — message or call and we will agree a time.',
              ],
            },
          ]
        : []),
      {
        question: 'What if it arrives damaged?',
        answer: [
          'Inspect the box before you unpack it. If there is visible damage, photograph it first and contact us the same day.',
          'Those photographs are what make a carrier claim straightforward, and their absence is what makes it difficult. It is a two-minute job that is worth doing properly.',
        ],
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Warranty and returns',
    blurb: 'What is covered, by whom, and for how long.',
    faqs: [
      {
        question: 'Do custom builds come with a warranty?',
        answer: [
          'Yes. Our own work is covered by us for one year: the building, the cabling, the configuration and the testing. If we made a mistake and that mistake causes a fault, we fix it at no charge for twelve months from the date you received the machine.',
          'The parts inside it carry their own manufacturer warranties, separately, for whatever period each manufacturer sets.',
        ],
      },
      {
        question: 'What does the PC Builders Canada 1-year warranty actually cover?',
        answer: [
          'Faults caused by our work. If something was assembled, configured, repaired or serviced by us and it went wrong because of how we did it, that is ours to put right.',
          'It does not cover physical or liquid damage, damage from modifications made after it left us, faults caused by overclocking beyond the settings it shipped with, software problems unrelated to hardware, or data loss. Keep backups: no warranty replaces data.',
        ],
      },
      {
        question: 'Is your 1-year warranty the same as a manufacturer warranty?',
        answer: [
          'No, and they should not be confused. Our one year covers our workmanship. It is not a manufacturer warranty and we do not claim that every part comes with one.',
          'A graphics card, for example, carries whatever warranty its manufacturer gives it, which might be longer or shorter than a year. That coverage is between you and them.',
        ],
      },
      {
        question: 'How do manufacturer warranties work if a part fails?',
        answer: [
          'Each manufacturer sets its own period and its own process, and the claim is ultimately between you and them. What we do is the diagnosis, so you are not guessing about which part failed.',
          'Once the faulty part is identified we tell you whose warranty applies and help you claim under it.',
        ],
      },
      {
        question: 'How do I make a warranty claim?',
        answer: [
          `Open a support ticket from your account, or contact us${CHANNELS.email ? ` at ${CHANNELS.email}` : ''}, with your order number and a description of the fault: when it happens, and what you have already tried.`,
          'For customers in the GTA we come to you where the job can be done on site, or you drop the machine off by arrangement. There is no shipping cost to you on a warranty repair that is our responsibility.',
        ],
      },
      {
        question: 'Can I return something I changed my mind about?',
        answer: [
          'An unopened component in its original packaging can be returned within 14 days of delivery. Contact us first with your order number. Return shipping on a change of mind is paid by you; on a confirmed fault it is not.',
          'An opened component depends on what it is and what condition it is in. Where we can take it back, any charge is quoted to you before you send it, not deducted afterwards. A few things cannot be returned once opened, chiefly software and redeemed licence keys.',
        ],
      },
      {
        question: 'Can I cancel a custom build after ordering?',
        answer: [
          'If assembly has not started, yes, and you get a full refund. Contact us with the order number as soon as you can, because the earlier it is the simpler it is.',
          'Once a machine has been assembled and tested it is not a stock item and cannot just go back on a shelf, so a return is handled case by case and any charge is quoted before you return it. That does not affect returning a faulty machine, which is a warranty matter.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Getting in touch',
    blurb: 'How and when to reach us.',
    faqs: [
      {
        question: 'When are you available?',
        answer: [
          `${hoursSummary}, ${TIMEZONE_LABEL}${closedDays ? `. Closed ${closedDays}` : ''}.`,
          'Messages sent outside those hours are answered the next working day. Anything involving a machine that will not boot gets looked at first.',
        ],
      },
      {
        question: 'What is the best way to reach you?',
        answer: [
          [
            CHANNELS.phone
              ? `By phone or text on ${CHANNELS.phoneDisplay ?? CHANNELS.phone}`
              : null,
            CHANNELS.email ? `by email at ${CHANNELS.email}` : null,
            'or through the form on the contact page',
          ]
            .filter(Boolean)
            .join(', ')
            .replace(/^by/, 'By') + '.',
          'If it is about an order you have already placed, open a support ticket from your account instead — the thread then stays attached to the order, which makes it much faster to deal with.',
        ],
      },
      {
        question: 'Do you have a shop I can visit?',
        answer: [
          'No. We work from a workspace rather than a storefront, so there is no address to walk into and no showroom.',
          'What we do instead is come to you for on-site work across Toronto and the GTA, or arrange a pickup or drop-off time with you in advance.',
        ],
      },
      {
        question: 'Which areas do you cover for on-site work?',
        answer: [
          'Toronto and the surrounding Greater Toronto Area, including North York, Scarborough, Etobicoke, Markham, Richmond Hill, Vaughan, Mississauga and Brampton.',
          'Hardware ships Canada-wide regardless of where you are.',
        ],
      },
    ],
  },
];

/** Flat list, for structured data and for counting. */
export const ALL_FAQS: Faq[] = FAQ_GROUPS.flatMap((group) => group.faqs);
