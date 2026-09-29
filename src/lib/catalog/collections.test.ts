import { describe, expect, it } from 'vitest';
import { SHOP_COLLECTIONS } from '@/lib/catalog/collections';
import { displayName } from '@/lib/catalog/types';
import { SAMPLE_COMPONENTS } from '@/lib/catalog/sample-catalog';
import { adminComponentSchema } from '@/lib/validation/schemas';
import {
  CATEGORY_LABELS,
  COMPONENT_CATEGORIES,
  CONFIGURATOR_CATEGORIES,
  REQUIRED_CATEGORIES,
  type ComponentCategory,
} from '@/lib/catalog/types';

/**
 * Guards for the storefront collections and for refurbished listings.
 *
 * The recurring failure these protect against is a page that renders perfectly
 * and lists nothing, because a query and the data it queries drifted apart.
 * That is invisible in a type check and easy to miss by eye once there are
 * several collections.
 */

// Categories the compatibility engine has no rules for. None may appear in
// CONFIGURATOR_CATEGORIES, or the configurator would offer a part it cannot
// check and imply that it had.
const WHOLE_UNIT_CATEGORIES: ComponentCategory[] = [
  'networking',
  'nas',
  'mini-pc',
  'case-fan',
  'monitor',
  'other',
];

/** Mirrors the sample-catalogue branch of listComponents(). */
function query(options: {
  category?: ComponentCategory;
  specFlag?: { key: string; value: boolean };
}) {
  return SAMPLE_COMPONENTS.filter((row) => {
    if (!row.active) return false;
    if (options.category && row.category !== options.category) return false;
    if (options.specFlag && row.specs[options.specFlag.key] !== options.specFlag.value) {
      return false;
    }
    return true;
  });
}

