import { SAMPLE_COMPONENTS_BY_ID } from '@/lib/catalog/sample-catalog';
import { stripCost, type ComponentRecord, type ResolvedBuild } from '@/lib/catalog/types';

/**
 * Build a ResolvedBuild from catalogue ids, for tests.
 * Throws on an unknown id so a renamed part fails the test suite loudly
 * instead of silently dropping out of the build under test.
 */
export function buildFromIds(ids: string[], quantities: Record<string, number> = {}): ResolvedBuild {
  return ids.map((id) => {
    const record = SAMPLE_COMPONENTS_BY_ID.get(id);
    if (!record) throw new Error(`Unknown catalogue component id: ${id}`);
    return {
      category: record.category,
      component: stripCost(record),
      quantity: quantities[id] ?? 1,
    };
  });
}

/**
 * A synthetic component, for rules that need a configuration the live
 * catalogue does not happen to contain.
 *
 * Tests that assert a rule works should not depend on the shop stocking a
 * particular part: a discontinued line would then fail the suite for a reason
 * that has nothing to do with the rule under test.
 */
export function fakeComponent(overrides: Partial<ComponentRecord> & Pick<ComponentRecord, 'id' | 'category'>) {
  const base = SAMPLE_COMPONENTS_BY_ID.get('cpu-amd-ryzen-7-9800x3d')!;
  return stripCost({
    ...base,
    sku: `TEST-${overrides.id}`,
    slug: overrides.id,
    brand: 'Test',
    model: overrides.id,
    description: 'Synthetic component used by the test suite.',
    price_cents: 10000,
    // Clear every compatibility field, then apply only what the test sets.
    socket: null,
    supported_sockets: null,
    chipset: null,
    memory_slots: null,
    max_memory_gb: null,
    m2_slots: null,
    sata_ports: null,
    form_factor: null,
    supported_form_factors: null,
    memory_type: null,
    memory_capacity_gb: null,
    memory_modules: null,
    memory_speed_mts: null,
    tdp_watts: null,
    recommended_psu_watts: null,
    psu_wattage: null,
    psu_efficiency: null,
    psu_form_factor: null,
    gpu_length_mm: null,
    max_gpu_length_mm: null,
    cooler_height_mm: null,
    max_cooler_height_mm: null,
    radiator_support_mm: null,
    radiator_size_mm: null,
    cooler_type: null,
    cooling_capacity_watts: null,
    storage_interface: null,
    storage_capacity_gb: null,
    pcie_version: null,
    ...overrides,
  });
}

/** A complete, known-good AM5 gaming build used as the baseline in tests. */
export const COMPATIBLE_AM5_BUILD = [
  'cpu-amd-ryzen-7-9800x3d',
  'mb-asus-rog-strix-b850-f',
  'cool-arctic-liquid-freezer-iii-360',
  'ram-teamgroup-vulcan-32gb-ddr5-6000',
  'gpu-gigabyte-rtx-5080-gaming-oc',
  'ssd-wd-black-sn850x-2tb',
  'psu-deepcool-pn1000m',
  'case-corsair-frame-4000d-rs',
];
