import { describe, expect, it } from 'vitest';
import { priceBuild, priceCart, PRICING_CONFIG } from '@/lib/pricing/pricing';
import { assemblyFeeFor, ASSEMBLY_FEE_TIERS } from '@/lib/pricing/pricing';
import {
  calculateTax,
  calculateTaxAtRate,
  combinedRate,
  normalizeProvince,
  TAX_REGISTRATION,
} from '@/lib/pricing/tax';
import { buildFromIds, COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';

describe('tax rates', () => {
  /**
   * These assert the RATE TABLE, so they call calculateTaxAtRate rather than
   * calculateTax. calculateTax returns nothing while the business is not
   * registered to collect (see TAX_REGISTRATION), and a rate table that is
   * only exercised through the registered path stops being tested the moment
   * the switch is off -- which is its default.
   */
  it('applies a single HST line in Ontario', () => {
    const { lines, totalCents } = calculateTaxAtRate(100_00, 'ON');
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('HST');
    expect(totalCents).toBe(13_00);
  });

  it('applies GST and PST separately in British Columbia', () => {
    const { lines, totalCents } = calculateTaxAtRate(100_00, 'BC');
    expect(lines.map((l) => l.label)).toEqual(['GST', 'PST']);
    expect(totalCents).toBe(12_00);
  });

  it('applies GST only in Alberta', () => {
    expect(calculateTaxAtRate(100_00, 'AB').totalCents).toBe(5_00);
  });

  it('handles the Quebec fractional QST rate', () => {
    const { totalCents } = calculateTaxAtRate(100_00, 'QC');
    expect(totalCents).toBe(500 + 998); // 5% + 9.975%, each rounded
    expect(combinedRate('QC')).toBeCloseTo(0.14975, 5);
  });

  it('rounds each tax line to the cent', () => {
    const { lines } = calculateTaxAtRate(3333, 'ON');
    expect(Number.isInteger(lines[0].amount_cents)).toBe(true);
    expect(lines[0].amount_cents).toBe(433); // 33.33 * 0.13 = 4.3329
  });

  it('falls back to the default province for unknown input', () => {
    expect(normalizeProvince('ZZ')).toBe('ON');
    expect(normalizeProvince(null)).toBe('ON');
    expect(normalizeProvince('bc')).toBe('BC');
  });
});

/**
 * GST/HST registration.
 *
 * This is the one tax rule that is about money leaving somebody else's pocket
 * rather than arithmetic. A seller who is not registered has no number to remit
 * under, so sales tax collected is collected for nothing -- and the site did
 * exactly that on every Ontario order before this switch existed.
 *
 * The tests are written against whichever way the switch is currently set, so
 * they keep working when it is turned on rather than becoming a reason not to
 * turn it on.
 */
describe('tax registration', () => {
  it('charges nothing while unregistered, and the full rate once registered', () => {
    const { lines, totalCents } = calculateTax(100_00, 'ON');

    if (TAX_REGISTRATION.registered) {
      expect(totalCents).toBe(13_00);
      expect(lines).toHaveLength(1);
      // Required on receipts once registered. A registered seller with no
      // number on the record is a different compliance problem.
      expect(TAX_REGISTRATION.number, 'registered with no business number').toBeTruthy();
    } else {
      expect(totalCents).toBe(0);
      // No line at all, rather than a zero-valued one. A "HST $0.00" row on an
      // invoice states that the seller charges HST and happened to charge none.
      expect(lines).toEqual([]);
    }
  });

  it('never invents a tax line for any province while unregistered', () => {
    if (TAX_REGISTRATION.registered) return;
    for (const province of ['ON', 'BC', 'AB', 'QC', 'NS', 'YT'] as const) {
      expect(calculateTax(500_00, province).lines, province).toEqual([]);
      expect(calculateTax(500_00, province).totalCents, province).toBe(0);
    }
  });

  it('keeps the rate table intact regardless, so registering needs no new code', () => {
    // The table is the thing that would be tempting to delete while tax is off.
    expect(calculateTaxAtRate(100_00, 'ON').totalCents).toBe(13_00);
    expect(calculateTaxAtRate(100_00, 'AB').totalCents).toBe(5_00);
  });

  it('leaves the order total as goods plus services plus shipping', () => {
    if (TAX_REGISTRATION.registered) return;
    const build = buildFromIds(COMPATIBLE_AM5_BUILD);
    const price = priceBuild(build, { province: 'ON' });
    expect(price.taxCents).toBe(0);
    expect(price.totalCents).toBe(
      price.subtotalCents + price.servicesCents + price.shippingCents,
    );
  });
});

describe('build pricing', () => {
  it('is zero across the board for an empty build', () => {
    const price = priceBuild([]);
    expect(price.subtotalCents).toBe(0);
    expect(price.shippingCents).toBe(0);
    expect(price.taxCents).toBe(0);
    expect(price.totalCents).toBe(0);
  });

  it('sums component prices from the catalogue rather than a stored total', () => {
    const build = buildFromIds(COMPATIBLE_AM5_BUILD);
    const expected = build.reduce((sum, i) => sum + i.component.price_cents * i.quantity, 0);
    expect(priceBuild(build).subtotalCents).toBe(expected);
  });

  it('multiplies by quantity', () => {
    const one = priceBuild(buildFromIds(['ssd-wd-black-sn850x-2tb']));
    const two = priceBuild(
      buildFromIds(['ssd-wd-black-sn850x-2tb'], { 'ssd-wd-black-sn850x-2tb': 2 }),
    );
    expect(two.subtotalCents).toBe(one.subtotalCents * 2);
  });

  it('adds the assembly fee to a full system, banded on its parts value', () => {
    const price = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD));
    expect(price.servicesCents).toBe(assemblyFeeFor(price.subtotalCents));
  });

  it('adds an OS installation fee only when an OS is selected', () => {
    const withoutOs = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD));
    const withOs = priceBuild(buildFromIds([...COMPATIBLE_AM5_BUILD, 'os-windows-11-pro']));
    expect(withOs.servicesCents - withoutOs.servicesCents).toBe(PRICING_CONFIG.osInstallFeeCents);
  });

  it('charges no assembly fee for a parts-only order', () => {
    const price = priceBuild(buildFromIds(['ssd-wd-black-sn850x-2tb', 'ssd-kingston-nv3-1tb']));
    expect(price.servicesCents).toBe(0);
  });

  it('gives free shipping above the threshold and charges below it', () => {
    const expensive = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD));
    expect(expensive.subtotalCents).toBeGreaterThan(PRICING_CONFIG.freeShippingThresholdCents);
    expect(expensive.shippingIsFree).toBe(true);
    expect(expensive.shippingCents).toBe(0);

    const cheap = priceBuild(buildFromIds(['ssd-wd-black-sn850x-1tb']));
    expect(cheap.shippingIsFree).toBe(false);
    expect(cheap.shippingCents).toBe(PRICING_CONFIG.partsShippingCents);
  });

  it('taxes hardware, services and shipping together once registered', () => {
    const price = priceBuild(buildFromIds(['ssd-wd-black-sn850x-1tb']), { province: 'ON' });
    const taxable = price.subtotalCents + price.servicesCents + price.shippingCents;
    // Shipping and labour are part of the taxable base for a good shipped
    // within Canada, which is the rule this asserts. It only has anything to
    // assert while the business is registered to collect.
    expect(price.taxCents).toBe(
      TAX_REGISTRATION.registered ? Math.round(taxable * 0.13) : 0,
    );
  });

  it('produces a total equal to the sum of its parts', () => {
    const price = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD), { province: 'BC' });
    expect(price.totalCents).toBe(
      price.subtotalCents + price.servicesCents + price.shippingCents + price.taxCents,
    );
  });

  it('changes the total by province only where tax is charged', () => {
    const build = buildFromIds(COMPATIBLE_AM5_BUILD);
    const ontario = priceBuild(build, { province: 'ON' });
    const alberta = priceBuild(build, { province: 'AB' });

    // The goods never change with the destination. Only tax does.
    expect(alberta.subtotalCents).toBe(ontario.subtotalCents);

    if (TAX_REGISTRATION.registered) {
      expect(alberta.totalCents).toBeLessThan(ontario.totalCents);
    } else {
      // Unregistered: a buyer in Alberta and a buyer in Ontario pay the same,
      // because neither is charged tax.
      expect(alberta.totalCents).toBe(ontario.totalCents);
    }
  });

  it('keeps every figure an integer number of cents', () => {
    const price = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD), { province: 'QC' });
    for (const value of [
      price.subtotalCents,
      price.servicesCents,
      price.shippingCents,
      price.taxCents,
      price.totalCents,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('cart pricing', () => {
  it('charges one assembly fee per configured system', () => {
    const price = priceCart({
      province: 'ON',
      lines: [
        {
          kind: 'build',
          name: 'Gaming build',
          unitPriceCents: 200_000,
          quantity: 2,
          includesAssembly: true,
        },
      ],
    });
    // Two of the same $2,000 build: banded on 200_000 each, not on the 400_000
    // the cart adds up to.
    expect(price.servicesCents).toBe(assemblyFeeFor(200_000) * 2);
  });

  it('does not charge assembly for loose components', () => {
    const price = priceCart({
      lines: [
        {
          kind: 'component',
          name: 'SSD',
          unitPriceCents: 12_900,
          quantity: 1,
          includesAssembly: false,
        },
      ],
    });
    expect(price.servicesCents).toBe(0);
    expect(price.shippingCents).toBe(PRICING_CONFIG.partsShippingCents);
  });

  it('totals line quantities correctly', () => {
    const price = priceCart({
      lines: [
        { kind: 'component', name: 'Fan pack', unitPriceCents: 4_900, quantity: 3, includesAssembly: false },
        { kind: 'component', name: 'SSD', unitPriceCents: 12_900, quantity: 2, includesAssembly: false },
      ],
    });
    expect(price.subtotalCents).toBe(4_900 * 3 + 12_900 * 2);
  });

  it('is empty-safe', () => {
    const price = priceCart({ lines: [] });
    expect(price.totalCents).toBe(0);
    expect(price.shippingCents).toBe(0);
  });
});

/**
 * Tiered assembly fee.
 *
 * $129 under $1,500 of parts, $179 up to $3,000, $199 above. A flat fee was
 * regressive: under 5% of a $4,000 machine and over 20% of a $900 one, which
 * taxed hardest exactly the build a small shop wins first.
 */
describe('assembly fee bands', () => {
  it('charges the bottom band under $1,500 of parts', () => {
    expect(assemblyFeeFor(0)).toBe(12_900);
    expect(assemblyFeeFor(89_900)).toBe(12_900);
    expect(assemblyFeeFor(149_999)).toBe(12_900);
  });

  it('charges the middle band from $1,500 to $3,000 inclusive', () => {
    // $1,500 exactly leaves the bottom band.
    expect(assemblyFeeFor(150_000)).toBe(17_900);
    expect(assemblyFeeFor(200_000)).toBe(17_900);
    // "up to $3,000" includes $3,000.
    expect(assemblyFeeFor(300_000)).toBe(17_900);
  });

  it('charges the top band above $3,000, unchanged from the old flat rate', () => {
    expect(assemblyFeeFor(300_001)).toBe(19_900);
    expect(assemblyFeeFor(690_691)).toBe(19_900);
    // The point of the change: the top rate did not move.
    expect(assemblyFeeFor(1_000_000)).toBe(19_900);
  });

  it('never returns nothing, whatever it is handed', () => {
    for (const subtotal of [0, 1, 149_999, 150_000, 300_000, 300_001, 9_999_999]) {
      const fee = assemblyFeeFor(subtotal);
      expect(fee, String(subtotal)).toBeGreaterThan(0);
      expect(Number.isInteger(fee), String(subtotal)).toBe(true);
    }
  });

  it('has bands that only ever rise with value', () => {
    // A cheaper machine must never cost more to assemble than a dearer one, or
    // somebody is penalised for spending less.
    const fees = [0, 149_999, 150_000, 300_000, 300_001, 800_000].map(assemblyFeeFor);
    for (let i = 1; i < fees.length; i++) {
      expect(fees[i]).toBeGreaterThanOrEqual(fees[i - 1]);
    }
    // And the table itself is ordered, with exactly one open-ended band last.
    const ceilings = ASSEMBLY_FEE_TIERS.map((tier) => tier.maxSubtotalCents);
    expect(ceilings.filter((c) => c === null)).toHaveLength(1);
    expect(ceilings[ceilings.length - 1]).toBeNull();
  });

  /**
   * The subtlety worth a test of its own. Two modest builds in one basket are
   * two bottom-band fees, NOT two top-band fees because the basket totals more
   * than $3,000. Banding on the cart total would punish precisely the customer
   * the lower bands exist for.
   */
  it('bands each build on its own value, not on the cart total', () => {
    const price = priceCart({
      lines: [
        {
          kind: 'build',
          name: 'Budget build A',
          unitPriceCents: 100_000,
          quantity: 1,
          includesAssembly: true,
        },
        {
          kind: 'build',
          name: 'Budget build B',
          unitPriceCents: 120_000,
          quantity: 1,
          includesAssembly: true,
        },
      ],
      province: 'ON',
    });

    // Cart subtotal is $2,200, which would be the middle band if banded wrongly.
    expect(price.subtotalCents).toBe(220_000);
    expect(price.servicesCents).toBe(12_900 * 2);
  });

  it('bands a mixed basket per build', () => {
    const price = priceCart({
      lines: [
        {
          kind: 'build',
          name: 'Budget',
          unitPriceCents: 100_000,
          quantity: 1,
          includesAssembly: true,
        },
        {
          kind: 'build',
          name: 'Flagship',
          unitPriceCents: 500_000,
          quantity: 1,
          includesAssembly: true,
        },
      ],
      province: 'ON',
    });
    expect(price.servicesCents).toBe(12_900 + 19_900);
  });

  it('charges nothing for a parts-only basket', () => {
    const price = priceCart({
      lines: [
        {
          kind: 'component',
          name: 'A graphics card',
          unitPriceCents: 90_000,
          quantity: 1,
          includesAssembly: false,
        },
      ],
      province: 'ON',
    });
    expect(price.servicesCents).toBe(0);
  });
});

/**
 * A build with nothing in it.
 *
 * priceBuild has always guarded this with `subtotalCents > 0`; priceCart did not,
 * so a saved build whose components had all been removed from the catalogue was
 * charged an assembly fee for assembling nothing. Found while tiering the fee —
 * it was a $199 overcharge before and would have been $129 after.
 */
describe('a build with no resolvable parts', () => {
  it('is not charged an assembly fee by either pricing path', () => {
    const cart = priceCart({
      lines: [
        {
          kind: 'build',
          name: 'Every part discontinued',
          unitPriceCents: 0,
          quantity: 1,
          includesAssembly: true,
        },
      ],
      province: 'ON',
    });
    expect(cart.servicesCents).toBe(0);
    expect(cart.subtotalCents).toBe(0);

    // The same input through priceBuild, which already behaved this way.
    expect(priceBuild([]).servicesCents).toBe(0);
  });

  it('still charges for the real builds beside it', () => {
    const cart = priceCart({
      lines: [
        {
          kind: 'build',
          name: 'Every part discontinued',
          unitPriceCents: 0,
          quantity: 1,
          includesAssembly: true,
        },
        {
          kind: 'build',
          name: 'A real one',
          unitPriceCents: 200_000,
          quantity: 1,
          includesAssembly: true,
        },
      ],
      province: 'ON',
    });
    expect(cart.servicesCents).toBe(17_900);
  });
});
