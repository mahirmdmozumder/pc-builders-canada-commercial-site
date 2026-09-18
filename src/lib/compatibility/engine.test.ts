import { describe, expect, it } from 'vitest';
import { checkCompatibility, type CheckStatus } from '@/lib/compatibility/engine';
import {
  buildFromIds,
  fakeComponent,
  COMPATIBLE_AM5_BUILD,
} from '@/lib/catalog/test-helpers';
import type { ResolvedBuild } from '@/lib/catalog/types';

/**
 * Rules are tested against synthetic parts wherever the scenario needs a
 * specific combination of figures. Asserting a rule with whatever the shop
 * happens to stock makes the suite fail when a product is discontinued, for
 * a reason that has nothing to do with the rule under test.
 *
 * The catalogue is still used for the baseline, so a real configuration that
 * should pass is proven to pass.
 */

function statusOf(build: ResolvedBuild, checkId: string): CheckStatus {
  const check = checkCompatibility(build).checks.find((c) => c.id === checkId);
  if (!check) throw new Error(`No check with id ${checkId}`);
  return check.status;
}

function swap(build: string[], remove: string, add: string): string[] {
  return [...build.filter((id) => id !== remove), add];
}

/** Baseline plus or minus synthetic parts. */
function withPart(
  base: string[],
  part: ReturnType<typeof fakeComponent>,
  replaceCategory = true,
): ResolvedBuild {
  const resolved = buildFromIds(base);
  const kept = replaceCategory ? resolved.filter((i) => i.category !== part.category) : resolved;
  return [...kept, { category: part.category, component: part, quantity: 1 }];
}

