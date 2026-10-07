import { describe, expect, it } from 'vitest';
import { describeAvailability, stockState } from '@/lib/catalog/types';

/**
 * What a customer is told about availability.
 *
 * This business holds no inventory: parts are sourced after an order is paid,
 * and the stock column records the operator's judgement about what can be
 * supplied. The storefront used to print "In stock" from it, which described a
 * warehouse that does not exist, and "Only 2 left", which manufactured urgency
 * from a number that is not a shelf count — every row imported from a catalogue
 * sheet carries a nominal 5.
 *
 * These tests pin the two properties that matter: the words are true, and the
 * count never reaches the customer.
 */
describe('describeAvailability', () => {
  it('offers anything with stock as available to order', () => {
    for (const quantity of [1, 2, 5, 40, 999]) {
      const result = describeAvailability({ stock_quantity: quantity });
      expect(result.state).toBe('orderable');
      expect(result.label).toBe('Available to order');
    }
  });

  it('says a part with no stock is not available right now', () => {
    const result = describeAvailability({ stock_quantity: 0 });
    expect(result.state).toBe('unavailable');
    expect(result.label).toBe('Not available right now');
  });

  it('treats a negative count as unavailable rather than orderable', () => {
    // The column has a non-negative constraint, so this is defensive. It
    // matters because the failure direction is selling something we cannot get.
    expect(describeAvailability({ stock_quantity: -1 }).state).toBe('unavailable');
  });

  // THE POINT OF THE WHOLE CHANGE.
  it('never claims anything is in stock', () => {
    for (const quantity of [0, 1, 5, 100]) {
      const { label, detail } = describeAvailability({ stock_quantity: quantity });
      expect(`${label} ${detail}`.toLowerCase()).not.toContain('in stock');
      expect(`${label} ${detail}`.toLowerCase()).not.toContain('out of stock');
    }
  });

  it('never puts the stock count in front of a customer', () => {
    for (const quantity of [1, 2, 3, 5, 7, 42]) {
      const { label, detail } = describeAvailability({ stock_quantity: quantity });
      // No digits at all, which also rules out "only 2 left" and "5 remaining".
      expect(label).not.toMatch(/\d/);
      expect(detail).not.toMatch(/\d/);
    }
  });

  it('never implies a delivery date it cannot know', () => {
    // "Available soon" and "ships in 2-3 days" are promises about a date, and
    // nothing here knows one. A part at zero may be between supplier runs or
    // discontinued, and the catalogue cannot tell the two apart.
    for (const quantity of [0, 5]) {
      const text = Object.values(describeAvailability({ stock_quantity: quantity }))
        .join(' ')
        .toLowerCase();
      for (const promise of ['soon', 'days', 'tomorrow', 'next week', 'immediately']) {
        expect(text).not.toContain(promise);
      }
    }
  });

  it('collapses the three operational states into two customer-facing ones', () => {
    // The admin keeps low-stock, because it is a real sourcing signal there.
    // A customer sees no difference between a part with one unit and forty,
    // because under source-to-order there is no difference to them.
    const low = { stock_quantity: 1, low_stock_threshold: 3 };
    const plenty = { stock_quantity: 40, low_stock_threshold: 3 };

    expect(stockState(low)).toBe('low');
    expect(stockState(plenty)).toBe('in-stock');

    expect(describeAvailability(low).label).toBe(describeAvailability(plenty).label);
  });
});
