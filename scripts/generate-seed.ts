/**
 * Generates supabase/seed/seed.sql from the TypeScript sample catalogue.
 *
 * Keeping one source of truth avoids the classic drift where the seeded
 * database and the in-repo fallback catalogue disagree about what a part is.
 *
 *   npm run db:seed:generate
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SAMPLE_COMPONENTS } from '../src/lib/catalog/sample-catalog';
import { SERVICE_CONTENT } from '../src/content/services';
import { BUILD_PRESETS } from '../src/lib/catalog/presets';
import { CATEGORY_LABELS, COMPONENT_CATEGORIES } from '../src/lib/catalog/types';
import type { ComponentRecord } from '../src/lib/catalog/types';

function sqlString(value: string | null): string {
  if (value === null) return 'null';
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number | null): string {
  return value === null || value === undefined ? 'null' : String(value);
}

function sqlTextArray(value: string[] | null): string {
  if (!value || value.length === 0) return 'null';
  return `array[${value.map((v) => sqlString(v)).join(', ')}]`;
}

function sqlEnumArray(value: string[] | null, enumType: string): string {
  if (!value || value.length === 0) return 'null';
  return `array[${value.map((v) => sqlString(v)).join(', ')}]::${enumType}[]`;
}

function sqlIntArray(value: number[] | null): string {
  if (!value || value.length === 0) return 'null';
  return `array[${value.join(', ')}]`;
}

function sqlJson(value: Record<string, unknown>): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const COLUMNS = [
  'id',
  'sku',
  'slug',
  'category',
  'brand',
  'model',
  'description',
  'price_cents',
  'cost_cents',
  'stock_quantity',
  'low_stock_threshold',
  'image_url',
  'status',
  'data_confidence',
  'condition',
  'condition_notes',
  'socket',
  'supported_sockets',
  'chipset',
  'memory_slots',
  'max_memory_gb',
  'm2_slots',
  'sata_ports',
  'form_factor',
  'supported_form_factors',
  'memory_type',
  'memory_capacity_gb',
  'memory_modules',
  'memory_speed_mts',
  'tdp_watts',
  'recommended_psu_watts',
  'psu_wattage',
  'psu_efficiency',
  'psu_form_factor',
  'gpu_length_mm',
  'max_gpu_length_mm',
  'cooler_height_mm',
  'max_cooler_height_mm',
  'radiator_support_mm',
  'radiator_size_mm',
  'cooler_type',
  'cooling_capacity_watts',
  'storage_interface',
  'storage_capacity_gb',
  'pcie_version',
  'specs',
] as const;

function rowValues(c: ComponentRecord): string {
  const values: string[] = [
    sqlString(c.id),
    sqlString(c.sku),
    sqlString(c.slug),
    sqlString(c.category),
    sqlString(c.brand),
    sqlString(c.model),
    sqlString(c.description),
    sqlNumber(c.price_cents),
    sqlNumber(c.cost_cents),
    sqlNumber(c.stock_quantity),
    sqlNumber(c.low_stock_threshold),
    sqlString(c.image_url),
    // `active` is derived from this by a trigger in migration 0006, so it is
    // not seeded directly. Seeding both would let them disagree.
    sqlString(c.active ? 'published' : 'archived'),
    sqlString(c.data_confidence),
    sqlString(c.condition),
    sqlString(c.condition_notes),
    sqlString(c.socket),
    sqlTextArray(c.supported_sockets),
    sqlString(c.chipset),
    sqlNumber(c.memory_slots),
    sqlNumber(c.max_memory_gb),
    sqlNumber(c.m2_slots),
    sqlNumber(c.sata_ports),
    sqlString(c.form_factor),
    sqlEnumArray(c.supported_form_factors, 'form_factor'),
    sqlString(c.memory_type),
    sqlNumber(c.memory_capacity_gb),
    sqlNumber(c.memory_modules),
    sqlNumber(c.memory_speed_mts),
    sqlNumber(c.tdp_watts),
    sqlNumber(c.recommended_psu_watts),
    sqlNumber(c.psu_wattage),
    sqlString(c.psu_efficiency),
    sqlString(c.psu_form_factor),
    sqlNumber(c.gpu_length_mm),
    sqlNumber(c.max_gpu_length_mm),
    sqlNumber(c.cooler_height_mm),
    sqlNumber(c.max_cooler_height_mm),
    sqlIntArray(c.radiator_support_mm),
    sqlIntArray(c.radiator_size_mm),
    sqlString(c.cooler_type),
    sqlNumber(c.cooling_capacity_watts),
    sqlString(c.storage_interface),
    sqlNumber(c.storage_capacity_gb),
    sqlNumber(c.pcie_version),
    sqlJson(c.specs),
  ];
  return `  (${values.join(', ')})`;
}

const header = `-- ===========================================================================
-- PC Builders Canada - development seed data
-- ===========================================================================
-- GENERATED FILE - do not edit by hand.
-- Source: src/lib/catalog/sample-catalog.ts
-- Regenerate with: npm run db:seed:generate
--
-- Each row carries its OWN data_confidence, copied from the source catalogue.
--
--   'verified' - price and compatibility-critical fields were read from a
--                retailer or manufacturer listing. The date is in
--                specs.price_checked.
--   'sample'   - at least one figure is unconfirmed. specs.unverified names
--                which one, and the storefront prints that caveat.
--
-- Prices are retail as observed on the check date, not a margin model.
-- cost_cents is null throughout because there is no distributor pricing yet,
-- and inventing one would produce a fake margin column in the admin.
--
-- Stock quantities are nominal opening figures so the storefront is usable.
-- They are NOT real counts. Set them from /admin/inventory against what is
-- actually on the shelf before trading.
--
-- Every row seeds as condition = 'new'. Refurbished and open-box units are
-- entered through /admin/components, where the condition notes are required,
-- because those notes describe one specific physical unit.
-- ===========================================================================

insert into components (
${COLUMNS.map((c) => `  ${c}`).join(',\n')}
) values
`;

const body = SAMPLE_COMPONENTS.map(rowValues).join(',\n');

const footer = `
on conflict (id) do update set
${COLUMNS.filter((c) => c !== 'id')
  .map((c) => `  ${c} = excluded.${c}`)
  .join(',\n')},
  updated_at = now();
`;

/**
 * Category display metadata.
 *
 * One row per enum value. The labels come from CATEGORY_LABELS so the seeded
 * database opens showing exactly what the code showed before it existed.
 */