describe('compatibility engine', () => {
  describe('baseline', () => {
    it('passes every check for a real, complete AM5 build from the catalogue', () => {
      const report = checkCompatibility(buildFromIds(COMPATIBLE_AM5_BUILD));
      expect(report.failures).toEqual([]);
      expect(report.missingCategories).toEqual([]);
      expect(report.status).toBe('compatible');
    });

    it('reports incomplete rather than compatible when parts are missing', () => {
      const report = checkCompatibility(buildFromIds(['cpu-amd-ryzen-7-9800x3d']));
      expect(report.status).toBe('incomplete');
      expect(report.missingCategories).toContain('motherboard');
      expect(report.missingCategories).toContain('psu');
    });

    it('skips checks whose inputs are not selected yet', () => {
      const report = checkCompatibility(buildFromIds(['cpu-amd-ryzen-7-9800x3d']));
      expect(report.checks.find((c) => c.id === 'gpu-case')?.status).toBe('skipped');
    });
  });

  describe('CPU / motherboard socket', () => {
    it('fails an AM5 processor in an LGA1851 board', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-msi-mpg-z890-carbon');
      expect(statusOf(buildFromIds(build), 'cpu-motherboard')).toBe('fail');
    });

    it('fails an Intel processor in an AMD board', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'cpu-amd-ryzen-7-9800x3d', 'cpu-intel-core-ultra-9-285k');
      expect(statusOf(buildFromIds(build), 'cpu-motherboard')).toBe('fail');
    });

    it('passes when sockets match', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'cpu-motherboard')).toBe('pass');
    });

    it('reports unknown when a socket is not recorded', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({ id: 'mb-no-socket', category: 'motherboard', form_factor: 'atx' }),
      );
      expect(statusOf(build, 'cpu-motherboard')).toBe('unknown');
    });
  });

  describe('memory / motherboard', () => {
    it('fails DDR4 memory in a DDR5 board', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'ram-ddr4-kit',
          category: 'ram',
          memory_type: 'ddr4',
          memory_capacity_gb: 32,
          memory_modules: 2,
        }),
      );
      const check = checkCompatibility(build).checks.find((c) => c.id === 'ram-motherboard');
      expect(check?.status).toBe('fail');
      expect(check?.message).toContain('DDR4');
    });

    it('fails when more modules are selected than the board has slots', () => {
      // The mini-ITX board has two DIMM slots; two 2-module kits need four.
      const build = swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-asus-rog-strix-b850-i');
      const resolved = buildFromIds(build, { 'ram-teamgroup-vulcan-32gb-ddr5-6000': 2 });
      const check = checkCompatibility(resolved).checks.find((c) => c.id === 'ram-motherboard');
      expect(check?.status).toBe('fail');
      expect(check?.message).toContain('4 memory modules');
    });

    it('fails when total capacity exceeds the board maximum', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'ram-huge',
          category: 'ram',
          memory_type: 'ddr5',
          memory_capacity_gb: 512,
          memory_modules: 2,
        }),
      );
      expect(statusOf(build, 'ram-motherboard')).toBe('fail');
    });

    it('passes a single kit within slot and capacity limits', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'ram-motherboard')).toBe('pass');
    });
  });

  describe('CPU cooler', () => {
    it('fails a cooler with no bracket for the processor socket', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'cool-intel-only',
          category: 'cooler',
          cooler_type: 'air',
          cooler_height_mm: 150,
          supported_sockets: ['LGA1851', 'LGA1700'],
          cooling_capacity_watts: 250,
        }),
      );
      expect(statusOf(build, 'cooler-cpu')).toBe('fail');
    });

    it('warns when cooling capacity is below the processor power draw', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'cool-weak',
          category: 'cooler',
          cooler_type: 'air',
          cooler_height_mm: 120,
          supported_sockets: ['AM5'],
          cooling_capacity_watts: 65,
        }),
      );
      expect(statusOf(build, 'cooler-cpu')).toBe('warning');
    });

    it('passes when the socket matches and capacity is sufficient', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'cool-arctic-liquid-freezer-iii-360',
        'cool-deepcool-ak620-g2',
      );
      expect(statusOf(buildFromIds(build), 'cooler-cpu')).toBe('pass');
    });
  });

  describe('cooling / case', () => {
    it('fails a 360 mm radiator in a case that only mounts 240 mm', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-240-only',
          category: 'case',
          supported_form_factors: ['atx', 'micro-atx', 'mini-itx'],
          max_gpu_length_mm: 400,
          max_cooler_height_mm: 160,
          radiator_support_mm: [240],
          psu_form_factor: 'atx',
        }),
      );
      expect(statusOf(build, 'cooler-case')).toBe('fail');
    });

    it('fails a tall air cooler in a case with less clearance', () => {
      const shortCase = fakeComponent({
        id: 'case-low-clearance',
        category: 'case',
        supported_form_factors: ['atx'],
        max_gpu_length_mm: 400,
        max_cooler_height_mm: 140,
        radiator_support_mm: [240],
        psu_form_factor: 'atx',
      });
      const build = [
        ...withPart(COMPATIBLE_AM5_BUILD, shortCase).filter((i) => i.category !== 'cooler'),
        {
          category: 'cooler' as const,
          component: fakeComponent({
            id: 'cool-tall',
            category: 'cooler',
            cooler_type: 'air',
            cooler_height_mm: 168,
            supported_sockets: ['AM5'],
            cooling_capacity_watts: 260,
          }),
          quantity: 1,
        },
      ];
      expect(statusOf(build, 'cooler-case')).toBe('fail');
    });

    it('passes a 360 mm radiator in a case that mounts one', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'cooler-case')).toBe('pass');
    });
  });

  describe('graphics card / case clearance', () => {
    it('fails when the card is longer than the case allows', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-tiny',
          category: 'case',
          supported_form_factors: ['atx', 'mini-itx'],
          max_gpu_length_mm: 300,
          max_cooler_height_mm: 170,
          radiator_support_mm: [240, 360],
          psu_form_factor: 'atx',
        }),
      );
      const check = checkCompatibility(build).checks.find((c) => c.id === 'gpu-case');
      expect(check?.status).toBe('fail');
      expect(check?.message).toContain('340 mm');
    });

    it('warns when clearance is under 15 mm', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-snug',
          category: 'case',
          supported_form_factors: ['atx'],
          // 340 mm card, 350 mm of clearance.
          max_gpu_length_mm: 350,
          max_cooler_height_mm: 170,
          radiator_support_mm: [240, 360],
          psu_form_factor: 'atx',
        }),
      );
      expect(statusOf(build, 'gpu-case')).toBe('warning');
    });

    it('passes with room to spare', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'gpu-case')).toBe('pass');
    });
  });

  describe('motherboard / case form factor', () => {
    it('fails an ATX board in a mini-ITX only case', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-itx-only',
          category: 'case',
          supported_form_factors: ['mini-itx'],
          max_gpu_length_mm: 330,
          max_cooler_height_mm: 155,
          radiator_support_mm: [240],
          psu_form_factor: 'sfx',
        }),
      );
      expect(statusOf(build, 'motherboard-case')).toBe('fail');
    });

    it('passes a mini-ITX board in a case that accepts it', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-asus-rog-strix-b850-i');
      expect(statusOf(buildFromIds(build), 'motherboard-case')).toBe('pass');
    });
  });

  describe('storage / motherboard', () => {
    it('fails when M.2 drives outnumber M.2 slots', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-asus-rog-strix-b850-i');
      const resolved = buildFromIds(build, { 'ssd-wd-black-sn850x-2tb': 3 });
      expect(statusOf(resolved, 'storage-motherboard')).toBe('fail');
    });

    it('fails when SATA drives outnumber SATA ports', () => {
      const base = buildFromIds(COMPATIBLE_AM5_BUILD).filter((i) => i.category !== 'storage');
      const build = [
        ...base,
        {
          category: 'storage' as const,
          component: fakeComponent({
            id: 'ssd-sata-test',
            category: 'storage',
            storage_interface: 'sata',
            storage_capacity_gb: 2000,
          }),
          quantity: 9,
        },
      ];
      expect(statusOf(build, 'storage-motherboard')).toBe('fail');
    });

    it('passes a single NVMe drive', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'storage-motherboard')).toBe('pass');
    });
  });

  describe('power supply', () => {
    it('fails when the selected supply is below the estimated draw', () => {
      const heavy = swap(COMPATIBLE_AM5_BUILD, 'cpu-amd-ryzen-7-9800x3d', 'cpu-amd-ryzen-9-9950x');
      const build = withPart(
        heavy,
        fakeComponent({
          id: 'psu-undersized',
          category: 'psu',
          psu_wattage: 450,
          psu_form_factor: 'atx',
        }),
      );
      expect(statusOf(build, 'psu-capacity')).toBe('fail');
    });

    it('warns when the supply is sufficient but has little headroom', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'psu-deepcool-pn1000m', 'psu-deepcool-pn650m');
      const check = checkCompatibility(buildFromIds(build)).checks.find(
        (c) => c.id === 'psu-capacity',
      );
      expect(['warning', 'fail']).toContain(check?.status);
    });

    it('passes a correctly sized supply', () => {
      expect(statusOf(buildFromIds(COMPATIBLE_AM5_BUILD), 'psu-capacity')).toBe('pass');
    });

    it('fails an ATX supply in an SFX-only case', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-sfx-only',
          category: 'case',
          supported_form_factors: ['atx', 'mini-itx'],
          max_gpu_length_mm: 400,
          max_cooler_height_mm: 170,
          radiator_support_mm: [240, 360],
          psu_form_factor: 'sfx',
        }),
      );
      expect(statusOf(build, 'psu-case')).toBe('fail');
    });
  });

  describe('honesty about missing data', () => {
    it('reports unknown, not pass, when a rule has no data to work with', () => {
      const report = checkCompatibility(buildFromIds(['os-windows-11-pro']));
      expect(report.checks.filter((c) => c.status === 'pass')).toHaveLength(0);
    });

    it('does not claim a clearance result when the case records no limit', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'case-undocumented',
          category: 'case',
          supported_form_factors: ['atx'],
          psu_form_factor: 'atx',
        }),
      );
      expect(statusOf(build, 'gpu-case')).toBe('unknown');
    });
  });

  describe('overall status', () => {
    it('is incompatible when any check fails', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-msi-mpg-z890-carbon');
      expect(checkCompatibility(buildFromIds(build)).status).toBe('incompatible');
    });

    it('is warnings when checks pass but one raises a caution', () => {
      const build = withPart(
        COMPATIBLE_AM5_BUILD,
        fakeComponent({
          id: 'cool-marginal',
          category: 'cooler',
          cooler_type: 'aio',
          radiator_size_mm: [360],
          supported_sockets: ['AM5'],
          cooling_capacity_watts: 90,
        }),
      );
      const report = checkCompatibility(build);
      expect(report.failures).toEqual([]);
      expect(report.status).toBe('warnings');
    });
  });
});
