import { describe, expect, it } from 'vitest';
import { priceBuild, priceCart, PRICING_CONFIG } from '@/lib/pricing/pricing';
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

  it('adds the assembly fee to a full system', () => {
    const price = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD));
    expect(price.servicesCents).toBe(PRICING_CONFIG.assemblyFeeCents);
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
    expect(price.servicesCents).toBe(PRICING_CONFIG.assemblyFeeCents * 2);
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
