import type { PublicComponent } from '@/lib/catalog/types';

/**
 * The two or three numbers that actually matter when choosing a part in each
 * category. Kept short: a wall of specs is noise at selection time, and the
 * full sheet is one click away.
 */
export function specChips(component: PublicComponent): string[] {
  const chips: string[] = [];
  const s = component.specs ?? {};

  switch (component.category) {
    case 'cpu':
      if (component.socket) chips.push(component.socket);
      if (typeof s.cores === 'number') chips.push(`${s.cores} cores`);
      if (component.tdp_watts) chips.push(`${component.tdp_watts} W`);
      break;
    case 'motherboard':
      if (component.form_factor) chips.push(component.form_factor.toUpperCase());
      if (component.chipset) chips.push(component.chipset);
      if (component.memory_type) chips.push(component.memory_type.toUpperCase());
      if (component.m2_slots) chips.push(`${component.m2_slots}x M.2`);
      break;
    case 'cooler':
      chips.push(component.cooler_type === 'aio' ? 'Liquid' : 'Air');
      if (component.radiator_size_mm?.length) chips.push(`${component.radiator_size_mm[0]} mm`);
      if (component.cooler_height_mm) chips.push(`${component.cooler_height_mm} mm tall`);
      if (component.cooling_capacity_watts) chips.push(`~${component.cooling_capacity_watts} W`);
      break;
    case 'ram':
      if (component.memory_capacity_gb && component.memory_modules)
        chips.push(`${component.memory_capacity_gb} GB (${component.memory_modules}x)`);
      if (component.memory_speed_mts) chips.push(`${component.memory_speed_mts} MT/s`);
      if (typeof s.cas_latency === 'string') chips.push(s.cas_latency);
      break;
    case 'gpu':
      if (typeof s.vram_gb === 'number') chips.push(`${s.vram_gb} GB`);
      if (component.gpu_length_mm) chips.push(`${component.gpu_length_mm} mm`);
      if (component.tdp_watts) chips.push(`${component.tdp_watts} W`);
      break;
    case 'storage':
      if (component.storage_capacity_gb)
        chips.push(
          component.storage_capacity_gb >= 1000
            ? `${component.storage_capacity_gb / 1000} TB`
            : `${component.storage_capacity_gb} GB`,
        );
      chips.push(component.storage_interface === 'nvme-m2' ? 'NVMe M.2' : 'SATA');
      if (typeof s.form_factor === 'string') chips.push(s.form_factor);
      break;
    case 'psu':
      if (component.psu_wattage) chips.push(`${component.psu_wattage} W`);
      if (component.psu_efficiency) chips.push(component.psu_efficiency);
      if (component.psu_form_factor) chips.push(component.psu_form_factor.toUpperCase());
      break;
    case 'case':
      if (component.supported_form_factors?.length)
        chips.push(component.supported_form_factors[0].toUpperCase());
      if (component.max_gpu_length_mm) chips.push(`GPU ${component.max_gpu_length_mm} mm`);
      if (component.max_cooler_height_mm) chips.push(`Cooler ${component.max_cooler_height_mm} mm`);
      break;
    case 'os':
      if (typeof s.edition === 'string') chips.push(s.edition);
      break;
    default:
      break;
  }

  return chips;
}

/** Full spec sheet for the detail view. */
export function specRows(component: PublicComponent): { term: string; value: string }[] {
  const rows: { term: string; value: string }[] = [];
  const push = (term: string, value: string | number | null | undefined, suffix = '') => {
    if (value === null || value === undefined || value === '') return;
    rows.push({ term, value: `${value}${suffix}` });
  };

  push('SKU', component.sku);
  push('Socket', component.socket);
  push('Supported sockets', component.supported_sockets?.join(', '));
  push('Chipset', component.chipset);
  push('Form factor', component.form_factor?.toUpperCase());
  push('Supports boards', component.supported_form_factors?.join(', ').toUpperCase());
  push('Memory type', component.memory_type?.toUpperCase());
  push('Memory slots', component.memory_slots);
  push('Maximum memory', component.max_memory_gb, ' GB');
  push('Capacity', component.memory_capacity_gb, ' GB');
  push('Modules', component.memory_modules);
  push('Speed', component.memory_speed_mts, ' MT/s');
  push('M.2 slots', component.m2_slots);
  push('SATA ports', component.sata_ports);
  push('PCIe generation', component.pcie_version);
  push('Power draw', component.tdp_watts, ' W');
  push('Cooling capacity', component.cooling_capacity_watts, ' W');
  push('Recommended supply', component.recommended_psu_watts, ' W');
  push('Capacity', component.psu_wattage, ' W');
  push('Efficiency', component.psu_efficiency);
  push('PSU form factor', component.psu_form_factor?.toUpperCase());
  push('Card length', component.gpu_length_mm, ' mm');
  push('Maximum card length', component.max_gpu_length_mm, ' mm');
  push('Cooler height', component.cooler_height_mm, ' mm');
  push('Maximum cooler height', component.max_cooler_height_mm, ' mm');
  push('Radiator support', component.radiator_support_mm?.join(', '), ' mm');
  push('Radiator size', component.radiator_size_mm?.join(', '), ' mm');
  push('Cooler type', component.cooler_type === 'aio' ? 'Liquid (AIO)' : component.cooler_type === 'air' ? 'Air' : null);
  push('Interface', component.storage_interface === 'nvme-m2' ? 'NVMe M.2' : component.storage_interface?.toUpperCase());
  push('Drive capacity', component.storage_capacity_gb, ' GB');

  for (const [key, value] of Object.entries(component.specs ?? {})) {
    const label = key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    rows.push({ term: label, value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) });
  }

  return rows;
}
