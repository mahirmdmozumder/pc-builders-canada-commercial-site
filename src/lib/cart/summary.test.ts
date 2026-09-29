import { describe, expect, it } from 'vitest';
import { resolveCart } from '@/lib/cart/summary';
import { PRICING_CONFIG } from '@/lib/pricing/pricing';
import { COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';
import { SAMPLE_COMPONENTS_BY_ID } from '@/lib/catalog/sample-catalog';
import type { SavedBuildItem } from '@/types/domain';
import type { ComponentCategory } from '@/lib/catalog/types';

/**
 * These run against the in-repo sample catalogue, which is what the
 * repository falls back to when no database is configured. That makes the
 * cart pricing path testable end to end without a live Postgres instance.
 */
function itemsFor(ids: string[]): SavedBuildItem[] {
  return ids.map((id) => {
    const component = SAMPLE_COMPONENTS_BY_ID.get(id);
    if (!component) throw new Error(`Unknown sample component: ${id}`);
    return {
      category: component.category as ComponentCategory,
      component_id: id,
      quantity: 1,
    };
  });
}

const BUILD_LINE = {
  kind: 'build' as const,
  name: 'Test build',
  items: itemsFor(COMPATIBLE_AM5_BUILD),
  quantity: 1,
};

describe('cart resolution', () => {
  it('prices a build from catalogue rows, not from anything the client sent', async () => {
    const cart = await resolveCart({ lines: [BUILD_LINE], province: 'ON' });

    const expectedParts = COMPATIBLE_AM5_BUILD.reduce(
      (sum, id) => sum + SAMPLE_COMPONENTS_BY_ID.get(id)!.price_cents,
      0,
    );
    expect(cart.price.subtotalCents).toBe(expectedParts);
    expect(cart.lines[0].unitPriceCents).toBe(expectedParts);
  });

  it('adds one assembly fee per system', async () => {
    const cart = await resolveCart({ lines: [BUILD_LINE], province: 'ON' });
    expect(cart.price.servicesCents).toBe(PRICING_CONFIG.assemblyFeeCents);
  });

  it('charges assembly per unit when more than one of the same build is ordered', async () => {
    const cart = await resolveCart({
      lines: [{ ...BUILD_LINE, quantity: 2 }],
      province: 'ON',
    });
    expect(cart.price.servicesCents).toBe(PRICING_CONFIG.assemblyFeeCents * 2);
  });

  it('reports a compatibility failure as a blocking problem', async () => {
    const broken = COMPATIBLE_AM5_BUILD.filter((id) => id !== 'mb-asus-rog-strix-b850-f');
    const cart = await resolveCart({
      lines: [
        {
          kind: 'build',
          name: 'AM5 processor on an LGA1851 board',
          items: itemsFor([...broken, 'mb-msi-mpg-z890-carbon']),
          quantity: 1,
        },
      ],
      province: 'ON',
    });

    expect(cart.problems.length).toBeGreaterThan(0);
    expect(cart.problems.join(' ')).toContain('Socket mismatch');
  });

  it('reports insufficient stock as a problem rather than silently overselling', async () => {
    // Opening stock is 5 units; asking for 9 must not quietly succeed.
    const cart = await resolveCart({
      lines: [{ kind: 'component', component_id: 'gpu-gigabyte-rtx-5080-gaming-oc', quantity: 9 }],
      province: 'ON',
    });

    expect(cart.problems.length).toBe(1);
    expect(cart.problems[0]).toContain('out of stock');
  });

  it('still returns a line for a component that no longer exists', async () => {
    const cart = await resolveCart({
      lines: [{ kind: 'component', component_id: 'gpu-does-not-exist', quantity: 1 }],
      province: 'ON',
    });

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].available).toBe(false);
    expect(cart.lines[0].totalCents).toBe(0);
    expect(cart.problems[0]).toContain('no longer available');
  });

  it('leaves an unavailable line out of every total', async () => {
    const cart = await resolveCart({
      lines: [{ kind: 'component', component_id: 'gpu-does-not-exist', quantity: 3 }],
      province: 'ON',
    });

    expect(cart.price.subtotalCents).toBe(0);
    expect(cart.price.totalCents).toBe(0);
    // Nothing to ship, so no shipping is charged for an empty-valued cart.
    expect(cart.price.shippingCents).toBe(0);
  });

  /**
   * The cart page pairs its own lines to these by index. A dropped line shifts
   * every row after it, and the page then shows one line's price and problems
   * against another line's name.
   *
   * That is not hypothetical: an unavailable part used to be skipped, and a
   * $153.95 Raspberry Pi was displayed at $3,059.70 because it had picked up
   * the build line that followed it. Money was never wrong — checkout refuses
   * while any problem is present — but the customer was shown a price that was
   * not theirs.
   */
  it('returns exactly one line per line sent, in the same order', async () => {
    const cases = [
      [{ kind: 'component' as const, component_id: 'gpu-does-not-exist', quantity: 1 }, BUILD_LINE],
      [BUILD_LINE, { kind: 'component' as const, component_id: 'gpu-does-not-exist', quantity: 1 }],
      [
        { kind: 'component' as const, component_id: 'gpu-does-not-exist', quantity: 1 },
        { kind: 'component' as const, component_id: 'ssd-wd-black-sn850x-2tb', quantity: 1 },
        { kind: 'component' as const, component_id: 'also-not-real', quantity: 1 },
      ],
    ];

    for (const lines of cases) {
      const cart = await resolveCart({ lines, province: 'ON' });
      expect(cart.lines).toHaveLength(lines.length);
      for (const [i, sent] of lines.entries()) {
        expect(cart.lines[i].kind).toBe(sent.kind);
      }
    }
  });

  it('prices the surviving lines correctly when an unavailable one sits first', async () => {
    const buildOnly = await resolveCart({ lines: [BUILD_LINE], province: 'ON' });
    const withGhost = await resolveCart({
      lines: [{ kind: 'component', component_id: 'gpu-does-not-exist', quantity: 1 }, BUILD_LINE],
      province: 'ON',
    });

    // The ghost contributes nothing, so the build's own figures are unchanged
    // and land on the build's row rather than the ghost's.
    expect(withGhost.price.subtotalCents).toBe(buildOnly.price.subtotalCents);
    expect(withGhost.lines[1].totalCents).toBe(buildOnly.lines[0].totalCents);
    expect(withGhost.lines[0].totalCents).toBe(0);
  });

  it('does not charge assembly on a parts-only cart', async () => {
    const cart = await resolveCart({
      lines: [{ kind: 'component', component_id: 'ssd-wd-black-sn850x-2tb', quantity: 1 }],
      province: 'ON',
    });
    expect(cart.price.servicesCents).toBe(0);
    expect(cart.price.shippingCents).toBe(PRICING_CONFIG.partsShippingCents);
  });

  it('applies the province tax rate to the whole taxable amount', async () => {
    const ontario = await resolveCart({ lines: [BUILD_LINE], province: 'ON' });
    const alberta = await resolveCart({ lines: [BUILD_LINE], province: 'AB' });

    const taxable =
      ontario.price.subtotalCents + ontario.price.servicesCents + ontario.price.shippingCents;
    expect(ontario.price.taxCents).toBe(Math.round(taxable * 0.13));
    expect(alberta.price.taxCents).toBe(Math.round(taxable * 0.05));
  });

  it('totals to the sum of its parts', async () => {
    const cart = await resolveCart({ lines: [BUILD_LINE], province: 'QC' });
    expect(cart.price.totalCents).toBe(
      cart.price.subtotalCents +
        cart.price.servicesCents +
        cart.price.shippingCents +
        cart.price.taxCents,
    );
  });

  it('records the configuration so the order snapshot survives a catalogue change', async () => {
    const cart = await resolveCart({ lines: [BUILD_LINE], province: 'ON' });
    expect(cart.lines[0].configuration).toHaveLength(COMPATIBLE_AM5_BUILD.length);
    expect(cart.lines[0].parts.length).toBe(COMPATIBLE_AM5_BUILD.length);
  });

  it('is empty-safe', async () => {
    const cart = await resolveCart({ lines: [], province: 'ON' });
    expect(cart.lines).toEqual([]);
    expect(cart.price.totalCents).toBe(0);
  });
});
