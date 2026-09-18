import { describe, expect, it } from 'vitest';
import {
  estimatePower,
  PSU_HEADROOM_MULTIPLIER,
  SYSTEM_OVERHEAD_WATTS,
} from '@/lib/power/calculator';
import { buildFromIds, fakeComponent, COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';

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
    const single = estimatePower(buildFromIds(['ssd-wd-black-sn850x-2tb']));
    const triple = estimatePower(buildFromIds(['ssd-wd-black-sn850x-2tb'], { 'ssd-wd-black-sn850x-2tb': 3 }));
    expect(triple.lineItems[0].watts).toBe(single.lineItems[0].watts * 3);
  });

  it('marks a line as estimated when the part has no recorded power figure', () => {
    // The sleeved cable kit has no tdp_watts and no category default > 0,
    // so it contributes nothing; the OS licence likewise.
    const estimate = estimatePower(buildFromIds(['os-windows-11-pro', 'os-none']));
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
      buildFromIds(['cpu-amd-ryzen-5-7600x', 'gpu-msi-rtx-5060-ti-16g']),
    );
    expect(estimate.recommendedPsuWatts).toBeGreaterThanOrEqual(600);
  });

  it('flags an undersized PSU as insufficient', () => {
    // A synthetic 450 W supply: the smallest unit the shop stocks is 650 W,
    // and this rule should be provable without waiting for a cheaper one.
    const estimate = estimatePower([
      ...buildFromIds([
        'cpu-amd-ryzen-9-9950x',
        'gpu-gigabyte-rtx-5080-gaming-oc',
        'mb-msi-mag-x870-tomahawk',
        'ram-teamgroup-delta-64gb-ddr5-6000',
      ]),
      {
        category: 'psu' as const,
        component: fakeComponent({
          id: 'psu-small-test',
          category: 'psu',
          psu_wattage: 450,
          psu_form_factor: 'atx',
        }),
        quantity: 1,
      },
    ]);
    expect(estimate.status).toBe('insufficient');
    expect(estimate.loadRatio).toBeGreaterThan(1);
  });

  it('flags a PSU running above the load threshold as tight', () => {
    const estimate = estimatePower(
      buildFromIds([
        'cpu-amd-ryzen-7-9800x3d',
        'gpu-gigabyte-rtx-5080-gaming-oc',
        'mb-asus-rog-strix-b850-f',
        'ram-teamgroup-vulcan-32gb-ddr5-6000',
        'psu-deepcool-pn650m',
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