const categoriesSql = `

-- ---------------------------------------------------------------------------
-- component_categories - display metadata, one row per category
-- ---------------------------------------------------------------------------
insert into component_categories (category, label, sort_order) values
${COMPONENT_CATEGORIES.map(
  (category, index) =>
    `  (${sqlString(category)}, ${sqlString(CATEGORY_LABELS[category])}, ${(index + 1) * 10})`,
).join(',' + '\n')}
on conflict (category) do update set
  label = excluded.label,
  updated_at = now();
`;

/**
 * Services.
 *
 * Seeded as `published`, because these eight were already live on the public
 * page before the table existed. Seeding them as drafts would blank the
 * services page the moment the migration ran.
 */
const servicesSql = `

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
insert into services (
  id, slug, name, short_description, includes, note, price_text,
  faqs, featured, status, sort_order
) values
${SERVICE_CONTENT.map(
  (service) =>
    `  (${sqlString(service.id)}, ${sqlString(service.slug)}, ${sqlString(service.name)}, ` +
    `${sqlString(service.short_description)}, ${sqlTextArray(service.includes)}, ` +
    `${sqlString(service.note ?? null)}, ${sqlString(service.price_text ?? null)}, ` +
    `${sqlString(JSON.stringify(service.faqs ?? []))}::jsonb, ` +
    `${String(Boolean(service.featured))}, 'published', ${service.sort_order})`,
).join(',' + '\n')}
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  short_description = excluded.short_description,
  includes = excluded.includes,
  note = excluded.note,
  price_text = excluded.price_text,
  faqs = excluded.faqs,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  updated_at = now();
`;

/**
 * Build presets.
 *
 * `status` is NOT overwritten on conflict. Re-running the seed should not
 * republish a preset an admin has deliberately taken down.
 */
const presetsSql = `

-- ---------------------------------------------------------------------------
-- build_presets
-- ---------------------------------------------------------------------------
insert into build_presets (
  id, slug, name, audience, tagline, rationale, highlights, items,
  status, sort_order
) values
${BUILD_PRESETS.map(
  (preset, index) =>
    `  (${sqlString(preset.slug)}, ${sqlString(preset.slug)}, ${sqlString(preset.name)}, ` +
    `${sqlString(preset.audience)}, ${sqlString(preset.tagline)}, ${sqlString(preset.rationale)}, ` +
    `${sqlTextArray(preset.highlights)}, ${sqlString(JSON.stringify(preset.items))}::jsonb, ` +
    `'published', ${(index + 1) * 10})`,
).join(',' + '\n')}
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  audience = excluded.audience,
  tagline = excluded.tagline,
  rationale = excluded.rationale,
  highlights = excluded.highlights,
  items = excluded.items,
  sort_order = excluded.sort_order,
  updated_at = now();
`;

