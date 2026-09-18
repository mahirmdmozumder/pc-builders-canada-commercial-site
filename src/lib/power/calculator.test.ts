import { describe, expect, it } from 'vitest';
import {
  estimatePower,
  PSU_HEADROOM_MULTIPLIER,
  SYSTEM_OVERHEAD_WATTS,
} from '@/lib/power/calculator';
import { buildFromIds, COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';

describe('power estimation', () => {
  it('returns zero for an empty build', () => {
    const estimate = estimatePower([]);
    expect(estimate.estimatedWatts).toBe(0);
    expect(estimate.status).toBe('no-psu');
    expect(estimate.overheadWatts).toBe(0);
  });

  it('sums component power and adds the fixed system overhead', () => {
    // 9800X3D 120 W + RTX 5080 360 W + board 50 + ram 10 + ssd 8 + AIO 12
    const estimate = estimatePower(buildFromIds(COMPATIBLE_AM5_BUILD));
    const componentSum = estimate.lineItems.reduce((sum, l) => sum + l.watts, 0);
    expect(componentSum).toBe(120 + 360 + 50 + 10 + 8 + 12);
    expect(estimate.estimatedWatts).toBe(componentSum + SYSTEM_OVERHEAD_WATTS);
  });

  it('excludes the PSU, case and OS from the draw', () => {
    const estimate = estimatePower(buildFromIds(COMPATIBLE_AM5_BUILD));
    const categories = estimate.lineItems.map((l) => l.category);
    expect(categories).not.toContain('psu');
    expect(categories).not.toContain('case');
    expect(categories).not.toContain('os');
  });

  it('multiplies by quantity', () => {
    const single = estimatePower(buildFromIds(['ssd-samsung-990-pro-2tb']));
    const triple = estimatePower(buildFromIds(['ssd-samsung-990-pro-2tb'], { 'ssd-samsung-990-pro-2tb': 3 }));
    expect(triple.lineItems[0].watts).toBe(single.lineItems[0].watts * 3);
  });

  it('marks a line as estimated when the part has no recorded power figure', () => {
    // The sleeved cable kit has no tdp_watts and no category default > 0,
    // so it contributes nothing; the OS licence likewise.
    const estimate = estimatePower(buildFromIds(['acc-sleeved-cable-kit', 'os-windows-11-pro']));
    expect(estimate.estimatedWatts).toBe(0);
  });

  it('recommends a real retail PSU size above the headroom target', () => {
    const estimate = estimatePower(buildFromIds(COMPATIBLE_AM5_BUILD));
    const target = estimate.estimatedWatts * PSU_HEADROOM_MULTIPLIER;
    expect(estimate.recommendedPsuWatts).toBeGreaterThanOrEqual(target);
    expect([450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200, 1300, 1500, 1600]).toContain(
      estimate.recommendedPsuWatts,
    );
  });

  it('respects a vendor-stated minimum PSU that exceeds the calculated headroom', () => {
    // A 5060 Ti draws little but the vendor asks for 600 W.
    const estimate = estimatePower(
      buildFromIds(['cpu-amd-ryzen-5-7600x', 'gpu-asus-prime-rtx-5060-ti']),
    );
    expect(estimate.recommendedPsuWatts).toBeGreaterThanOrEqual(600);
  });

  it('flags an undersized PSU as insufficient', () => {
    const estimate = estimatePower(
      buildFromIds([
        'cpu-amd-ryzen-9-9950x',
        'gpu-gigabyte-rtx-5090',
        'mb-msi-mag-x870-tomahawk',
        'psu-msi-mag-a650bn',
      ]),
    );
    expect(estimate.status).toBe('insufficient');
    expect(estimate.loadRatio).toBeGreaterThan(1);
  });

  it('flags a PSU running above the load threshold as tight', () => {
    const estimate = estimatePower(
      buildFromIds([
        'cpu-amd-ryzen-7-9800x3d',
        'gpu-msi-ventus-rtx-5080',
        'mb-asus-rog-strix-b850-f',
        'ram-corsair-vengeance-32gb-ddr5-6000',
        'psu-corsair-rm750e',
      ]),
    );
    expect(estimate.status).toBe('tight');
  });

  it('accepts a correctly sized PSU', () => {
    const estimate = estimatePower(buildFromIds(COMPATIBLE_AM5_BUILD));
    expect(estimate.status).toBe('sufficient');
    expect(estimate.selectedPsuWatts).toBe(1000);
    expect(estimate.loadRatio).toBeLessThan(0.85);
  });
});
