import { SAMPLE_COMPONENTS_BY_ID } from '@/lib/catalog/sample-catalog';
import { stripCost, type ResolvedBuild } from '@/lib/catalog/types';

/**
 * Build a ResolvedBuild from sample catalogue ids, for tests.
 * Throws on an unknown id so a renamed part fails the test suite loudly
 * instead of silently dropping out of the build under test.
 */
export function buildFromIds(ids: string[], quantities: Record<string, number> = {}): ResolvedBuild {
  return ids.map((id) => {
    const record = SAMPLE_COMPONENTS_BY_ID.get(id);
    if (!record) throw new Error(`Unknown sample component id: ${id}`);
    return {
      category: record.category,
      component: stripCost(record),
      quantity: quantities[id] ?? 1,
    };
  });
}

/** A known-good AM5 gaming build used as the baseline in several tests. */
export const COMPATIBLE_AM5_BUILD = [
  'cpu-amd-ryzen-7-9800x3d',
  'mb-asus-rog-strix-b850-f',
  'cool-arctic-liquid-freezer-iii-360',
  'ram-corsair-vengeance-32gb-ddr5-6000',
  'gpu-msi-ventus-rtx-5080',
  'ssd-samsung-990-pro-2tb',
  'psu-corsair-rm1000x',
  'case-corsair-4000d-airflow',
];
