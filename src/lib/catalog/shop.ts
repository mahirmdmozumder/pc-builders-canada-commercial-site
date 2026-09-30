import { listComponents } from '@/lib/catalog/repository';
import { listPublishedPresets } from '@/lib/cms/repository';
import { PRICING_CONFIG } from '@/lib/pricing/pricing';
import {
  CATEGORY_LABELS,
  displayName,
  productHref,
  type ComponentCategory,
  type ComponentCondition,
  type PublicComponent,
} from '@/lib/catalog/types';
import type { BuildPresetRecord } from '@/lib/cms/types';

/**
 * The unified shop catalogue.
 *
 * Two different things are sold here: catalogue parts and assembled machines.
 * They live in different tables for good reasons — a pre-built is a list of
 * parts, not a part — so this module projects both onto one shape rather than
 * duplicating either into the other's table.
 *
 * A pre-built has no stored price. Its figure is the sum of its parts plus the
 * assembly fee, computed on every render, which is why a preset can never
 * advertise a total the parts no longer cost.
 */

export type ShopItemKind = 'component' | 'prebuilt';

export interface ShopItem {
  kind: ShopItemKind;
  id: string;
  slug: string;
  /** Full product name, as a customer would say it. */
  name: string;
  brand: string | null;
  category: ComponentCategory | null;
  categoryLabel: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  galleryCount: number;
  condition: ComponentCondition;
  featured: boolean;
  sortOrder: number;
  /** Null for a pre-built: stock is per part, not per machine. */
  stockQuantity: number | null;
  lowStockThreshold: number;
  href: string;
  /** Display-only extras, used by the filters. No compatibility rule reads it. */
  specs: Record<string, string | number | boolean>;
  /** The figure a pre-built's price is built from, for the caveat line. */
  partsCents?: number;
}

/**
 * Projects one catalogue row onto the shop's card shape.
 *
 * Exported so the product page can render its "You may also like" row with the
 * same card component the shop grid uses. Two card designs for the same product
 * is how a grid ends up inconsistent, and a second projection is a second place
 * for the price to be computed.
 */
export function toShopItem(component: PublicComponent): ShopItem {
  return {
    kind: 'component',
    id: component.id,
    slug: component.slug ?? component.id,
    name: displayName(component),
    brand: component.brand,
    category: component.category,
    categoryLabel: CATEGORY_LABELS[component.category] ?? component.category,
    description: component.short_description ?? component.description,
    priceCents: component.price_cents,
    imageUrl: component.image_url,
    galleryCount: component.gallery_urls?.length ?? 0,
    condition: component.condition,
    featured: component.featured ?? false,
    sortOrder: component.sort_order ?? 0,
    stockQuantity: component.stock_quantity,
    lowStockThreshold: component.low_stock_threshold,
    // The product's own page.
    //
    // This used to be a SEARCH for the product's own name, which meant every
    // product on the site shared one indexable URL and clicking a card ran a
    // query instead of opening anything. productHref() is the single place that
    // builds this address, so cards, breadcrumbs, the sitemap and the structured
    // data cannot disagree about where a product lives.
    href: productHref(component),
    specs: component.specs ?? {},
  };
}

