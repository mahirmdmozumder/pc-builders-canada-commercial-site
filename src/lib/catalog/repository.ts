import { getSupabasePublicClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SAMPLE_COMPONENTS } from '@/lib/catalog/sample-catalog';
import {
  stripCost,
  type ComponentCategory,
  type ComponentCondition,
  type ComponentRecord,
  type PublicComponent,
  type ResolvedBuild,
} from '@/lib/catalog/types';
import type { SavedBuildItem } from '@/types/domain';

/**
 * Catalogue reads.
 *
 * When Supabase is configured the catalogue comes from the `components`
 * table. When it is not, the local sample catalogue is used so the site is
 * fully browsable from a fresh clone. `getCatalogSource()` tells the UI which
 * one is in play, and the UI says so rather than passing sample data off as a
 * live inventory.
 *
 * Public reads go through the `components_public` view, which does not
 * contain cost_cents at all. Stripping the column in application code would
 * be a second line of defence; not selecting it in the first place is the
 * first. See docs/security.md.
 */

export type CatalogSource = 'database' | 'sample';

/**
 * Where the catalogue is EXPECTED to come from.
 *
 * This answers a configuration question, not a data question. It is right for
 * the admin settings panel, which is reporting on configuration, and wrong for
 * a storefront banner, which is making a claim about the rows on the page.
 * Use listComponentsWithSource() for that. See the note on it.
 */
export function getCatalogSource(): CatalogSource {
  return isSupabaseConfigured ? 'database' : 'sample';
}

/**
 * Whether rows from this source can actually be ordered.
 *
 * A deployment with NO database configured is a demo: the sample catalogue is
 * all there is, checkout already refuses for want of Stripe and Supabase, and
 * letting somebody fill a cart harms nothing.
 *
 * A CONFIGURED deployment that fell back to the sample catalogue is a
 * different situation. Those rows carry ids that do not exist in the database,
 * so the cart cannot resolve them, and offering an Add to cart button leads
 * straight to a dead end: the item lands in the cart, comes back as "no longer
 * available", and blocks checkout for the rest of the basket.
 *
 * That is exactly what happened when a schema migration had not been applied
 * and the new categories were served from the fallback. The storefront was
 * advertising things it could not sell.
 */
export function isOrderable(source: CatalogSource): boolean {
  return source === 'database' || !isSupabaseConfigured;
}

export interface CatalogResult {
  components: PublicComponent[];
  /** Where these particular rows actually came from. */
  source: CatalogSource;
}

export interface ListComponentsOptions {
  category?: ComponentCategory;
  categories?: ComponentCategory[];
  search?: string;
  /** Admin listings need deactivated rows; public listings never do. */
  includeInactive?: boolean;
  /** Hide anything with zero stock from the configurator. */
  inStockOnly?: boolean;
  /** Restrict to particular conditions, e.g. everything not sold as new. */
  conditions?: ComponentCondition[];
  /**
   * Match on a boolean flag inside `specs`.
   *
   * Used by the storefront collection pages to slice a category more finely
   * than the category itself allows: NAS-rated drives out of all storage,
   * single-board accessories out of all mini-PC rows. It is a DISPLAY filter
   * only. No compatibility rule may read `specs`, and this does not change
   * that; it decides which rows a page lists, never whether parts fit.
   *
   * A row missing the key does not match either value, so the flag has to be
   * set explicitly on every row that should be filterable.
   */
  specFlag?: { key: string; value: boolean };
  limit?: number;
}

function filterSample(options: ListComponentsOptions): ComponentRecord[] {
  let rows = SAMPLE_COMPONENTS.slice();
  if (!options.includeInactive) rows = rows.filter((r) => r.active);
  if (options.category) rows = rows.filter((r) => r.category === options.category);
  if (options.categories?.length) {
    const set = new Set(options.categories);
    rows = rows.filter((r) => set.has(r.category));
  }
  if (options.inStockOnly) rows = rows.filter((r) => r.stock_quantity > 0);
  if (options.conditions?.length) {
    const set = new Set<string>(options.conditions);
    rows = rows.filter((r) => set.has(r.condition));
  }
  if (options.specFlag) {
    const { key, value } = options.specFlag;
    rows = rows.filter((r) => r.specs[key] === value);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    rows = rows.filter((r) =>
      `${r.brand} ${r.model} ${r.sku} ${r.description}`.toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => a.price_cents - b.price_cents);
  return options.limit ? rows.slice(0, options.limit) : rows;
}

/**
 * Catalogue read that reports where its rows came from.
 *
 * The distinction matters. A configured deployment whose query FAILS falls back
 * to the sample catalogue, and the page then shows sample rows while
 * getCatalogSource() still says 'database' — so the banner telling the visitor
 * these are sample figures never appears. That is exactly the situation the
 * banner exists for, and it happened: a schema migration had not been applied,
 * every category query errored, and the storefront presented in-repo sample
 * data as live inventory.
 *
 * So the source travels with the rows rather than being inferred separately.
 */
export async function listComponentsWithSource(
  options: ListComponentsOptions = {},
): Promise<CatalogResult> {
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return { components: filterSample(options).map(stripCost), source: 'sample' };
  }

  // The view is already filtered to active rows.
  let query = supabase.from('components_public').select('*');
  if (options.category) query = query.eq('category', options.category);
  if (options.categories?.length) query = query.in('category', options.categories);
  if (options.inStockOnly) query = query.gt('stock_quantity', 0);
  if (options.conditions?.length) query = query.in('condition', options.conditions);
  if (options.specFlag) {
    // PostgREST compares a jsonb field extracted with ->> as text, so the
    // boolean has to be sent as the string Postgres renders it as.
    query = query.eq(
      `specs->>${options.specFlag.key}`,
      options.specFlag.value ? 'true' : 'false',
    );
  }
  if (options.search) {
    const q = options.search.replace(/[%,]/g, ' ');
    query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  query = query.order('price_cents', { ascending: true });
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error || !data) {
    // A database outage should not take the site down. Falling back keeps the
    // site usable; reporting 'sample' keeps it honest about what it is showing.
    console.error('[catalog] component query failed, using sample catalogue', error?.message);
    return { components: filterSample(options).map(stripCost), source: 'sample' };
  }
  return { components: data as unknown as PublicComponent[], source: 'database' };
}

