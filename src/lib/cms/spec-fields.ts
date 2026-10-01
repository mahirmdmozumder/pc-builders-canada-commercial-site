import type { ComponentCategory } from '@/lib/catalog/types';

/**
 * Which fields an admin is shown for each category.
 *
 * ---------------------------------------------------------------------------
 * THE DISTINCTION THAT MATTERS
 * ---------------------------------------------------------------------------
 * A component has two kinds of specification, and putting one in the other's
 * place breaks something real.
 *
 *   TYPED COLUMNS are what the compatibility engine compares. Socket, form
 *   factor, card length, cooler height, wattage, memory generation. They are
 *   real Postgres columns with real types because a rule cannot compare
 *   "155 mm" as free text against "165 mm".
 *
 *   SPEC ENTRIES are display only, stored in the `specs` jsonb column. Boost
 *   clocks, cache sizes, warranty length, port counts. The storefront prints
 *   them; no rule reads them.
 *
 * If a compatibility figure is typed into the free-form section instead of its
 * column, the engine does not see it — and the check quietly returns "unknown"
 * rather than failing loudly. So the editor renders the typed columns for a
 * category FIRST, labelled as the ones that drive compatibility, and keeps the
 * free-form section for everything else.
 *
 * The suggested keys below exist so the common specifications are one click
 * rather than remembered, but the free-form section accepts any key. That is
 * the flexibility requirement: a new specification never needs a migration.
 */

export type TypedFieldKind = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'numberlist';

export interface TypedField {
  /** Column name on `components`. */
  column: string;
  label: string;
  kind: TypedFieldKind;
  /** Shown under the input. Says what a rule does with the value. */
  hint?: string;
  options?: readonly string[];
  unit?: string;
}

const FORM_FACTORS = ['e-atx', 'atx', 'micro-atx', 'mini-itx'] as const;
const MEMORY_TYPES = ['ddr4', 'ddr5'] as const;
const COOLER_TYPES = ['air', 'aio'] as const;
const STORAGE_INTERFACES = ['nvme-m2', 'sata'] as const;
const PSU_FORM_FACTORS = ['atx', 'sfx', 'sfx-l'] as const;

const SOCKET: TypedField = {
  column: 'socket',
  label: 'Socket',
  kind: 'text',
  hint: 'Compared against the motherboard and the cooler. e.g. AM5, LGA1851.',
};

const TDP: TypedField = {
  column: 'tdp_watts',
  label: 'TDP',
  kind: 'number',
  unit: 'W',
  hint: 'Feeds the estimated system draw and the power supply recommendation.',
};

/**
 * Typed columns per category.
 *
 * A category absent from this map has no compatibility fields at all, which is
 * true of everything sold as a finished unit. That is not an omission — see
 * the note in migration 0005 about why those categories stay out of the
 * configurator.
 */
export const TYPED_FIELDS: Partial<Record<ComponentCategory, TypedField[]>> = {
  cpu: [
    SOCKET,
    {
      column: 'memory_type',
      label: 'Memory generation',
      kind: 'select',
      options: MEMORY_TYPES,
      hint: 'Checked against the memory kit and the motherboard.',
    },
    TDP,
    { column: 'pcie_version', label: 'PCIe version', kind: 'number' },
  ],

  motherboard: [
    SOCKET,
    { column: 'chipset', label: 'Chipset', kind: 'text' },
    {
      column: 'form_factor',
      label: 'Form factor',
      kind: 'select',
      options: FORM_FACTORS,
      hint: 'Checked against what the case accepts.',
    },
    {
      column: 'memory_type',
      label: 'Memory generation',
      kind: 'select',
      options: MEMORY_TYPES,
    },
    {
      column: 'memory_slots',
      label: 'Memory slots',
      kind: 'number',
      hint: 'A kit with more sticks than there are slots fails the check.',
    },
    { column: 'max_memory_gb', label: 'Maximum memory', kind: 'number', unit: 'GB' },
    {
      column: 'm2_slots',
      label: 'M.2 slots',
      kind: 'number',
      hint: 'Counted against the NVMe drives in the build.',
    },
    { column: 'sata_ports', label: 'SATA ports', kind: 'number' },
    { column: 'pcie_version', label: 'PCIe version', kind: 'number' },
  ],

  cooler: [
    {
      column: 'supported_sockets',
      label: 'Supported sockets',
      kind: 'multiselect',
      hint: 'Every socket it ships brackets for. The processor socket must appear here.',
    },
    { column: 'cooler_type', label: 'Type', kind: 'select', options: COOLER_TYPES },
    {
      column: 'cooler_height_mm',
      label: 'Height',
      kind: 'number',
      unit: 'mm',
      hint: 'Air coolers only. Checked against the case clearance.',
    },
    {
      column: 'radiator_size_mm',
      label: 'Radiator sizes',
      kind: 'numberlist',
      unit: 'mm',
      hint: 'Liquid coolers only. The case must support one of these.',
    },
    {
      column: 'cooling_capacity_watts',
      label: 'Cooling capacity',
      kind: 'number',
      unit: 'W',
      hint: 'Heat it can dissipate. NOT the power its own fans draw — that is TDP below.',
    },
    { ...TDP, hint: 'What the fans and pump themselves draw, not what they can cool.' },
  ],

  ram: [
    { column: 'memory_type', label: 'Type', kind: 'select', options: MEMORY_TYPES },
    { column: 'memory_capacity_gb', label: 'Total capacity', kind: 'number', unit: 'GB' },
    {
      column: 'memory_modules',
      label: 'Sticks in the kit',
      kind: 'number',
      hint: 'Checked against the motherboard slot count.',
    },
    { column: 'memory_speed_mts', label: 'Speed', kind: 'number', unit: 'MT/s' },
    TDP,
  ],

  gpu: [
    {
      column: 'gpu_length_mm',
      label: 'Length',
      kind: 'number',
      unit: 'mm',
      hint: 'Checked against the maximum card length the case allows.',
    },
    TDP,
    {
      column: 'recommended_psu_watts',
      label: 'Recommended PSU',
      kind: 'number',
      unit: 'W',
      hint: 'The vendor figure for the whole system, used as a floor for the supply check.',
    },
    { column: 'pcie_version', label: 'PCIe version', kind: 'number' },
  ],

  storage: [
    {
      column: 'storage_interface',
      label: 'Interface',
      kind: 'select',
      options: STORAGE_INTERFACES,
      hint: 'Counted against the motherboard M.2 slots or SATA ports.',
    },
    { column: 'storage_capacity_gb', label: 'Capacity', kind: 'number', unit: 'GB' },
    TDP,
  ],

  psu: [
    {
      column: 'psu_wattage',
      label: 'Wattage',
      kind: 'number',
      unit: 'W',
      hint: 'Compared against the estimated draw plus headroom.',
    },
    { column: 'psu_efficiency', label: 'Efficiency rating', kind: 'text' },
    { column: 'psu_form_factor', label: 'Form factor', kind: 'select', options: PSU_FORM_FACTORS },
  ],

  case: [
    {
      column: 'supported_form_factors',
      label: 'Motherboard sizes accepted',
      kind: 'multiselect',
      options: FORM_FACTORS,
    },
    {
      column: 'max_gpu_length_mm',
      label: 'Maximum card length',
      kind: 'number',
      unit: 'mm',
      hint: 'The graphics card must be shorter than this.',
    },
    {
      column: 'max_cooler_height_mm',
      label: 'Maximum cooler height',
      kind: 'number',
      unit: 'mm',
    },
    {
      column: 'radiator_support_mm',
      label: 'Radiator sizes supported',
      kind: 'numberlist',
      unit: 'mm',
    },
  ],
};