function presetToShopItem(preset: BuildPresetRecord, parts: Map<string, PublicComponent>): ShopItem {
  const partsCents = preset.items.reduce((sum, item) => {
    const component = parts.get(item.component_id);
    return sum + (component ? component.price_cents * item.quantity : 0);
  }, 0);

  return {
    kind: 'prebuilt',
    id: preset.id,
    slug: preset.slug,
    name: preset.name,
    brand: null,
    category: null,
    categoryLabel: 'Pre-built PC',
    description: preset.tagline,
    // Parts plus assembly: the price of a machine that arrives built and
    // tested, which is what "pre-built" means. Shipping and tax are added at
    // checkout and depend on where it is going.
    priceCents: partsCents > 0 ? partsCents + PRICING_CONFIG.assemblyFeeCents : 0,
    partsCents,
    imageUrl: preset.hero_image_url ?? preset.gallery_urls?.[0] ?? null,
    galleryCount: Math.max(0, (preset.gallery_urls?.length ?? 0) - 1),
    condition: 'new',
    featured: preset.featured,
    sortOrder: preset.sort_order,
    stockQuantity: null,
    lowStockThreshold: 0,
    // The machine's own page, not the configurator.
    //
    // /pre-built-gaming-pcs/[slug] already existed and is what the sitemap
    // lists; the card pointed past it into /build?preset=, so the one indexable
    // page for each machine was the one nothing linked to. The configurator is
    // still one click away from there, which is the right order: read the
    // specification, then change it.
    href: `/pre-built-gaming-pcs/${preset.slug}`,
    specs: {},
  };
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * The category tiles at the top of the shop.
 *
 * Several of these are NOT database categories, and that is deliberate. PoE,
 * 2.5GbE and "always-on machines" describe a property of a product rather than
 * a kind of product: a PoE switch is still a switch. Making each one a real
 * category would mean either duplicating products across categories or
 * inventing categories the compatibility engine has no rules for.
 *
 * So they are saved filters over the existing data. The customer gets the same
 * buttons; the catalogue keeps one row per product.
 */
export interface ShopFilter {
  slug: string;
  label: string;
  description: string;
  matches: (item: ShopItem) => boolean;
}

/** Categories that go into a tower, as opposed to finished units. */
const PART_CATEGORIES: ComponentCategory[] = [
  'cpu',
  'motherboard',
  'cooler',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'case-fan',
];

function spec(item: ShopItem, key: string): string {
  const value = item.specs[key];
  return value === undefined || value === null ? '' : String(value).toLowerCase();
}

export const SHOP_FILTERS: ShopFilter[] = [
  {
    slug: 'all',
    label: 'Everything',
    description: 'The whole catalogue.',
    matches: () => true,
  },
  {
    slug: 'prebuilt',
    label: 'Pre-built PCs',
    description: 'Machines that arrive assembled, cabled and tested.',
    matches: (item) => item.kind === 'prebuilt',
  },
  {
    slug: 'components',
    label: 'PC components',
    description: 'Parts for a build or an upgrade.',
    matches: (item) => item.category !== null && PART_CATEGORIES.includes(item.category),
  },
  {
    slug: 'networking',
    label: 'Networking & switches',
    description: 'Managed and smart switches for home and small-office networks.',
    matches: (item) => item.category === 'networking',
  },
  {
    slug: 'poe',
    label: 'PoE',
    description: 'Switches that power access points, cameras and phones over the network cable.',
    matches: (item) =>
      item.category === 'networking' &&
      (spec(item, 'poe_ports') !== '' ||
        spec(item, 'poe_budget_watts') !== '' ||
        spec(item, 'ports').includes('poe')),
  },
  {
    slug: '2-5gbe',
    label: '2.5GbE',
    description: 'Faster-than-gigabit links between a NAS and the machines that use it.',
    // The model name is checked as well as the spec fields. A switch called
    // "USW-Flex-2.5G-8-PoE" describes its access ports as "8 ports, all PoE+
    // capable" and never repeats the speed, so a spec-only match missed it.
    matches: (item) =>
      item.name.toLowerCase().includes('2.5g') ||
      spec(item, 'ports').includes('2.5g') ||
      spec(item, 'network').includes('2.5g') ||
      spec(item, 'uplink').includes('2.5g'),
  },
  {
    slug: 'nas',
    label: 'NAS & enclosures',
    description: 'Network storage units, sold diskless.',
    matches: (item) => item.category === 'nas',
  },
  {
    slug: 'nas-drives',
    label: 'NAS drives',
    description: 'Drives rated for continuous operation in a multi-bay enclosure.',
    matches: (item) => item.specs.nas_rated === true,
  },
  {
    slug: 'mini-pcs',
    label: 'Mini PCs & Pi',
    description: 'Small x86 machines and single-board computers.',
    matches: (item) => item.category === 'mini-pc',
  },
  {
    slug: 'always-on',
    label: 'Always-on machines',
    description: 'Low-power systems meant to stay running: home servers, NAS and Pi builds.',
    matches: (item) =>
      item.category === 'nas' ||
      (item.category === 'mini-pc' && item.specs.sbc_accessory !== true),
  },
  {
    slug: 'open-box',
    label: 'Open box & tested',
    description: 'Opened or verified working, at a lower price, with the condition stated.',
    matches: (item) => item.condition === 'open-box' || item.condition === 'tested',
  },
  {
    slug: 'refurbished',
    label: 'Refurbished & used',
    description: 'Repaired or sold as-is, with the notes saying exactly what was done.',
    matches: (item) => item.condition === 'refurbished' || item.condition === 'used',
  },
];

export function findShopFilter(slug: string | undefined): ShopFilter {
  return SHOP_FILTERS.find((f) => f.slug === slug) ?? SHOP_FILTERS[0];
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/** Cheap, stable string hash. Same input, same number, every process. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Rotates the catalogue so the same category does not always lead.
 *
 * Deliberately NOT `order by random()`. That makes Postgres sort the whole
 * table on every request, it cannot be cached, and — the real problem — it
 * gives a different order to each page of a paginated list, so products get
 * duplicated across pages and others never appear at all.
 *
 * Instead each item gets a stable hash mixed with an hourly seed. The order is
 * identical for every visitor within the same hour, so pagination is coherent
 * and the page still caches, while the front of the shop changes through the
 * day.
 *
 * Featured items are sorted ahead of the rest, then by the admin's display
 * order, and only then rotated. Rotation decides what a customer stumbles
 * across, not what the business chose to promote.
 */
export function rotateShopItems(items: ShopItem[], now = new Date()): ShopItem[] {
  const bucket = Math.floor(now.getTime() / (60 * 60 * 1000));
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return hash(`${a.id}:${bucket}`) - hash(`${b.id}:${bucket}`);
  });
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export interface ShopCatalogue {
  items: ShopItem[];
  /** True when the rows came from the in-repo fallback rather than the database. */
  sample: boolean;
}

/**
 * Everything the shop sells, in one list.
 *
 * Two queries, not one per category. The page filters and paginates in memory
 * because the whole catalogue is a few dozen rows; querying per tile would be
 * a round trip for every button and would still need combining afterwards.
 */
export async function loadShopCatalogue(): Promise<ShopCatalogue> {
  const [components, presetResult] = await Promise.all([
    listComponents(),
    listPublishedPresets(),
  ]);

  const byId = new Map(components.map((c) => [c.id, c]));
  const items = [
    ...presetResult.rows.map((preset) => presetToShopItem(preset, byId)),
    ...components.map(toShopItem),
  ];

  return { items, sample: presetResult.source === 'fallback' };
}

/**
 * The lowest price of an assembled machine currently on sale.
 *
 * Only pre-builts are considered. Using the catalogue minimum would put a
 * $7 cooler behind "Pre-built from", which is true of nothing.
 *
 * Returns null when nothing is published, so the caller can leave the line out
 * rather than print a zero.
 */
export async function lowestPrebuiltPriceCents(): Promise<number | null> {
  const { items } = await loadShopCatalogue();
  const prices = items
    .filter((item) => item.kind === 'prebuilt' && item.priceCents > 0)
    .map((item) => item.priceCents);
  return prices.length > 0 ? Math.min(...prices) : null;
}
