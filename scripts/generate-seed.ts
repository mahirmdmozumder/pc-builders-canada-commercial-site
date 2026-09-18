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
  'active',
  'data_confidence',
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
    String(c.active),
    sqlString(c.data_confidence),
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
-- Every row is inserted with data_confidence = 'sample'. These part
-- specifications have NOT been verified against manufacturer documentation
-- and the prices are placeholders. Verify a row, then set its
-- data_confidence to 'verified'.
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

const outPath = resolve(process.cwd(), 'supabase/seed/seed.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header + body + footer, 'utf8');

console.log(`Wrote ${SAMPLE_COMPONENTS.length} components to supabase/seed/seed.sql`);
