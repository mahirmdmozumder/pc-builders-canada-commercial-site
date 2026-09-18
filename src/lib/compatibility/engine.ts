import {
  CATEGORY_LABELS,
  REQUIRED_CATEGORIES,
  displayName,
  type ComponentCategory,
  type PublicComponent,
  type ResolvedBuild,
  type ResolvedBuildItem,
} from '@/lib/catalog/types';
import { estimatePower, type PowerEstimate } from '@/lib/power/calculator';

/**
 * Deterministic hardware compatibility engine.
 *
 * Every rule below is a pure function of the structured fields on the
 * catalogue rows. Nothing here calls a model, scrapes text, or guesses:
 * if the data needed for a rule is missing, the rule reports `unknown`
 * instead of inventing an answer. That distinction matters — a silent
 * "compatible" on missing data would be worse than no check at all.
 */

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'unknown' | 'skipped';

export interface CompatibilityCheck {
  /** Stable id, used for tests and for anchoring UI. */
  id: string;
  /** Human label, e.g. "CPU / Motherboard". */
  title: string;
  status: CheckStatus;
  /** One-line result shown next to the label. */
  message: string;
  /** Optional expansion explaining the numbers behind the result. */
  detail?: string;
}

export type BuildCompatibility = 'compatible' | 'warnings' | 'incompatible' | 'incomplete';

export interface CompatibilityReport {
  status: BuildCompatibility;
  checks: CompatibilityCheck[];
  failures: CompatibilityCheck[];
  warnings: CompatibilityCheck[];
  missingCategories: ComponentCategory[];
  power: PowerEstimate;
}

type BuildIndex = Partial<Record<ComponentCategory, ResolvedBuildItem[]>>;

function indexBuild(build: ResolvedBuild): BuildIndex {
  const index: BuildIndex = {};
  for (const item of build) {
    (index[item.category] ??= []).push(item);
  }
  return index;
}

function first(index: BuildIndex, category: ComponentCategory): PublicComponent | null {
  return index[category]?.[0]?.component ?? null;
}

function skipped(id: string, title: string, missing: string): CompatibilityCheck {
  return { id, title, status: 'skipped', message: `Select a ${missing} to run this check.` };
}

function unknown(id: string, title: string, detail: string): CompatibilityCheck {
  return {
    id,
    title,
    status: 'unknown',
    message: 'Not enough verified data to check.',
    detail,
  };
}

// ---------------------------------------------------------------------------
// Individual rules
// ---------------------------------------------------------------------------