/**
 * Suggested free-form specification keys per category.
 *
 * Convenience only. The editor accepts any key; these are the ones worth
 * having one click away. Nothing here is read by a compatibility rule.
 */
export const SUGGESTED_SPECS: Partial<Record<ComponentCategory, string[]>> = {
  cpu: ['cores', 'threads', 'base_clock', 'boost_clock', 'cache', 'integrated_graphics', 'cooler_included'],
  gpu: ['vram_gb', 'memory_type', 'boost_clock', 'power_connectors', 'slot_width', 'outputs'],
  motherboard: ['pcie_slots', 'wifi', 'rear_usb', 'audio_codec', 'lan'],
  ram: ['cas_latency', 'voltage', 'profile', 'heatspreader'],
  storage: ['read_speed', 'write_speed', 'nand_type', 'endurance_tbw', 'form_factor', 'dram_cache'],
  psu: ['modular', 'fan_size', 'warranty', 'connectors'],
  case: ['included_fans', 'drive_bays', 'front_io', 'side_panel', 'dimensions_mm'],
  cooler: ['fan_size', 'fan_count', 'noise_level', 'warranty'],
  networking: ['ports', 'poe_ports', 'poe_budget_watts', 'management', 'vlan', 'uplink'],
  nas: ['bays', 'memory', 'network', 'usb', 'drive_support', 'max_raw_capacity'],
  'mini-pc': ['soc', 'cpu', 'memory', 'network', 'usb', 'display', 'expansion', 'power_input'],
  monitor: ['panel_size', 'resolution', 'refresh_rate', 'panel_type', 'response_time', 'inputs'],
  'case-fan': ['size_mm', 'rpm_range', 'airflow_cfm', 'static_pressure', 'connector', 'noise_level'],
  os: ['edition', 'delivery'],
  /**
   * A resold machine has no typed compatibility columns -- it is a finished
   * unit -- so its whole specification sheet comes from here. These are the rows
   * a buyer actually compares between two pre-built PCs, in the order they
   * compare them.
   */
  prebuilt: [
    'cpu',
    'gpu',
    'memory',
    'storage',
    'os',
    'psu',
    'case',
    'cooling',
    'network',
    'ports',
    'warranty',
    'supplier',
  ],
};

/**
 * Keys the storefront treats specially and an admin should not retype.
 *
 * `unverified` names the figure on a row that has not been confirmed, and the
 * product card prints it as a caveat. `price_checked` records when the price
 * was last looked up. Both are edited through their own controls so their
 * meaning stays intact.
 */
export const RESERVED_SPEC_KEYS = ['unverified', 'price_checked', 'source'] as const;

/** Turns a spec key into something readable, matching the storefront. */
export function humanizeSpecKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    // `gpu`, `psu`, `ram`, `ssd`, `hdd` and `nvme` joined this list when
    // pre-built listings started using them as spec keys. "Gpu: RTX 4060" on a
    // spec sheet reads as a typo, and `cpu` was already handled — the omission
    // of its counterpart was an oversight rather than a decision.
    //
    // Deliberately NOT ghz/mhz: those are GHz and MHz, so blanket uppercasing
    // would make them wrong rather than right.
    .replace(
      /\b(gb|tb|mm|cfm|rpm|tbw|poe|vlan|nand|soc|cpu|gpu|psu|ram|ssd|hdd|nvme|usb|lan)\b/gi,
      (m) => m.toUpperCase(),
    )
    .replace(/^./, (c) => c.toUpperCase());
}