const outPath = resolve(process.cwd(), 'supabase/seed/seed.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header + body + footer + categoriesSql + servicesSql + presetsSql, 'utf8');

console.log(
  `Wrote ${SAMPLE_COMPONENTS.length} components, ${COMPONENT_CATEGORIES.length} categories, ` +
    `${SERVICE_CONTENT.length} services and ${BUILD_PRESETS.length} presets to supabase/seed/seed.sql`,
);

// ---------------------------------------------------------------------------
// Optional: an ADDITIVE-ONLY file for a batch of new rows
// ---------------------------------------------------------------------------
// Why this exists, and why it is a separate file rather than a flag on the
// seed:
//
// seed.sql ends in `on conflict (id) do update set ...` across nearly every
// column, image_url among them. Every row in the source catalogue carries
// `image_url: null`, because there is no product photography in the reference
// data. So re-running seed.sql against a live database does not just reset
// prices and stock to their nominal seed values — it NULLS the product photos
// an operator uploaded through the admin, for every row the seed knows about.
//
// That makes seed.sql safe for a fresh database and unsafe for this one. It is
// not a bug in the seed; "reset to a known state" is exactly what a seed is
// for. It is simply the wrong tool for adding rows to a database somebody has
// since done real work in.
//
// So adding parts to a live catalogue uses this instead: the same generated
// column list and the same value serialisation, restricted to the ids asked
// for, ending in `do nothing`. An id that already exists is left exactly as it
// is — photo, price, stock and all.
//
//   SEED_ONLY_IDS=gpu-a,gpu-b npm run db:seed:generate
//
// writes supabase/seed/additions.sql and leaves seed.sql untouched in content.
// SEED_ONLY_SINCE is the one to reach for in practice. Rows carry a created_at
// per batch, so a date selects a batch without anybody maintaining a list of
// twenty ids by hand -- which is a list that goes wrong silently, by omitting
// one row, and the omission looks exactly like a row that imported fine.
const onlySince = process.env.SEED_ONLY_SINCE?.trim();
const onlyIds = process.env.SEED_ONLY_IDS?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (onlySince && onlyIds?.length) {
  throw new Error('Pass SEED_ONLY_SINCE or SEED_ONLY_IDS, not both. Nothing was written.');
}

if (onlySince && !/^\d{4}-\d{2}-\d{2}$/.test(onlySince)) {
  throw new Error(`SEED_ONLY_SINCE must be YYYY-MM-DD, got "${onlySince}".`);
}

if (onlySince || onlyIds?.length) {
  const rows = onlySince
    ? SAMPLE_COMPONENTS.filter((c) => c.created_at.slice(0, 10) >= onlySince)
    : SAMPLE_COMPONENTS.filter((c) => new Set(onlyIds).has(c.id));

  if (onlyIds?.length) {
    const missing = onlyIds.filter((id) => !rows.some((r) => r.id === id));
    if (missing.length) {
      throw new Error(
        `SEED_ONLY_IDS named ${missing.length} id(s) that are not in the source ` +
          `catalogue: ${missing.join(', ')}. Nothing was written.`,
      );
    }
  }

  if (rows.length === 0) {
    throw new Error('Nothing matched, so no additions file was written.');
  }

  const additionsHeader = `-- ===========================================================================
-- PC Builders Canada - catalogue additions
-- ===========================================================================
-- GENERATED FILE - do not edit by hand.
-- Source: src/lib/catalog/sample-catalog.ts
-- Regenerate with: SEED_ONLY_SINCE=<YYYY-MM-DD> npm run db:seed:generate
--
-- ADDITIVE ONLY. This ends in \`on conflict (id) do nothing\`, so running it
-- against a database that already holds one of these ids changes NOTHING about
-- that row: its price, stock, status and uploaded product photo are left as
-- they are.
--
-- Use this rather than seed.sql to add parts to a catalogue that is already in
-- service. seed.sql overwrites image_url with null for every row it knows
-- about, which erases uploaded photography.
--
-- Rows: ${rows.length}
-- ===========================================================================

insert into components (
${COLUMNS.map((c) => `  ${c}`).join(',\n')}
) values
`;

  const additionsPath = resolve(process.cwd(), 'supabase/seed/additions.sql');
  writeFileSync(
    additionsPath,
    additionsHeader + rows.map(rowValues).join(',\n') + '\non conflict (id) do nothing;\n',
    'utf8',
  );
  console.log(`Wrote ${rows.length} additive component rows to supabase/seed/additions.sql`);
}
