import { describe, expect, it } from 'vitest';
import {
  adminComponentSchema,
  checkoutSchema,
  inventoryAdjustSchema,
  quoteSchema,
  saveBuildSchema,
  ticketReplySchema,
} from '@/lib/validation/schemas';

/**
 * These test the trust boundary, not the library.
 *
 * The property that matters: a client can say WHAT it wants, never what it
 * costs or who it is. Anything price- or role-shaped that arrives in a
 * request body must be dropped, and the server must recompute it.
 */

const validItems = [{ category: 'cpu' as const, component_id: 'cpu-amd-ryzen-5-7600x', quantity: 1 }];

describe('request validation', () => {
  describe('money cannot be supplied by a client', () => {
    it('strips a price injected into a saved build', () => {
      const parsed = saveBuildSchema.parse({
        name: 'Cheap build',
        items: validItems,
        estimated_total_cents: 1,
        total: 0,
      });
      expect(parsed).not.toHaveProperty('estimated_total_cents');
      expect(parsed).not.toHaveProperty('total');
    });

    it('strips a price injected into a checkout line', () => {
      const parsed = checkoutSchema.parse({
        lines: [{ kind: 'build', name: 'Build', items: validItems, quantity: 1, price_cents: 1 }],
        province: 'ON',
        email: 'buyer@example.com',
      });
      expect(parsed.lines[0]).not.toHaveProperty('price_cents');
    });

    it('strips a total injected into a quote', () => {
      const parsed = quoteSchema.parse({
        customer_name: 'A Customer',
        customer_email: 'customer@example.com',
        items: validItems,
        estimated_total_cents: 5,
      });
      expect(parsed).not.toHaveProperty('estimated_total_cents');
    });
  });

  describe('quantity bounds', () => {
    it('rejects zero and negative quantities', () => {
      for (const quantity of [0, -1, -999]) {
        const result = saveBuildSchema.safeParse({
          name: 'Build',
          items: [{ ...validItems[0], quantity }],
        });
        expect(result.success).toBe(false);
      }
    });

    it('rejects a fractional quantity', () => {
      const result = saveBuildSchema.safeParse({
        name: 'Build',
        items: [{ ...validItems[0], quantity: 1.5 }],
      });
      expect(result.success).toBe(false);
    });

    it('caps an absurd quantity', () => {
      const result = saveBuildSchema.safeParse({
        name: 'Build',
        items: [{ ...validItems[0], quantity: 100000 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('checkout', () => {
    it('rejects an unknown province, so tax cannot be avoided by inventing one', () => {
      const result = checkoutSchema.safeParse({
        lines: [{ kind: 'component', component_id: 'ssd-samsung-990-pro-2tb', quantity: 1 }],
        province: 'ZZ',
        email: 'buyer@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an empty cart', () => {
      const result = checkoutSchema.safeParse({ lines: [], province: 'ON', email: 'a@b.com' });
      expect(result.success).toBe(false);
    });

    it('rejects a malformed email', () => {
      const result = checkoutSchema.safeParse({
        lines: [{ kind: 'component', component_id: 'x', quantity: 1 }],
        province: 'ON',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('quotes', () => {
    it('accepts a description with no configuration attached', () => {
      const result = quoteSchema.safeParse({
        customer_name: 'A Customer',
        customer_email: 'customer@example.com',
        items: [],
        customer_notes: 'I need a machine for video editing, budget around three thousand.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an empty request with neither a build nor a description', () => {
      const result = quoteSchema.safeParse({
        customer_name: 'A Customer',
        customer_email: 'customer@example.com',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('requires a phone number when the customer asks to be phoned', () => {
      const result = quoteSchema.safeParse({
        customer_name: 'A Customer',
        customer_email: 'customer@example.com',
        preferred_contact: 'phone',
        items: validItems,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('admin input', () => {
    it('rejects a component id that is not a safe slug', () => {
      for (const id of ['../etc/passwd', 'Has Spaces', 'UPPER', 'semi;colon']) {
        const result = adminComponentSchema.safeParse({
          id,
          sku: 'SKU-1',
          category: 'cpu',
          brand: 'Brand',
          model: 'Model',
          price_cents: 1000,
          stock_quantity: 1,
          low_stock_threshold: 1,
        });
        expect(result.success).toBe(false);
      }
    });

    it('rejects negative stock', () => {
      const result = inventoryAdjustSchema.safeParse({
        component_id: 'cpu-amd-ryzen-5-7600x',
        stock_quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects a negative price', () => {
      const result = adminComponentSchema.safeParse({
        id: 'cpu-test',
        sku: 'SKU-1',
        category: 'cpu',
        brand: 'Brand',
        model: 'Model',
        price_cents: -100,
        stock_quantity: 1,
        low_stock_threshold: 1,
      });
      expect(result.success).toBe(false);
    });

    it('defaults a new component to unverified specifications', () => {
      const parsed = adminComponentSchema.parse({
        id: 'cpu-test',
        sku: 'SKU-1',
        category: 'cpu',
        brand: 'Brand',
        model: 'Model',
        price_cents: 1000,
        stock_quantity: 1,
        low_stock_threshold: 1,
      });
      expect(parsed.data_confidence).toBe('sample');
    });
  });

  describe('ticket replies', () => {
    it('defaults is_internal to false, so a reply is customer-visible unless asked otherwise', () => {
      const parsed = ticketReplySchema.parse({ body: 'Thanks for getting in touch.' });
      expect(parsed.is_internal).toBe(false);
    });

    it('rejects an empty reply', () => {
      expect(ticketReplySchema.safeParse({ body: '   ' }).success).toBe(false);
    });
  });
});