function checkCpuMotherboard(index: BuildIndex): CompatibilityCheck {
  const id = 'cpu-motherboard';
  const title = 'CPU / Motherboard';
  const cpu = first(index, 'cpu');
  const board = first(index, 'motherboard');
  if (!cpu || !board) return skipped(id, title, !cpu ? 'processor' : 'motherboard');
  if (!cpu.socket || !board.socket) {
    return unknown(id, title, 'Socket is not recorded on one of these parts.');
  }

  if (cpu.socket.toLowerCase() !== board.socket.toLowerCase()) {
    return {
      id,
      title,
      status: 'fail',
      message: `Socket mismatch: ${cpu.socket} CPU cannot be installed in a ${board.socket} board.`,
      detail: `${displayName(cpu)} uses socket ${cpu.socket}. ${displayName(board)} provides socket ${board.socket}.`,
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `Socket ${board.socket} matches.`,
    detail: `${displayName(cpu)} installs in ${displayName(board)} (${board.chipset ?? 'chipset not recorded'}). A BIOS update may still be required for newer CPUs on older boards — confirm the board's CPU support list.`,
  };
}

function checkMemoryMotherboard(index: BuildIndex): CompatibilityCheck {
  const id = 'ram-motherboard';
  const title = 'Memory / Motherboard';
  const board = first(index, 'motherboard');
  const ramItems = index.ram ?? [];
  if (!board || ramItems.length === 0) {
    return skipped(id, title, !board ? 'motherboard' : 'memory kit');
  }

  const ram = ramItems[0].component;
  if (!ram.memory_type || !board.memory_type) {
    return unknown(id, title, 'DDR generation is not recorded on one of these parts.');
  }

  if (ram.memory_type !== board.memory_type) {
    return {
      id,
      title,
      status: 'fail',
      message: `${ram.memory_type.toUpperCase()} memory does not fit a ${board.memory_type.toUpperCase()} board.`,
      detail: 'DDR generations are keyed differently and are not interchangeable.',
    };
  }

  const totalModules = ramItems.reduce(
    (sum, item) => sum + (item.component.memory_modules ?? 1) * item.quantity,
    0,
  );
  const totalCapacity = ramItems.reduce(
    (sum, item) => sum + (item.component.memory_capacity_gb ?? 0) * item.quantity,
    0,
  );

  if (board.memory_slots !== null && totalModules > board.memory_slots) {
    return {
      id,
      title,
      status: 'fail',
      message: `${totalModules} memory modules selected but the board has ${board.memory_slots} slots.`,
      detail: `${displayName(board)} provides ${board.memory_slots} DIMM slots.`,
    };
  }

  if (board.max_memory_gb !== null && totalCapacity > board.max_memory_gb) {
    return {
      id,
      title,
      status: 'fail',
      message: `${totalCapacity} GB exceeds the ${board.max_memory_gb} GB maximum for this board.`,
    };
  }

  const detailParts = [
    `${totalCapacity} GB ${ram.memory_type.toUpperCase()} across ${totalModules} module${totalModules === 1 ? '' : 's'}`,
  ];
  if (board.memory_slots !== null) detailParts.push(`${board.memory_slots} slots available`);
  if (ram.memory_speed_mts) {
    detailParts.push(
      `${ram.memory_speed_mts} MT/s — speeds above the CPU's rated support run as an overclock (XMP/EXPO) and are not guaranteed`,
    );
  }

  return {
    id,
    title,
    status: 'pass',
    message: `${ram.memory_type.toUpperCase()} supported, ${totalModules} of ${board.memory_slots ?? '?'} slots used.`,
    detail: detailParts.join('. ') + '.',
  };
}

function checkCoolerCpu(index: BuildIndex): CompatibilityCheck {
  const id = 'cooler-cpu';
  const title = 'CPU Cooler / Socket';
  const cooler = first(index, 'cooler');
  const cpu = first(index, 'cpu');
  if (!cooler || !cpu) return skipped(id, title, !cooler ? 'CPU cooler' : 'processor');

  const sockets = cooler.supported_sockets;
  if (!sockets || sockets.length === 0 || !cpu.socket) {
    return unknown(id, title, 'Socket bracket support is not recorded for this cooler.');
  }

  const supported = sockets.some((s) => s.toLowerCase() === cpu.socket!.toLowerCase());
  if (!supported) {
    return {
      id,
      title,
      status: 'fail',
      message: `This cooler has no ${cpu.socket} mounting hardware.`,
      detail: `${displayName(cooler)} lists brackets for: ${sockets.join(', ')}.`,
    };
  }

  const coolerRating = cooler.cooling_capacity_watts;
  const cpuDraw = cpu.tdp_watts;
  if (coolerRating !== null && cpuDraw !== null && coolerRating < cpuDraw) {
    return {
      id,
      title,
      status: 'warning',
      message: `Cooler is rated below the processor's sustained power draw.`,
      detail: `${displayName(cooler)} is rated to roughly ${coolerRating} W; ${displayName(cpu)} draws about ${cpuDraw} W under sustained load. The system will run, but expect thermal throttling in long workloads.`,
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `Mounting hardware for ${cpu.socket} included.`,
    detail: `${displayName(cooler)} supports ${sockets.join(', ')}.`,
  };
}

function checkCoolerCase(index: BuildIndex): CompatibilityCheck {
  const id = 'cooler-case';
  const title = 'Cooling / Case';
  const cooler = first(index, 'cooler');
  const pcCase = first(index, 'case');
  if (!cooler || !pcCase) return skipped(id, title, !cooler ? 'CPU cooler' : 'case');

  if (cooler.cooler_type === 'air') {
    if (cooler.cooler_height_mm === null || pcCase.max_cooler_height_mm === null) {
      return unknown(id, title, 'Cooler height or case clearance is not recorded.');
    }
    if (cooler.cooler_height_mm > pcCase.max_cooler_height_mm) {
      return {
        id,
        title,
        status: 'fail',
        message: `Cooler is ${cooler.cooler_height_mm} mm tall; the case allows ${pcCase.max_cooler_height_mm} mm.`,
        detail: `The side panel will not close with ${displayName(cooler)} installed in ${displayName(pcCase)}.`,
      };
    }
    const margin = pcCase.max_cooler_height_mm - cooler.cooler_height_mm;
    return {
      id,
      title,
      status: 'pass',
      message: `Fits with ${margin} mm of headroom.`,
      detail: `${cooler.cooler_height_mm} mm cooler in a case rated for ${pcCase.max_cooler_height_mm} mm.`,
    };
  }

  if (cooler.cooler_type === 'aio') {
    const radiator = cooler.radiator_size_mm;
    const supported = pcCase.radiator_support_mm;
    if (!radiator || radiator.length === 0 || !supported || supported.length === 0) {
      return unknown(id, title, 'Radiator size or case radiator support is not recorded.');
    }
    const fits = radiator.some((size) => supported.includes(size));
    if (!fits) {
      return {
        id,
        title,
        status: 'fail',
        message: `Case has no mount for a ${radiator.join('/')} mm radiator.`,
        detail: `${displayName(pcCase)} supports radiators of: ${supported.join(', ')} mm.`,
      };
    }
    return {
      id,
      title,
      status: 'pass',
      message: `${radiator.join('/')} mm radiator mounts in this case.`,
      detail: `${displayName(pcCase)} supports ${supported.join(', ')} mm radiators. Check front vs. top mounting for clearance against tall memory.`,
    };
  }

  return unknown(id, title, 'Cooler type is not recorded.');
}

function checkGpuCase(index: BuildIndex): CompatibilityCheck {
  const id = 'gpu-case';
  const title = 'Graphics Card / Case';
  const gpu = first(index, 'gpu');
  const pcCase = first(index, 'case');
  if (!gpu || !pcCase) return skipped(id, title, !gpu ? 'graphics card' : 'case');

  if (gpu.gpu_length_mm === null || pcCase.max_gpu_length_mm === null) {
    return unknown(id, title, 'Card length or case clearance is not recorded.');
  }

  if (gpu.gpu_length_mm > pcCase.max_gpu_length_mm) {
    return {
      id,
      title,
      status: 'fail',
      message: `Card is ${gpu.gpu_length_mm} mm long; this case takes up to ${pcCase.max_gpu_length_mm} mm.`,
      detail: `${displayName(gpu)} will not physically fit in ${displayName(pcCase)}.`,
    };
  }

  const margin = pcCase.max_gpu_length_mm - gpu.gpu_length_mm;
  if (margin < 15) {
    return {
      id,
      title,
      status: 'warning',
      message: `Only ${margin} mm of clearance — a tight fit.`,
      detail: 'Front radiator or fan mounts may reduce usable card length further.',
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `Fits with ${margin} mm to spare.`,
    detail: `${gpu.gpu_length_mm} mm card in a case rated for ${pcCase.max_gpu_length_mm} mm.`,
  };
}

function checkMotherboardCase(index: BuildIndex): CompatibilityCheck {
  const id = 'motherboard-case';
  const title = 'Motherboard / Case';
  const board = first(index, 'motherboard');
  const pcCase = first(index, 'case');
  if (!board || !pcCase) return skipped(id, title, !board ? 'motherboard' : 'case');

  if (!board.form_factor || !pcCase.supported_form_factors?.length) {
    return unknown(id, title, 'Form factor support is not recorded.');
  }

  if (!pcCase.supported_form_factors.includes(board.form_factor)) {
    return {
      id,
      title,
      status: 'fail',
      message: `This case does not accept ${board.form_factor.toUpperCase()} boards.`,
      detail: `${displayName(pcCase)} supports: ${pcCase.supported_form_factors.join(', ').toUpperCase()}.`,
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `${board.form_factor.toUpperCase()} is supported by this case.`,
    detail: `${displayName(pcCase)} supports ${pcCase.supported_form_factors.join(', ').toUpperCase()}.`,
  };
}

function checkGpuMotherboard(index: BuildIndex): CompatibilityCheck {
  const id = 'gpu-motherboard';
  const title = 'Graphics Card / PCIe';
  const gpu = first(index, 'gpu');
  const board = first(index, 'motherboard');
  if (!gpu || !board) return skipped(id, title, !gpu ? 'graphics card' : 'motherboard');

  if (gpu.pcie_version === null || board.pcie_version === null) {
    return unknown(id, title, 'PCIe generation is not recorded on one of these parts.');
  }

  if (gpu.pcie_version > board.pcie_version) {
    return {
      id,
      title,
      status: 'warning',
      message: `Card is PCIe ${gpu.pcie_version}; the board's slot runs at PCIe ${board.pcie_version}.`,
      detail:
        'PCIe is backward compatible, so the card will work. It will negotiate the slower link, which costs a small amount of performance on bandwidth-heavy workloads.',
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `PCIe ${gpu.pcie_version} card in a PCIe ${board.pcie_version} slot.`,
  };
}

function checkStorageMotherboard(index: BuildIndex): CompatibilityCheck {
  const id = 'storage-motherboard';
  const title = 'Storage / Motherboard';
  const board = first(index, 'motherboard');
  const storage = index.storage ?? [];
  if (!board || storage.length === 0) {
    return skipped(id, title, !board ? 'motherboard' : 'storage drive');
  }

  let nvme = 0;
  let sata = 0;
  let unrecorded = 0;
  for (const item of storage) {
    const iface = item.component.storage_interface;
    if (iface === 'nvme-m2') nvme += item.quantity;
    else if (iface === 'sata') sata += item.quantity;
    else unrecorded += item.quantity;
  }

  if (unrecorded > 0 && nvme === 0 && sata === 0) {
    return unknown(id, title, 'Drive interface is not recorded.');
  }

  if (board.m2_slots !== null && nvme > board.m2_slots) {
    return {
      id,
      title,
      status: 'fail',
      message: `${nvme} M.2 drives selected but the board has ${board.m2_slots} M.2 slots.`,
    };
  }

  if (board.sata_ports !== null && sata > board.sata_ports) {
    return {
      id,
      title,
      status: 'fail',
      message: `${sata} SATA drives selected but the board has ${board.sata_ports} SATA ports.`,
    };
  }

  const parts: string[] = [];
  if (nvme > 0) parts.push(`${nvme} M.2 of ${board.m2_slots ?? '?'} slots`);
  if (sata > 0) parts.push(`${sata} SATA of ${board.sata_ports ?? '?'} ports`);

  return {
    id,
    title,
    status: 'pass',
    message: parts.join(', ') + ' used.',
    detail:
      nvme > 0
        ? 'Populating some M.2 slots disables SATA ports on many boards — check the board manual for lane sharing.'
        : undefined,
  };
}

function checkPsuCase(index: BuildIndex): CompatibilityCheck {
  const id = 'psu-case';
  const title = 'Power Supply / Case';
  const psu = first(index, 'psu');
  const pcCase = first(index, 'case');
  if (!psu || !pcCase) return skipped(id, title, !psu ? 'power supply' : 'case');

  if (!psu.psu_form_factor || !pcCase.psu_form_factor) {
    return unknown(id, title, 'PSU form factor is not recorded.');
  }

  // An ATX case accepts SFX units with a bracket; an SFX case cannot take ATX.
  const caseAcceptsAtx = pcCase.psu_form_factor === 'atx';
  const psuIsAtx = psu.psu_form_factor === 'atx';
  if (psuIsAtx && !caseAcceptsAtx) {
    return {
      id,
      title,
      status: 'fail',
      message: `This case takes ${pcCase.psu_form_factor.toUpperCase()} power supplies, not ATX.`,
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `${psu.psu_form_factor.toUpperCase()} unit fits this case.`,
    detail: !psuIsAtx && caseAcceptsAtx ? 'A small-form-factor unit in an ATX case may need an adapter bracket.' : undefined,
  };
}

function checkPsuCapacity(power: PowerEstimate, index: BuildIndex): CompatibilityCheck {
  const id = 'psu-capacity';
  const title = 'Power Supply Capacity';
  const psu = first(index, 'psu');

  if (power.estimatedWatts === 0) {
    return skipped(id, title, 'processor and graphics card');
  }
  if (!psu || power.selectedPsuWatts === null) {
    return {
      id,
      title,
      status: 'skipped',
      message: `Estimated draw is ${power.estimatedWatts} W — a ${power.recommendedPsuWatts} W unit is recommended.`,
    };
  }

  const detail = `Estimated sustained draw ${power.estimatedWatts} W. Recommended capacity ${power.recommendedPsuWatts} W (estimate x ${'1.35'} headroom). Selected ${power.selectedPsuWatts} W. This is a calculated estimate from component power figures, not a measurement.`;

  if (power.status === 'insufficient') {
    return {
      id,
      title,
      status: 'fail',
      message: `${power.selectedPsuWatts} W is below the estimated ${power.estimatedWatts} W draw of this build.`,
      detail,
    };
  }

  if (power.status === 'tight') {
    return {
      id,
      title,
      status: 'warning',
      message: `${power.selectedPsuWatts} W works but leaves little headroom (recommended ${power.recommendedPsuWatts} W).`,
      detail,
    };
  }

  return {
    id,
    title,
    status: 'pass',
    message: `${power.selectedPsuWatts} W is sufficient for an estimated ${power.estimatedWatts} W draw.`,
    detail,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export function checkCompatibility(build: ResolvedBuild): CompatibilityReport {
  const index = indexBuild(build);
  const power = estimatePower(build);

  const checks: CompatibilityCheck[] = [
    checkCpuMotherboard(index),
    checkMemoryMotherboard(index),
    checkCoolerCpu(index),
    checkMotherboardCase(index),
    checkGpuMotherboard(index),
    checkGpuCase(index),
    checkCoolerCase(index),
    checkStorageMotherboard(index),
    checkPsuCase(index),
    checkPsuCapacity(power, index),
  ];

  const failures = checks.filter((c) => c.status === 'fail');
  const warnings = checks.filter((c) => c.status === 'warning');

  const selectedCategories = new Set(build.map((item) => item.category));
  const missingCategories = REQUIRED_CATEGORIES.filter((c) => !selectedCategories.has(c));

  let status: BuildCompatibility;
  if (failures.length > 0) status = 'incompatible';
  else if (missingCategories.length > 0) status = 'incomplete';
  else if (warnings.length > 0) status = 'warnings';
  else status = 'compatible';

  return { status, checks, failures, warnings, missingCategories, power };
}

export function compatibilityHeadline(report: CompatibilityReport): string {
  switch (report.status) {
    case 'incompatible':
      return report.failures.length === 1
        ? '1 compatibility problem'
        : `${report.failures.length} compatibility problems`;
    case 'warnings':
      return report.warnings.length === 1 ? '1 warning' : `${report.warnings.length} warnings`;
    case 'incomplete': {
      const missing = report.missingCategories.map((c) => CATEGORY_LABELS[c]);
      return `Still needed: ${missing.join(', ')}`;
    }
    case 'compatible':
      return 'All checks passed';
  }
}
