import { TYPED_FIELDS, RESERVED_SPEC_KEYS, humanizeSpecKey } from '@/lib/cms/spec-fields';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type PublicComponent,
} from '@/lib/catalog/types';

/**
 * The full specification sheet for a product page.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS DERIVED AND NOT AUTHORED
 * ---------------------------------------------------------------------------
 * A product's specifications live in two places for a reason set out at length
 * in lib/cms/spec-fields.ts: compatibility-relevant attributes are typed
 * columns because the engine compares them, and everything else is free-form
 * `specs` jsonb so a new specification never needs a migration.
 *
 * A spec table hand-written per category would be a third place, would drift
 * from both, and would have to be edited every time a category gained a field.
 * So this reads whatever the row actually holds and renders that. A product with
 * four specifications gets four rows; a product with twenty gets twenty. Nothing
 * is filled in, guessed at, or carried over from a similar product.
 *
 * The one thing it will not do is print a row for a field that is null. An empty
 * "Socket: —" tells a reader the socket is unknown while looking like a spec
 * sheet that has been checked, and that is the failure this whole module exists
 * to avoid.
 */

export interface SpecRow {
  label: string;
  value: string;
  /**
   * True for values the compatibility engine reads. Marked in the UI, because a
   * shopper cross-checking a socket against their motherboard is looking at a
   * figure the site itself relies on, not marketing copy.
   */
  checked?: boolean;
}

export interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

/** Units for the typed columns, keyed by column name. */
const UNITS: Record<string, string> = {
  tdp_watts: 'W',
  recommended_psu_watts: 'W',
  psu_wattage: 'W',
  cooling_capacity_watts: 'W',
  gpu_length_mm: 'mm',
  max_gpu_length_mm: 'mm',
  cooler_height_mm: 'mm',
  max_cooler_height_mm: 'mm',
  max_memory_gb: 'GB',
  memory_capacity_gb: 'GB',
  memory_speed_mts: 'MT/s',
};

/** Labels for the typed columns that TYPED_FIELDS does not cover for a category. */
const COLUMN_LABELS: Record<string, string> = {
  socket: 'Socket',
  supported_sockets: 'Supported sockets',
  chipset: 'Chipset',
  memory_slots: 'Memory slots',
  max_memory_gb: 'Maximum memory',
  m2_slots: 'M.2 slots',
  sata_ports: 'SATA ports',
  form_factor: 'Form factor',
  supported_form_factors: 'Supports',
  memory_type: 'Memory type',
  memory_capacity_gb: 'Capacity',
  memory_modules: 'Modules in kit',
  memory_speed_mts: 'Speed',
  tdp_watts: 'TDP',
  recommended_psu_watts: 'Recommended PSU',
  psu_wattage: 'Wattage',
  psu_efficiency: 'Efficiency rating',
  psu_form_factor: 'PSU form factor',
  gpu_length_mm: 'Card length',
  max_gpu_length_mm: 'Maximum card length',
  cooler_height_mm: 'Cooler height',
  max_cooler_height_mm: 'Maximum cooler height',
  radiator_support_mm: 'Radiator support',
  radiator_size_mm: 'Radiator size',
  cooler_type: 'Cooling type',
  cooling_capacity_watts: 'Cooling capacity',
  storage_interface: 'Interface',
  storage_capacity_gb: 'Capacity',
  pcie_version: 'PCIe version',
};

/** Values that arrive as enum-ish lowercase strings and read badly as-is. */
const VALUE_LABELS: Record<string, string> = {
  'e-atx': 'E-ATX',
  atx: 'ATX',
  'micro-atx': 'Micro-ATX',
  'mini-itx': 'Mini-ITX',
  ddr4: 'DDR4',
  ddr5: 'DDR5',
  air: 'Air',
  aio: 'Liquid (AIO)',
  'nvme-m2': 'NVMe M.2',
  sata: 'SATA',
  sfx: 'SFX',
  'sfx-l': 'SFX-L',
};

function label(value: string): string {
  return VALUE_LABELS[value] ?? value;
}

