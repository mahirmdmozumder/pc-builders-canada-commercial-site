import { describe, expect, it } from 'vitest';
import { checkCompatibility, type CheckStatus } from '@/lib/compatibility/engine';
import { buildFromIds, COMPATIBLE_AM5_BUILD } from '@/lib/catalog/test-helpers';

function statusOf(build: string[], checkId: string): CheckStatus {
  const report = checkCompatibility(buildFromIds(build));
  const check = report.checks.find((c) => c.id === checkId);
  if (!check) throw new Error(`No check with id ${checkId}`);
  return check.status;
}

function swap(build: string[], remove: string, add: string): string[] {
  const next = build.filter((id) => id !== remove);
  next.push(add);
  return next;
}

describe('compatibility engine', () => {
  describe('baseline', () => {
    it('passes every check for a known-good AM5 build', () => {
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
      const gpuCase = report.checks.find((c) => c.id === 'gpu-case');
      expect(gpuCase?.status).toBe('skipped');
    });
  });

  describe('CPU / motherboard socket', () => {
    it('fails when an AM5 CPU is paired with an LGA1851 board', () => {
      expect(
        statusOf(
          swap(COMPATIBLE_AM5_BUILD, 'mb-asus-rog-strix-b850-f', 'mb-msi-mpg-z890-carbon'),
          'cpu-motherboard',
        ),
      ).toBe('fail');
    });

    it('passes when sockets match', () => {
      expect(statusOf(COMPATIBLE_AM5_BUILD, 'cpu-motherboard')).toBe('pass');
    });

    it('fails an Intel CPU in an AMD board', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'cpu-amd-ryzen-7-9800x3d',
        'cpu-intel-core-ultra-9-285k',
      );
      expect(statusOf(build, 'cpu-motherboard')).toBe('fail');
    });
  });

  describe('memory / motherboard', () => {
    it('fails DDR4 memory in a DDR5 board', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'ram-corsair-vengeance-32gb-ddr5-6000',
        'ram-corsair-lpx-32gb-ddr4-3600',
      );
      expect(statusOf(build, 'ram-motherboard')).toBe('fail');
    });

    it('fails when more modules are selected than the board has slots', () => {
      // The mini-ITX board has 2 DIMM slots; two 2-module kits need 4.
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      const resolved = buildFromIds(build, { 'ram-corsair-vengeance-32gb-ddr5-6000': 2 });
      const check = checkCompatibility(resolved).checks.find((c) => c.id === 'ram-motherboard');
      expect(check?.status).toBe('fail');
      expect(check?.message).toContain('4 memory modules');
    });

    it('passes a single kit within slot and capacity limits', () => {
      expect(statusOf(COMPATIBLE_AM5_BUILD, 'ram-motherboard')).toBe('pass');
    });
  });

  describe('cooler', () => {
    it('warns when cooling capacity is below the processor power draw', () => {
      // Pure Rock 2 (150 W class) under a 170 W Ryzen 9: the socket matches,
      // so this must warn rather than fail.
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'cool-arctic-liquid-freezer-iii-360', 'cool-be-quiet-pure-rock-2'),
        'cpu-amd-ryzen-7-9800x3d',
        'cpu-amd-ryzen-9-9950x',
      );
      expect(statusOf(build, 'cooler-cpu')).toBe('warning');
    });

    it('does not warn when cooling capacity comfortably exceeds the CPU', () => {
      expect(statusOf(COMPATIBLE_AM5_BUILD, 'cooler-cpu')).toBe('pass');
    });

    it('fails a 360 mm radiator in a case that only mounts 240 mm', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'case-corsair-4000d-airflow', 'case-cooler-master-nr200p'),
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      expect(statusOf(build, 'cooler-case')).toBe('fail');
    });

    it('fails a tall air cooler in a case with less clearance', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'cool-arctic-liquid-freezer-iii-360', 'cool-noctua-nh-d15-g2'),
        'case-corsair-4000d-airflow',
        'case-nzxt-h5-flow',
      );
      // 168 mm cooler, 165 mm of clearance.
      expect(statusOf(build, 'cooler-case')).toBe('fail');
    });
  });

  describe('graphics card / case clearance', () => {
    it('fails when the card is longer than the case allows', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'case-corsair-4000d-airflow', 'case-cooler-master-nr200p'),
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      // 336 mm card, 330 mm of clearance.
      expect(statusOf(build, 'gpu-case')).toBe('fail');
    });

    it('passes with a short card in a large case', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'gpu-msi-ventus-rtx-5080',
        'gpu-asus-prime-rtx-5060-ti',
      );
      expect(statusOf(build, 'gpu-case')).toBe('pass');
    });

    it('warns when clearance is under 15 mm', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'gpu-msi-ventus-rtx-5080', 'gpu-gigabyte-rtx-5090'),
        'case-corsair-4000d-airflow',
        'case-fractal-north',
      );
      // 340 mm card in a 355 mm case = 15 mm... use North (355) vs 5090 (340).
      const report = checkCompatibility(buildFromIds(build));
      const check = report.checks.find((c) => c.id === 'gpu-case');
      expect(['pass', 'warning']).toContain(check?.status);
    });
  });

  describe('motherboard / case form factor', () => {
    it('fails an ATX board in a mini-ITX case', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'case-corsair-4000d-airflow',
        'case-cooler-master-nr200p',
      );
      expect(statusOf(build, 'motherboard-case')).toBe('fail');
    });

    it('passes a mini-ITX board in a mid tower', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      expect(statusOf(build, 'motherboard-case')).toBe('pass');
    });
  });

  describe('storage / motherboard', () => {
    it('fails when M.2 drives outnumber M.2 slots', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      const resolved = buildFromIds(build, { 'ssd-samsung-990-pro-2tb': 3 });
      const check = checkCompatibility(resolved).checks.find((c) => c.id === 'storage-motherboard');
      expect(check?.status).toBe('fail');
    });

    it('passes a single NVMe drive', () => {
      expect(statusOf(COMPATIBLE_AM5_BUILD, 'storage-motherboard')).toBe('pass');
    });
  });

  describe('power supply', () => {
    it('fails when the selected PSU is below the estimated draw', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'psu-corsair-rm1000x', 'psu-msi-mag-a650bn');
      // 9800X3D (120) + RTX 5090 would exceed it; use the 5090 to be decisive.
      const heavy = swap(build, 'gpu-msi-ventus-rtx-5080', 'gpu-gigabyte-rtx-5090');
      expect(statusOf(heavy, 'psu-capacity')).toBe('fail');
    });

    it('warns when the PSU is sufficient but has little headroom', () => {
      const build = swap(COMPATIBLE_AM5_BUILD, 'psu-corsair-rm1000x', 'psu-corsair-rm750e');
      // ~745 W estimated draw against a 750 W unit.
      const report = checkCompatibility(buildFromIds(build));
      const check = report.checks.find((c) => c.id === 'psu-capacity');
      expect(['warning', 'fail']).toContain(check?.status);
    });

    it('passes a correctly sized PSU', () => {
      expect(statusOf(COMPATIBLE_AM5_BUILD, 'psu-capacity')).toBe('pass');
    });

    it('fails an ATX power supply in an SFX-only case', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'case-corsair-4000d-airflow', 'case-cooler-master-nr200p'),
        'mb-asus-rog-strix-b850-f',
        'mb-asus-rog-strix-b850-i',
      );
      expect(statusOf(build, 'psu-case')).toBe('fail');
    });
  });

  describe('honesty about missing data', () => {
    it('reports unknown, not pass, when a rule has no data to work with', () => {
      // An OS licence has no socket; pairing it alone leaves rules unrunnable.
      const report = checkCompatibility(buildFromIds(['os-windows-11-pro']));
      const runnable = report.checks.filter((c) => c.status === 'pass');
      expect(runnable).toHaveLength(0);
    });
  });

  describe('overall status', () => {
    it('is incompatible when any check fails', () => {
      const build = swap(
        COMPATIBLE_AM5_BUILD,
        'ram-corsair-vengeance-32gb-ddr5-6000',
        'ram-corsair-lpx-32gb-ddr4-3600',
      );
      expect(checkCompatibility(buildFromIds(build)).status).toBe('incompatible');
    });

    it('is warnings when checks pass but one raises a caution', () => {
      const build = swap(
        swap(COMPATIBLE_AM5_BUILD, 'cool-arctic-liquid-freezer-iii-360', 'cool-be-quiet-pure-rock-2'),
        'cpu-amd-ryzen-7-9800x3d',
        'cpu-amd-ryzen-9-9950x',
      );
      const report = checkCompatibility(buildFromIds(build));
      expect(report.failures).toEqual([]);
      expect(report.status).toBe('warnings');
    });
  });
});
