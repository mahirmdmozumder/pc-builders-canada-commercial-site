import { resolveBuild, getComponentsByIds } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceCart, type PriceBreakdown } from '@/lib/pricing/pricing';
import { displayName } from '@/lib/catalog/types';
import type { CheckoutInput } from '@/lib/validation/schemas';
import type { SavedBuildItem } from '@/types/domain';

/**
 * Server-side cart resolution.
 *
 * This is the single place that turns a client's cart into money. Both the
 * cart page and the checkout route call it, so what the customer is shown and
 * what Stripe is asked to charge come from the same calculation over the same
 * catalogue rows. The client's own price snapshot is never an input.
 *
 * INVARIANT: one resolved line comes back for every line sent in, in the same
 * order. The cart page pairs the two by index to attach prices and problems to
 * the right row, so a dropped line silently shifts every row after it. That
 * shipped once: an unavailable part was skipped, and the cart then displayed
 * the build's total against the part's name. A test enforces the invariant.
 */

export interface ResolvedCartLine {
  kind: 'build' | 'component';
  name: string;
  quantity: number;
  /** Price of one unit of this line, hardware only. */
  unitPriceCents: number;
  totalCents: number;
  /** Parts list for a build line, for display and for the order snapshot. */
  parts: { category: string; name: string; quantity: number; priceCents: number }[];
  configuration: SavedBuildItem[] | null;
  componentId: string | null;
  includesAssembly: boolean;
  includesOsInstall: boolean;
  /**
   * False when the catalogue no longer has this item.
   *
   * An unavailable line is still RETURNED, priced at zero and excluded from
   * the totals. It used to be dropped, which broke the invariant below and
   * made the cart page show one line's price against another line's name.
   */
  available: boolean;
  /** Problems that must be resolved before this line can be purchased. */
  problems: string[];
}

export interface ResolvedCart {
  lines: ResolvedCartLine[];
  price: PriceBreakdown;
  problems: string[];
}

export interface ResolveCartInput {
  lines: CheckoutInput['lines'];
  province: string;
}

export async function resolveCart(input: ResolveCartInput): Promise<ResolvedCart> {
  const lines: ResolvedCartLine[] = [];
  const problems: string[] = [];

  for (const line of input.lines) {
    if (line.kind === 'build') {
      const { build, missingIds } = await resolveBuild(line.items);
      const lineProblems: string[] = [];

      if (missingIds.length > 0) {
        lineProblems.push(
          `${missingIds.length} part${missingIds.length === 1 ? '' : 's'} in "${line.name}" ${
            missingIds.length === 1 ? 'is' : 'are'
          } no longer available.`,
        );
      }

      const report = checkCompatibility(build);
      for (const failure of report.failures) {
        lineProblems.push(`${line.name}: ${failure.message}`);
      }

      for (const item of build) {
        const needed = item.quantity * line.quantity;
        if (item.component.stock_quantity < needed) {
          // The count is deliberately not quoted. It is a sourcing judgement,
          // not a shelf, and "3 available" invites a customer to argue with a
          // number that does not mean what they would take it to mean.
          lineProblems.push(
            needed > 1
              ? `${displayName(item.component)} is not available in the quantity this build needs. Ask us and we will quote it.`
              : `${displayName(item.component)} is not available to order right now.`,
          );
        }
      }

      const unitPriceCents = build.reduce(
        (sum, item) => sum + item.component.price_cents * item.quantity,
        0,
      );

      lines.push({
        kind: 'build',
        name: line.name,
        quantity: line.quantity,
        unitPriceCents,
        totalCents: unitPriceCents * line.quantity,
        parts: build.map((item) => ({
          category: item.category,
          name: displayName(item.component),
          quantity: item.quantity,
          priceCents: item.component.price_cents,
        })),
        configuration: line.items,
        componentId: null,
        includesAssembly: true,
        includesOsInstall: build.some((b) => b.category === 'os' && b.component.price_cents > 0),
        available: true,
        problems: lineProblems,
      });
      problems.push(...lineProblems);
      continue;
    }

    const map = await getComponentsByIds([line.component_id]);
    const component = map.get(line.component_id);
    const lineProblems: string[] = [];

    if (!component) {
      lineProblems.push('This item is no longer available and has been left out of the total.');
      lines.push({
        kind: 'component',
        // The catalogue has no row, so there is no name to show. The cart page
        // has the name the customer saw when they added it and displays that;
        // the id is kept here because it is what identifies the failure.
        name: line.component_id,
        quantity: line.quantity,
        unitPriceCents: 0,
        totalCents: 0,
        parts: [],
        configuration: null,
        componentId: line.component_id,
        includesAssembly: false,
        includesOsInstall: false,
        available: false,
        problems: lineProblems,
      });
      problems.push(...lineProblems);
      continue;
    }

    if (component.stock_quantity < line.quantity) {
      lineProblems.push(
        component.stock_quantity > 0
          ? `${displayName(component)} is not available in that quantity. Ask us and we will quote it.`
          : `${displayName(component)} is not available to order right now.`,
      );
    }

    lines.push({
      kind: 'component',
      name: displayName(component),
      quantity: line.quantity,
      unitPriceCents: component.price_cents,
      totalCents: component.price_cents * line.quantity,
      parts: [],
      configuration: null,
      componentId: component.id,
      includesAssembly: false,
      includesOsInstall: false,
      available: true,
      problems: lineProblems,
    });
    problems.push(...lineProblems);
  }

  const price = priceCart({
    province: input.province,
    // Unavailable lines are shown but never charged for. Filtering here rather
    // than pricing them at zero keeps them out of the Stripe line items too.
    lines: lines.filter((line) => line.available).map((line) => ({
      kind: line.kind,
      name: line.name,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      includesAssembly: line.includesAssembly,
      includesOsInstall: line.includesOsInstall,
    })),
  });

  return { lines, price, problems };
}
