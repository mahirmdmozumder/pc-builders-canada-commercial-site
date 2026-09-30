import { describe, expect, it } from 'vitest';
import { SAMPLE_COMPONENTS } from '@/lib/catalog/sample-catalog';
import { getComponentBySlug, relatedComponents } from '@/lib/catalog/repository';
import { buildSpecSheet, specRowCount } from '@/lib/catalog/spec-sheet';
import { describeVideo, productHref, stockState, stripCost } from '@/lib/catalog/types';
import { toShopItem } from '@/lib/catalog/shop';

/**
 * Product page data.
 *
 * Two classes of failure are covered:
 *
 *   1. A product becoming UNREACHABLE — a duplicate or malformed slug means two
 *      products share a URL, or one has none.
 *   2. A spec sheet asserting something the row does not hold. An empty row, an
 *      invented figure, or a compatibility value silently missing from the sheet
 *      while the engine is busy comparing it.
 */

const SAMPLE = SAMPLE_COMPONENTS.map(stripCost);

describe('product addresses', () => {
  it('gives every catalogue row a URL-safe address', () => {
    for (const product of SAMPLE) {
      const href = productHref(product);
      expect(href, product.id).toMatch(/^\/products\/[a-z0-9-]+$/);
    }
  });

  /**
   * Two products at one URL means one of them is unreachable and both split the
   * ranking of a page that describes only one of them.
   */
  it('gives no two products the same address', () => {
    const addresses = SAMPLE.map(productHref);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  /**
   * The slug is interpolated into a PostgREST `or` filter, whose conditions are
   * comma-separated. A value carrying a comma or a dot would be read as extra
   * filters rather than as a value, so anything that is not a real slug shape has
   * to be a 404 before it reaches the query.
   */
  it('refuses a slug that could break out of the lookup filter', async () => {
    for (const hostile of [
      'a,id.eq.b',
      'x.or(1)',
      '*',
      'a%20b',
      'A-B', // uppercase is not a slug shape either
      '../admin',
      '',
      '   ',
    ]) {
      await expect(getComponentBySlug(hostile)).resolves.toBeNull();
    }
  });

  it('still resolves a real product', async () => {
    const product = SAMPLE[0];
    const found = await getComponentBySlug(productHref(product).replace('/products/', ''));
    expect(found?.id).toBe(product.id);
  });

  it('falls back to the id when a row has no slug', () => {
    // Rows predating the slug column, and any row where the admin cleared it.
    const withoutSlug = { ...SAMPLE[0], slug: '' };
    expect(productHref(withoutSlug)).toBe(`/products/${SAMPLE[0].id}`);
  });

  /**
   * The card, the breadcrumb, the sitemap and the structured data all have to
   * agree on where a product lives. They do that by all calling productHref, so
   * the shop projection must not build its own.
   */
  it('is the same address the shop card links to', () => {
    for (const product of SAMPLE.slice(0, 20)) {
      expect(toShopItem(product).href).toBe(productHref(product));
    }
  });
});

describe('stock state', () => {
  it('reports out of stock at zero', () => {
    expect(stockState({ stock_quantity: 0, low_stock_threshold: 3 })).toBe('out');
  });

  it('reports low at or below the row threshold', () => {
    expect(stockState({ stock_quantity: 3, low_stock_threshold: 3 })).toBe('low');
    expect(stockState({ stock_quantity: 1, low_stock_threshold: 3 })).toBe('low');
  });

  it('reports in stock above it', () => {
    expect(stockState({ stock_quantity: 4, low_stock_threshold: 3 })).toBe('in-stock');
  });

  /**
   * A threshold of zero is a legitimate setting for something we never want to
   * flag. It must not make every in-stock unit read as low.
   */
  it('handles a zero threshold', () => {
    expect(stockState({ stock_quantity: 1, low_stock_threshold: 0 })).toBe('in-stock');
  });
});

describe('specification sheet', () => {
  it('produces rows for every catalogue product', () => {
    for (const product of SAMPLE) {
      const groups = buildSpecSheet(product);
      // Brand, model, category, condition and SKU are present on every row, so
      // the identity group alone guarantees this.
      expect(specRowCount(groups), product.id).toBeGreaterThanOrEqual(4);
    }
  });

  /**
   * The failure this exists to prevent: an empty "Socket: —" row, which reads as
   * a spec sheet that has been checked while telling the reader nothing.
   */
  it('never emits a row with an empty value', () => {
    for (const product of SAMPLE) {
      for (const group of buildSpecSheet(product)) {
        for (const row of group.rows) {
          expect(row.value.trim(), `${product.id} / ${row.label}`).not.toBe('');
          expect(row.value, `${product.id} / ${row.label}`).not.toMatch(
            /^(null|undefined|NaN|—|-)$/,
          );
        }
      }
    }
  });

  it('never emits an empty group', () => {
    for (const product of SAMPLE) {
      for (const group of buildSpecSheet(product)) {
        expect(group.rows.length, `${product.id} / ${group.title}`).toBeGreaterThan(0);
      }
    }
  });

  it('labels every row', () => {
    for (const product of SAMPLE) {
      for (const group of buildSpecSheet(product)) {
        for (const row of group.rows) {
          expect(row.label.trim(), product.id).not.toBe('');
        }
      }
    }
  });

  /**
   * `unverified` is a caveat printed beside the PRICE, naming the figure that was
   * not confirmed. Rendering it as a specification row would turn a disclosure
   * into a feature.
   */
  it('keeps reserved spec keys out of the sheet', () => {
    const withCaveat = {
      ...SAMPLE[0],
      specs: { unverified: 'Boost clock not confirmed', price_checked: '2026-09-18', cores: 8 },
    };
    const labels = buildSpecSheet(withCaveat).flatMap((g) => g.rows.map((r) => r.label));
    expect(labels).not.toContain('Unverified');
    expect(labels).not.toContain('Price checked');
    expect(labels).toContain('Cores');
  });

  /**
   * A compatibility figure that the engine compares but the sheet omits is the
   * quieter half of the same problem lib/cms/spec-fields.ts warns about: the
   * buyer cannot cross-check the number the site is relying on.
   */
  it('marks compatibility figures as checked, and shows them', () => {
    const cpu = SAMPLE.find((row) => row.category === 'cpu' && row.socket);
    expect(cpu, 'no sample CPU with a socket').toBeDefined();

    const rows = buildSpecSheet(cpu!).flatMap((group) => group.rows);
    const socket = rows.find((row) => row.label === 'Socket');
    expect(socket?.value).toBe(cpu!.socket);
    expect(socket?.checked).toBe(true);
  });

  it('prints a terabyte drive in terabytes', () => {
    const drive = SAMPLE.find(
      (row) => row.category === 'storage' && (row.storage_capacity_gb ?? 0) >= 2000,
    );
    if (!drive) return; // Catalogue has no multi-terabyte drive; nothing to assert.
    const rows = buildSpecSheet(drive).flatMap((group) => group.rows);
    const capacity = rows.find((row) => row.label === 'Capacity');
    expect(capacity?.value).toMatch(/TB$/);
  });

  it('gives a whole unit a sheet even with no compatibility columns', () => {
    // Networking, NAS and mini-PC rows carry no typed compatibility fields by
    // design. They must still produce a readable sheet from `specs`.
    const unit = SAMPLE.find((row) => row.category === 'networking');
    expect(unit, 'no sample networking row').toBeDefined();
    expect(specRowCount(buildSpecSheet(unit!))).toBeGreaterThan(5);
  });
});

describe('product video', () => {
  it('ignores an absent or unusable value rather than rendering an empty player', () => {
    expect(describeVideo(null)).toBeNull();
    expect(describeVideo(undefined)).toBeNull();
    expect(describeVideo('')).toBeNull();
    expect(describeVideo('   ')).toBeNull();
    expect(describeVideo('not a url')).toBeNull();
    // A product page, not a video.
    expect(describeVideo('https://example.com/page.html')).toBeNull();
  });

  /**
   * javascript: and data: URLs would be attacker-controlled content in a src
   * attribute. The admin field is admin-only, but a scheme allowlist costs one
   * comparison.
   */
  it('accepts only http and https', () => {
    expect(describeVideo('javascript:alert(1)')).toBeNull();
    expect(describeVideo('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('recognises the YouTube URL forms people actually paste', () => {
    const watch = describeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const short = describeVideo('https://youtu.be/dQw4w9WgXcQ');
    for (const result of [watch, short]) {
      expect(result?.kind).toBe('embed');
      expect(result?.src).toContain('dQw4w9WgXcQ');
      // youtube-nocookie, so loading the player does not set advertising cookies
      // on somebody who only wanted to look at a graphics card.
      expect(result?.src).toContain('youtube-nocookie.com');
      expect(result?.poster).toContain('dQw4w9WgXcQ');
    }
  });

  it('recognises Vimeo, and only with a numeric id', () => {
    expect(describeVideo('https://vimeo.com/123456789')?.kind).toBe('embed');
    expect(describeVideo('https://vimeo.com/channels/staffpicks')).toBeNull();
  });

  it('recognises an uploaded video file', () => {
    const uploaded = describeVideo(
      'https://project.supabase.co/storage/v1/object/public/media/components/2026/abc.mp4',
    );
    expect(uploaded?.kind).toBe('file');
    expect(describeVideo('https://example.com/clip.webm')?.kind).toBe('file');
  });

  it('leaves the sample catalogue without video, since none was shot', () => {
    for (const product of SAMPLE) {
      expect(product.video_url, product.id).toBeNull();
    }
  });
});

/**
 * Related products.
 *
 * Runs against the sample catalogue, because no Supabase environment is
 * configured under test and the repository falls back to it — which is the same
 * code path a fresh clone takes.
 */
describe('related products', () => {
  it('never includes the product being viewed', async () => {
    // Across categories, not just one, since the companion map differs per
    // category and the exclusion is applied once for all of them.
    for (const product of [
      SAMPLE.find((r) => r.category === 'cpu')!,
      SAMPLE.find((r) => r.category === 'gpu')!,
      SAMPLE.find((r) => r.category === 'networking')!,
      SAMPLE.find((r) => r.category === 'nas')!,
    ]) {
      const related = await relatedComponents(product);
      expect(related.map((r) => r.id), product.id).not.toContain(product.id);
    }
  });

  it('leads with the same category', async () => {
    const gpu = SAMPLE.find((row) => row.category === 'gpu')!;
    const related = await relatedComponents(gpu);
    expect(related.length).toBeGreaterThan(0);
    expect(related[0].category).toBe('gpu');
  });

  it('prefers the same brand within the category', async () => {
    // A brand with more than one card in the catalogue, so there is a preference
    // to express in the first place.
    const gpus = SAMPLE.filter((row) => row.category === 'gpu');
    const brands = gpus.map((g) => g.brand.toLowerCase());
    const repeated = brands.find((brand, index) => brands.indexOf(brand) !== index);
    if (!repeated) return; // No brand appears twice; nothing to assert.

    const subject = gpus.find((g) => g.brand.toLowerCase() === repeated)!;
    const related = await relatedComponents(subject);
    expect(related[0].brand.toLowerCase()).toBe(repeated);
  });

  it('returns no more than asked for', async () => {
    const related = await relatedComponents(SAMPLE.find((r) => r.category === 'cpu')!, 3);
    expect(related.length).toBeLessThanOrEqual(3);
  });

  /**
   * Every suggestion has to be a page somebody can open. A related tile that
   * 404s is worse than one fewer tile.
   */
  it('suggests only products with their own page', async () => {
    const related = await relatedComponents(SAMPLE.find((r) => r.category === 'case')!);
    for (const item of related) {
      expect(productHref(item)).toMatch(/^\/products\/[a-z0-9-]+$/);
    }
  });
});
