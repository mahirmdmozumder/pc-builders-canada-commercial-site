import { describe, expect, it } from 'vitest';
import { priceBuild, priceCart, PRICING_CONFIG } from '@/lib/pricing/pricing';
import { calculateTax, combinedRate, normalizeProvince } from '@/lib/pricing/tax';
import { buildFromIds, COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';

describe('tax', () => {
  it('applies a single HST line in Ontario', () => {
    const { lines, totalCents } = calculateTax(100_00, 'ON');
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('HST');
    expect(totalCents).toBe(13_00);
  });

  it('applies GST and PST separately in British Columbia', () => {
    const { lines, totalCents } = calculateTax(100_00, 'BC');
    expect(lines.map((l) => l.label)).toEqual(['GST', 'PST']);
    expect(totalCents).toBe(12_00);
  });

  it('applies GST only in Alberta', () => {
    expect(calculateTax(100_00, 'AB').totalCents).toBe(5_00);
  });

  it('handles the Quebec fractional QST rate', () => {
    const { totalCents } = calculateTax(100_00, 'QC');
    expect(totalCents).toBe(500 + 998); // 5% + 9.975%, each rounded
    expect(combinedRate('QC')).toBeCloseTo(0.14975, 5);
  });

  it('rounds each tax line to the cent', () => {
    const { lines } = calculateTax(3333, 'ON');
    expect(Number.isInteger(lines[0].amount_cents)).toBe(true);
    expect(lines[0].amount_cents).toBe(433); // 33.33 * 0.13 = 4.3329
  });

  it('falls back to the default province for unknown input', () => {
    expect(normalizeProvince('ZZ')).toBe('ON');
    expect(normalizeProvince(null)).toBe('ON');
    expect(normalizeProvince('bc')).toBe('BC');
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
    const one = priceBuild(buildFromIds(['ssd-samsung-990-pro-2tb']));
    const two = priceBuild(
      buildFromIds(['ssd-samsung-990-pro-2tb'], { 'ssd-samsung-990-pro-2tb': 2 }),
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
    const price = priceBuild(buildFromIds(['ssd-samsung-990-pro-2tb', 'acc-arctic-p12-5pack']));
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

  it('taxes hardware, services and shipping together', () => {
    const price = priceBuild(buildFromIds(['ssd-wd-black-sn850x-1tb']), { province: 'ON' });
    const taxable = price.subtotalCents + price.servicesCents + price.shippingCents;
    expect(price.taxCents).toBe(Math.round(taxable * 0.13));
  });

  it('produces a total equal to the sum of its parts', () => {
    const price = priceBuild(buildFromIds(COMPATIBLE_AM5_BUILD), { province: 'BC' });
    expect(price.totalCents).toBe(
      price.subtotalCents + price.servicesCents + price.shippingCents + price.taxCents,
    );
  });

  it('changes the total when the province changes', () => {
    const build = buildFromIds(COMPATIBLE_AM5_BUILD);
    const ontario = priceBuild(build, { province: 'ON' });
    const alberta = priceBuild(build, { province: 'AB' });
    expect(alberta.totalCents).toBeLessThan(ontario.totalCents);
    expect(alberta.subtotalCents).toBe(ontario.subtotalCents);
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
