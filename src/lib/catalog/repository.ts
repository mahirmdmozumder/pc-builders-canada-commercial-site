import { getSupabasePublicClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SAMPLE_COMPONENTS } from '@/lib/catalog/sample-catalog';
import {
  stripCost,
  type ComponentCategory,
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
 * Cost price is stripped here, at the boundary, so a margin figure cannot
 * leak into a public page by accident.
 */

export type CatalogSource = 'database' | 'sample';

export function getCatalogSource(): CatalogSource {
  return isSupabaseConfigured ? 'database' : 'sample';
}

export interface ListComponentsOptions {
  category?: ComponentCategory;
  categories?: ComponentCategory[];
  search?: string;
  /** Admin listings need deactivated rows; public listings never do. */
  includeInactive?: boolean;
  /** Hide anything with zero stock from the configurator. */
  inStockOnly?: boolean;
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
  if (options.search) {
    const q = options.search.toLowerCase();
    rows = rows.filter((r) =>
      `${r.brand} ${r.model} ${r.sku} ${r.description}`.toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => a.price_cents - b.price_cents);
  return options.limit ? rows.slice(0, options.limit) : rows;
}

export async function listComponents(
  options: ListComponentsOptions = {},
): Promise<PublicComponent[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return filterSample(options).map(stripCost);

  let query = supabase.from('components').select('*');
  if (!options.includeInactive) query = query.eq('active', true);
  if (options.category) query = query.eq('category', options.category);
  if (options.categories?.length) query = query.in('category', options.categories);
  if (options.inStockOnly) query = query.gt('stock_quantity', 0);
  if (options.search) {
    const q = options.search.replace(/[%,]/g, ' ');
    query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  query = query.order('price_cents', { ascending: true });
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error || !data) {
    // A database outage should not take the site down; fall back and let the
    // caller surface the sample-data banner.
    console.error('[catalog] component query failed, using sample catalogue', error?.message);
    return filterSample(options).map(stripCost);
  }
  return (data as ComponentRecord[]).map(stripCost);
}

/** Admin-only: includes cost price. Callers must have verified the admin role. */
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

  const { data, error } = await supabase.from('components').select('*').in('id', ids);
  if (error || !data) {
    const map = new Map<string, PublicComponent>();
    for (const row of SAMPLE_COMPONENTS) {
      if (ids.includes(row.id)) map.set(row.id, stripCost(row));
    }
    return map;
  }
  return new Map((data as ComponentRecord[]).map((row) => [row.id, stripCost(row)]));
}

export async function getComponent(id: string): Promise<PublicComponent | null> {
  const map = await getComponentsByIds([id]);
  return map.get(id) ?? null;
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