/** Rows only, for callers that do not display a provenance banner. */
export async function listComponents(
  options: ListComponentsOptions = {},
): Promise<PublicComponent[]> {
  const { components } = await listComponentsWithSource(options);
  return components;
}

/**
 * Admin-only: reads the underlying table, cost price included.
 *
 * Uses the SESSION client, not the service-role client, on purpose. The
 * table's select policy requires is_admin(), so if a caller ever forgets its
 * requireAdmin() check this query returns nothing rather than leaking margin.
 * A service-role client would have happily returned the rows.
 */
export async function listComponentsWithCost(
  options: ListComponentsOptions = {},
): Promise<ComponentRecord[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return filterSample({ ...options, includeInactive: true });

  let query = supabase.from('components').select('*');
  if (!options.includeInactive) query = query.eq('active', true);
  if (options.category) query = query.eq('category', options.category);
  if (options.search) {
    const q = options.search.replace(/[%,]/g, ' ');
    query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  const { data, error } = await query.order('category').order('brand');
  if (error || !data) return filterSample({ ...options, includeInactive: true });
  return data as ComponentRecord[];
}

export async function getComponentsByIds(ids: string[]): Promise<Map<string, PublicComponent>> {
  if (ids.length === 0) return new Map();

  const supabase = getSupabasePublicClient();
  if (!supabase) {
    const map = new Map<string, PublicComponent>();
    for (const row of SAMPLE_COMPONENTS) {
      if (ids.includes(row.id)) map.set(row.id, stripCost(row));
    }
    return map;
  }

  const { data, error } = await supabase.from('components_public').select('*').in('id', ids);
  if (error || !data) {
    const map = new Map<string, PublicComponent>();
    for (const row of SAMPLE_COMPONENTS) {
      if (ids.includes(row.id)) map.set(row.id, stripCost(row));
    }
    return map;
  }
  return new Map((data as unknown as PublicComponent[]).map((row) => [row.id, row]));
}

export async function getComponent(id: string): Promise<PublicComponent | null> {
  const map = await getComponentsByIds([id]);
  return map.get(id) ?? null;
}

/**
 * One product, by the slug in its URL.
 *
 * Matches `slug` OR `id`, because the two are the same string for every row the
 * admin has created (`slug: input.id` in the create route) and a row predating
 * the slug column has only the id. Accepting both means no product is
 * unreachable, and since both columns are unique there is no ambiguity about
 * which row a given address resolves to.
 *
 * Reads `components_public`, so an unpublished or archived product is simply
 * absent and the page returns a real 404. That is deliberate: a soft 404 leaves
 * a dead URL in Google's index pointing at an empty shell.
 *
 * No sample-catalogue fallback on a configured deployment, for the reason
 * isOrderable() documents — a sample row carries an id the cart cannot resolve,
 * so a product page built from one would offer an Add to cart button that fails
 * at checkout. On an unconfigured deployment the sample catalogue is all there
 * is, and the page is browsable from it.
 */
export async function getComponentBySlug(slug: string): Promise<PublicComponent | null> {
  const wanted = slug.trim().toLowerCase();

  /**
   * Shape-checked before it reaches the query, and this is not cosmetic.
   *
   * The lookup below uses PostgREST's `or`, whose filters are comma-separated
   * text. A slug containing a comma or a dot would be parsed as ADDITIONAL
   * filters rather than as a value — `a,id.eq.b` becomes two conditions. Nothing
   * outside `components_public` is reachable that way, so it is not a data leak,
   * but it turns a 404 into a 400 and it is the kind of hole that stops being
   * harmless the moment this helper is copied somewhere with a wider view.
   *
   * Every id and slug in the catalogue is lowercase alphanumeric with hyphens —
   * the admin create route enforces exactly this pattern — so anything else
   * cannot match a real product and is a 404 regardless.
   */
  if (!/^[a-z0-9-]{1,120}$/.test(wanted)) return null;

  const supabase = getSupabasePublicClient();
  if (!supabase) {
    const row = SAMPLE_COMPONENTS.find(
      (candidate) => candidate.active && (candidate.slug === wanted || candidate.id === wanted),
    );
    return row ? stripCost(row) : null;
  }

  const { data, error } = await supabase
    .from('components_public')
    .select('*')
    .or(`slug.eq.${wanted},id.eq.${wanted}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[catalog] product lookup failed', error.message);
    return null;
  }
  return (data as unknown as PublicComponent) ?? null;
}

/**
 * Products to show beside this one.
 *
 * Ranked rather than randomly picked, because "related" has a defensible order:
 *
 *   1. Same category AND same brand. The closest substitute a shopper is
 *      actually choosing between.
 *   2. Same category, any brand. Still a substitute.
 *   3. Parts that go WITH it, per COMPANION_CATEGORIES. Somebody looking at a
 *      motherboard is plausibly also buying memory; somebody looking at a NAS is
 *      not buying a CPU socket.
 *
 * Within each tier, in-stock first and then by the admin's display order, so a
 * suggestion is something that can actually be bought today.
 *
 * The current product is always excluded. Everything comes from the catalogue —
 * nothing here invents a relationship that is not in the data.
 */
const COMPANION_CATEGORIES: Partial<Record<ComponentCategory, ComponentCategory[]>> = {
  cpu: ['motherboard', 'cooler', 'ram'],
  motherboard: ['cpu', 'ram', 'storage'],
  cooler: ['case', 'case-fan'],
  ram: ['motherboard', 'cpu'],
  gpu: ['psu', 'case'],
  storage: ['motherboard', 'nas'],
  psu: ['case', 'gpu'],
  case: ['case-fan', 'cooler', 'psu'],
  'case-fan': ['case', 'cooler'],
  nas: ['storage', 'networking'],
  networking: ['nas', 'mini-pc'],
  'mini-pc': ['networking', 'storage', 'monitor'],
  monitor: ['gpu', 'accessory'],
  accessory: ['monitor', 'case-fan'],
  os: ['storage'],
  other: [],
};

export async function relatedComponents(
  product: PublicComponent,
  limit = 8,
): Promise<PublicComponent[]> {
  const companions = COMPANION_CATEGORIES[product.category] ?? [];

  // One query covering both tiers. Two queries would be a round trip to save
  // filtering a few dozen rows in memory.
  const candidates = await listComponents({
    categories: [product.category, ...companions],
  });

  const pool = candidates.filter((row) => row.id !== product.id);

  function tier(row: PublicComponent): number {
    if (row.category === product.category) {
      return row.brand.toLowerCase() === product.brand.toLowerCase() ? 0 : 1;
    }
    // Preserves the order companions were declared in, so the first-listed
    // companion category ranks above the third.
    return 2 + Math.max(0, companions.indexOf(row.category));
  }

  return pool
    .sort((a, b) => {
      const byTier = tier(a) - tier(b);
      if (byTier !== 0) return byTier;
      const aStocked = a.stock_quantity > 0 ? 0 : 1;
      const bStocked = b.stock_quantity > 0 ? 0 : 1;
      if (aStocked !== bStocked) return aStocked - bStocked;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.price_cents - b.price_cents;
    })
    .slice(0, limit);
}

/**
 * Turn stored build items into a build the engines can evaluate.
 *
 * Items whose component no longer exists are dropped and reported, so an
 * order or saved build referencing a deleted part degrades visibly instead of
 * silently pricing itself lower.
 */
export async function resolveBuild(
  items: SavedBuildItem[],
): Promise<{ build: ResolvedBuild; missingIds: string[] }> {
  const ids = items.map((i) => i.component_id);
  const map = await getComponentsByIds(ids);

  const build: ResolvedBuild = [];
  const missingIds: string[] = [];

  for (const item of items) {
    const component = map.get(item.component_id);
    if (!component) {
      missingIds.push(item.component_id);
      continue;
    }
    build.push({
      category: component.category,
      component,
      quantity: Math.max(1, item.quantity),
    });
  }

  return { build, missingIds };
}

/** Synchronous resolution against an already-loaded catalogue (client-side). */
export function resolveBuildFrom(
  items: SavedBuildItem[],
  catalogue: Map<string, PublicComponent>,
): ResolvedBuild {
  const build: ResolvedBuild = [];
  for (const item of items) {
    const component = catalogue.get(item.component_id);
    if (!component) continue;
    build.push({ category: component.category, component, quantity: Math.max(1, item.quantity) });
  }
  return build;
}