describe('shop collections', () => {
  it.each(SHOP_COLLECTIONS.map((c) => [c.slug, c] as const))(
    '%s lists something in its primary group',
    (_slug, collection) => {
      expect(query(collection.primary.query).length).toBeGreaterThan(0);
    },
  );

  it.each(
    SHOP_COLLECTIONS.filter((c) => c.secondary).map((c) => [c.slug, c] as const),
  )('%s lists something in its secondary group', (_slug, collection) => {
    expect(query(collection.secondary!.query).length).toBeGreaterThan(0);
  });

  it('has a unique slug per collection', () => {
    const slugs = SHOP_COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('collection spec flags', () => {
  /**
   * The mini-PC page splits its category into boards and accessories using
   * `sbc_accessory`. A row that never sets the flag matches NEITHER query and
   * silently disappears from the only page that lists it.
   */
  it('sets sbc_accessory on every mini-pc row', () => {
    const missing = SAMPLE_COMPONENTS.filter(
      (row) => row.category === 'mini-pc' && typeof row.specs.sbc_accessory !== 'boolean',
    );
    expect(missing.map((r) => r.id)).toEqual([]);
  });

  it('splits mini-pc rows into exactly boards and accessories', () => {
    const all = query({ category: 'mini-pc' }).length;
    const boards = query({ category: 'mini-pc', specFlag: { key: 'sbc_accessory', value: false } });
    const extras = query({ category: 'mini-pc', specFlag: { key: 'sbc_accessory', value: true } });
    expect(boards.length + extras.length).toBe(all);
    expect(boards.length).toBeGreaterThan(0);
    expect(extras.length).toBeGreaterThan(0);
  });

  it('only flags storage rows as nas_rated when they are drives', () => {
    const flagged = SAMPLE_COMPONENTS.filter((row) => row.specs.nas_rated === true);
    expect(flagged.length).toBeGreaterThan(0);
    for (const row of flagged) {
      expect(row.category).toBe('storage');
      expect(row.storage_capacity_gb).toBeGreaterThan(0);
    }
  });
});

describe('whole-unit categories', () => {
  it('are catalogue categories', () => {
    for (const category of WHOLE_UNIT_CATEGORIES) {
      expect(COMPONENT_CATEGORIES).toContain(category);
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  /**
   * The important one. A switch has no socket and a NAS has no radiator
   * clearance, so letting either into the configurator would hand the
   * compatibility engine a part it cannot reason about.
   */
  it('never reach the configurator', () => {
    for (const category of WHOLE_UNIT_CATEGORIES) {
      expect(CONFIGURATOR_CATEGORIES).not.toContain(category);
      expect(REQUIRED_CATEGORIES).not.toContain(category);
    }
  });

  it('carry no tower-build fields', () => {
    for (const row of SAMPLE_COMPONENTS) {
      if (!WHOLE_UNIT_CATEGORIES.includes(row.category)) continue;
      expect(row.socket).toBeNull();
      expect(row.form_factor).toBeNull();
      expect(row.memory_type).toBeNull();
      expect(row.psu_wattage).toBeNull();
      expect(row.gpu_length_mm).toBeNull();
      expect(row.cooler_type).toBeNull();
    }
  });

  it('every configurator category is still a real category', () => {
    for (const category of CONFIGURATOR_CATEGORIES) {
      expect(COMPONENT_CATEGORIES).toContain(category);
    }
  });
});

describe('condition labelling', () => {
  it('seeds nothing as refurbished or open box', () => {
    // A refurbished listing makes claims about one specific physical unit.
    // Seeding one would be inventing that unit's history.
    const notNew = SAMPLE_COMPONENTS.filter((row) => row.condition !== 'new');
    expect(notNew.map((r) => r.id)).toEqual([]);
  });

  it('requires condition notes on anything not sold as new', () => {
    const base = {
      id: 'gpu-example-card',
      sku: 'GPU-EX-1',
      category: 'gpu' as const,
      brand: 'Example',
      model: 'Card',
      description: 'A card.',
      price_cents: 50000,
      stock_quantity: 1,
      low_stock_threshold: 1,
    };

    expect(adminComponentSchema.safeParse({ ...base, condition: 'new' }).success).toBe(true);

    const noNotes = adminComponentSchema.safeParse({ ...base, condition: 'refurbished' });
    expect(noNotes.success).toBe(false);

    const tooShort = adminComponentSchema.safeParse({
      ...base,
      condition: 'open-box',
      condition_notes: 'fine',
    });
    expect(tooShort.success).toBe(false);

    const withNotes = adminComponentSchema.safeParse({
      ...base,
      condition: 'refurbished',
      condition_notes: 'Customer return. Tested four hours under load, no faults. 90-day warranty.',
    });
    expect(withNotes.success).toBe(true);
  });
});

describe('catalogue provenance', () => {
  /**
   * Operating-system rows are excluded, and deliberately.
   *
   * `os-none` is free, and the Windows rows are OEM licences whose cost comes
   * from a Microsoft reseller account rather than a shelf price, so there is no
   * retail figure to have checked. Those rows carry `data_confidence: 'sample'`
   * and say exactly that in `specs.unverified`, which the test below enforces.
   * Adding a fake check date to satisfy this assertion would be the wrong fix.
   */
  it('records a check date on every row with a retail price', () => {
    const missing = SAMPLE_COMPONENTS.filter(
      (row) => row.category !== 'os' && !row.specs.price_checked,
    );
    expect(missing.map((r) => r.id)).toEqual([]);
  });

  it('marks priced OS licences as unverified rather than inventing a source', () => {
    const priced = SAMPLE_COMPONENTS.filter((row) => row.category === 'os' && row.price_cents > 0);
    expect(priced.length).toBeGreaterThan(0);
    for (const row of priced) {
      expect(row.data_confidence).toBe('sample');
      expect(String(row.specs.unverified)).toMatch(/placeholder/i);
    }
  });

  /**
   * `data_confidence: 'sample'` means at least one figure was not confirmed.
   * The storefront prints `specs.unverified` to say which, so a row marked
   * unverified without that note tells a visitor nothing useful.
   */
  it('names the unconfirmed field on every unverified row', () => {
    const vague = SAMPLE_COMPONENTS.filter(
      (row) => row.data_confidence === 'sample' && typeof row.specs.unverified !== 'string',
    );
    expect(vague.map((r) => r.id)).toEqual([]);
  });

  it('keeps ids and SKUs unique', () => {
    const ids = SAMPLE_COMPONENTS.map((r) => r.id);
    const skus = SAMPLE_COMPONENTS.map((r) => r.sku);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(skus).size).toBe(skus.length);
  });
});

describe('product naming', () => {
  /**
   * Cart lines, order records and quote line items are all built from
   * displayName(). Raspberry Pi names its board "Raspberry Pi 5", so joining
   * brand and model unconditionally produced "Raspberry Pi Raspberry Pi 5" on
   * every one of those records.
   */
  it('never opens a product name with the brand twice', () => {
    // Only the LEADING duplication is a defect. A later mention is often
    // correct English: the Active Cooler is a Raspberry Pi product that is also
    // "for Raspberry Pi 5", and both mentions earn their place.
    for (const row of SAMPLE_COMPONENTS) {
      const name = displayName(row).toLowerCase();
      const brand = row.brand.trim().toLowerCase();
      expect(
        name.startsWith(`${brand} ${brand}`),
        `${row.id} opens with "${row.brand}" twice: "${displayName(row)}"`,
      ).toBe(false);
    }
  });

  it('still includes the brand when the model omits it', () => {
    expect(displayName({ brand: 'AMD', model: 'Ryzen 5 7600X' })).toBe('AMD Ryzen 5 7600X');
    expect(displayName({ brand: 'Raspberry Pi', model: 'Raspberry Pi 5 / 8GB' })).toBe(
      'Raspberry Pi 5 / 8GB',
    );
  });
});
