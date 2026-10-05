/**
 * PBC POS — the restaurant point-of-sale product.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PAGE MAY AND MAY NOT SAY
 * ---------------------------------------------------------------------------
 * The product is in development. Nothing has shipped, nothing is installed
 * anywhere, and there is no customer using it.
 *
 * So the page says it is being built and says nothing about pilots, customers,
 * restaurants running it or results from it. Every one of those would be a
 * claim about something that has not happened yet, and the first customer to
 * ask "who else uses it?" is the one who finds out. When a pilot is genuinely
 * live that becomes a strong line and belongs here; it is not one today.
 *
 * The four pillars below describe intended scope, and the copy frames them that
 * way rather than as features somebody can use this afternoon.
 */

export interface PosPillar {
  key: string;
  title: string;
  body: string;
}

/** The four areas named on the product poster, in the same order. */
export const POS_PILLARS: PosPillar[] = [
  {
    key: 'pos',
    title: 'POS',
    body: 'Taking orders, splitting bills, handling tax and printing receipts — the part of the night that has to work when the room is full and nobody has time to fight the till.',
  },
  {
    key: 'kitchen',
    title: 'Kitchen',
    body: 'Tickets to the kitchen the moment an order is sent, on paper or on a screen, so the pass sees the same thing the server entered rather than a shouted version of it.',
  },
  {
    key: 'inventory',
    title: 'Inventory',
    body: 'What was sold, what it used and what is running low — tied to the menu rather than tracked in a separate spreadsheet nobody updates after week three.',
  },
  {
    key: 'cloud',
    title: 'Cloud',
    body: 'Sales and reports reachable from outside the building, with the tills carrying on through an internet outage and syncing once it returns. A POS that stops when the Wi-Fi does is not a POS.',
  },
];

/** Who the product is being built for, stated plainly rather than as a promise. */
export const POS_AUDIENCE = [
  'Independent restaurants and cafés running one till or a few.',
  'Owners who already have a POS and spend too much of the week working around it.',
  'Kitchens where the gap between what was ordered and what reached the pass costs real money.',
];

/**
 * The honest status line.
 *
 * Kept as a constant because it appears on the page and in the page metadata,
 * and two copies of a status is how one of them ends up out of date.
 */
export const POS_STATUS =
  'PBC POS is in active development and is not available to buy yet. There is no price list, no release date and nothing to sign.';