/**
 * Capacity in the unit a person would use.
 *
 * 2000 GB is a 2 TB drive everywhere except in a database column, and printing
 * the raw figure makes a spec sheet read as though it were generated rather than
 * checked.
 */
function capacity(gb: number): string {
  if (gb >= 1000 && gb % 1000 === 0) return `${gb / 1000} TB`;
  return `${gb} GB`;
}

function formatColumn(column: string, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const unit = UNITS[column];
    const parts = raw.map((entry) => label(String(entry)));
    return unit ? `${parts.join(' / ')} ${unit}` : parts.join(', ');
  }

  if (column === 'storage_capacity_gb' || column === 'memory_capacity_gb') {
    return typeof raw === 'number' ? capacity(raw) : String(raw);
  }

  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';

  const unit = UNITS[column];
  const text = label(String(raw));
  return unit ? `${text} ${unit}` : text;
}

/**
 * Builds the sheet.
 *
 * Three groups, in the order a buyer reads them:
 *
 *   "Product"        — identity. Brand, model, SKU, category, condition.
 *   "Key specifications" — the typed columns, i.e. the figures the
 *                      compatibility engine itself compares.
 *   "Specifications" — everything else the row carries.
 *
 * A group with no rows is not returned, so a Raspberry Pi (which has no typed
 * compatibility columns at all, by design) shows two groups rather than an empty
 * heading.
 */
export function buildSpecSheet(component: PublicComponent): SpecGroup[] {
  const groups: SpecGroup[] = [];

  // --- identity ----------------------------------------------------------
  const identity: SpecRow[] = [
    { label: 'Brand', value: component.brand },
    { label: 'Model', value: component.model },
    { label: 'Category', value: CATEGORY_LABELS[component.category] ?? component.category },
    { label: 'Condition', value: CONDITION_LABELS[component.condition] },
    { label: 'SKU', value: component.sku },
  ].filter((row) => Boolean(row.value));

  if (identity.length > 0) groups.push({ title: 'Product', rows: identity });

  // --- typed compatibility columns ---------------------------------------
  const record = component as unknown as Record<string, unknown>;
  const seen = new Set<string>();
  const checkedRows: SpecRow[] = [];

  // Category order first, so a motherboard leads with its socket rather than
  // with whatever the alphabet decided.
  for (const field of TYPED_FIELDS[component.category] ?? []) {
    if (seen.has(field.column)) continue;
    seen.add(field.column);
    const value = formatColumn(field.column, record[field.column]);
    if (value !== null) {
      checkedRows.push({ label: field.label, value, checked: true });
    }
  }

  // Then any other typed column that happens to be populated. A case that
  // recorded a radiator list but is not a category with radiator fields in
  // TYPED_FIELDS would otherwise have that figure silently omitted from the
  // sheet while the engine was busy comparing it.
  for (const column of Object.keys(COLUMN_LABELS)) {
    if (seen.has(column)) continue;
    const value = formatColumn(column, record[column]);
    if (value !== null) {
      checkedRows.push({ label: COLUMN_LABELS[column], value, checked: true });
    }
  }

  if (checkedRows.length > 0) {
    groups.push({ title: 'Key specifications', rows: checkedRows });
  }

  // --- free-form specs ---------------------------------------------------
  const reserved = new Set<string>(RESERVED_SPEC_KEYS);
  const extra: SpecRow[] = Object.entries(component.specs ?? {})
    // `unverified`, `price_checked` and `source` have their own presentation:
    // the first is a caveat printed next to the price, not a spec row.
    .filter(([key, value]) => !reserved.has(key) && value !== null && value !== '')
    .map(([key, value]) => ({
      label: humanizeSpecKey(key),
      value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (extra.length > 0) {
    groups.push({ title: 'Specifications', rows: extra });
  }

  return groups;
}

/** Total rows, so a page can decide whether a sheet is worth a section. */
export function specRowCount(groups: SpecGroup[]): number {
  return groups.reduce((sum, group) => sum + group.rows.length, 0);
}
