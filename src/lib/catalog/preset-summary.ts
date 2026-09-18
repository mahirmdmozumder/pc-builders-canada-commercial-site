import { resolveBuild } from '@/lib/catalog/repository';
import { checkCompatibility } from '@/lib/compatibility/engine';
import { priceBuild } from '@/lib/pricing/pricing';
import { displayName, type ComponentCategory } from '@/lib/catalog/types';
import type { BuildPreset } from '@/lib/catalog/presets';
import type { PresetSummary } from '@/components/build/preset-card';

const KEY_CATEGORIES: ComponentCategory[] = ['cpu', 'gpu', 'ram', 'storage'];

/**
 * Resolve a preset against the live catalogue and run it through the same
 * engines the configurator uses. Preset prices are therefore never stale and
 * never separately maintained.
 */
export async function summarisePreset(preset: BuildPreset): Promise<PresetSummary> {
  const { build } = await resolveBuild(preset.items);
  const report = checkCompatibility(build);
  const price = priceBuild(build);

  const keyParts = KEY_CATEGORIES.flatMap((category) => {
    const item = build.find((b) => b.category === category);
    return item ? [{ category, name: displayName(item.component) }] : [];
  });

  return {
    preset,
    subtotalCents: price.subtotalCents,
    estimatedTotalCents: price.totalCents,
    estimatedWatts: report.power.estimatedWatts,
    recommendedPsuWatts: report.power.recommendedPsuWatts,
    compatible: report.failures.length === 0,
    keyParts,
    unavailable: build.some((item) => item.component.stock_quantity < item.quantity),
  };
}

export async function summarisePresets(presets: BuildPreset[]): Promise<PresetSummary[]> {
  return Promise.all(presets.map(summarisePreset));
}
