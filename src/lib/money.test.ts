import { describe, expect, it } from 'vitest';
import { dollarsToCents, formatMoney } from '@/lib/utils';

/**
 * Dollars to cents.
 *
 * The pricing screen takes dollars, because that is what a supplier invoice
 * says, and everything downstream takes integer cents. This conversion is the
 * one place a repricing can go quietly wrong by a cent, and a cent that is wrong
 * in the catalogue is wrong in every cart, order and total built from it.
 */
describe('dollarsToCents', () => {
  /**
   * The case that motivates the rounding. 19.99 * 100 is 1998.9999999999998 in
   * IEEE754, so truncating would price the part a cent low -- invisible in
   * review, and impossible to reproduce from the UI.
   */
  it('rounds the IEEE754 artefacts rather than truncating them', () => {
    expect(dollarsToCents('19.99')).toBe(1999);
    expect(dollarsToCents('0.29')).toBe(29);
    expect(dollarsToCents('8.87')).toBe(887);
    expect(dollarsToCents('1234.56')).toBe(123456);
  });

  /**
   * A half-cent input resolves by whatever the float gives, not by decimal
   * half-up: 1.005 * 100 is 100.49999999999999, so it lands on 100 rather than
   * 101.
   *
   * Asserted rather than fixed. A price with three decimals is not a real price
   * -- the input is step="0.01" and every supplier figure has two -- so paying
   * for exact decimal arithmetic here would buy nothing. What matters is that the
   * result is a whole number of cents and never drifts on the two-decimal values
   * that do occur, which the case above covers.
   */
  it('resolves a half-cent input to a whole cent, deterministically', () => {
    expect(dollarsToCents('1.005')).toBe(100);
    expect(dollarsToCents('1.005')).toBe(dollarsToCents('1.005'));
    expect(Number.isInteger(dollarsToCents('99.999'))).toBe(true);
  });

  it('never returns a fractional cent', () => {
    for (const value of ['19.99', '0.07', '1.005', '99.999', '2001.78', '749.99']) {
      const cents = dollarsToCents(value);
      expect(Number.isInteger(cents), value).toBe(true);
    }
  });

  it('handles whole dollars and zero', () => {
    expect(dollarsToCents('150')).toBe(15000);
    expect(dollarsToCents(150)).toBe(15000);
    // Zero is a legitimate price -- an "Ask us" item, or a free OS entry.
    expect(dollarsToCents('0')).toBe(0);
  });

  it('refuses anything that is not a usable amount', () => {
    for (const bad of ['', '   ', 'abc', '$19.99', '-5', '-0.01', 'Infinity', 'NaN']) {
      expect(dollarsToCents(bad), bad).toBeNull();
    }
  });

  /**
   * Round-trips through the formatter the admin table displays, so what somebody
   * types is what they see after saving.
   */
  it('round-trips with formatMoney', () => {
    // Under a thousand, so no grouping separator is involved.
    for (const value of ['19.99', '749.99', '150.00', '0.99']) {
      const cents = dollarsToCents(value)!;
      expect(formatMoney(cents)).toBe(`$${Number(value).toFixed(2)}`);
    }
    // Above it, the formatter groups thousands, which is what the admin table
    // and the storefront both show.
    expect(formatMoney(dollarsToCents('2001.78')!)).toBe('$2,001.78');
    expect(formatMoney(dollarsToCents('100000')!)).toBe('$100,000.00');
  });

  it('stays within the ceiling the schema enforces', () => {
    // 100_000_00 cents is the per-part maximum in adminComponentFields and in
    // priceUpdateSchema. The converter does not clamp; the caller checks.
    expect(dollarsToCents('100000')).toBe(100_000_00);
    expect(dollarsToCents('100001')).toBeGreaterThan(100_000_00);
  });
});
