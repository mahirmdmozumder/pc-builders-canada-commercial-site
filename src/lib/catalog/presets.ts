import type { SavedBuildItem } from '@/types/domain';
import type { ComponentCategory } from '@/lib/catalog/types';

/**
 * Starting configurations.
 *
 * These are spec templates, not a record of past work: each one is a list of
 * catalogue parts a customer can load into the configurator and then change.
 * Their prices are computed live from the catalogue, so a preset can never
 * drift from what the parts actually cost.
 *
 * Nothing here claims a build was sold, shipped or benchmarked. Completed
 * work lives in the portfolio, which is populated from the admin side.
 */

export type PresetAudience = 'gaming' | 'workstation';

export interface BuildPreset {
  slug: string;
  name: string;
  audience: PresetAudience;
  /** One line on who the configuration is for. */
  tagline: string;
  /** What the part choices are actually optimising for. */
  rationale: string;
  /** Short, checkable claims about the configuration itself. */
  highlights: string[];
  items: SavedBuildItem[];
}

function items(entries: [ComponentCategory, string, number?][]): SavedBuildItem[] {
  return entries.map(([category, component_id, quantity]) => ({
    category,
    component_id,
    quantity: quantity ?? 1,
  }));
}

export const BUILD_PRESETS: BuildPreset[] = [
  {
    slug: 'starter-1080p',
    name: 'Ascent 1080p',
    audience: 'gaming',
    tagline: 'A first custom build for high-refresh 1080p play.',
    rationale:
      'Spends where frame rate comes from and nowhere else: a current six-core processor, a card sized for 1080p, and a board on the AM5 socket so the processor can be replaced later without changing anything else.',
    highlights: [
      'AM5 platform, so a processor upgrade does not mean a new board',
      '16 GB DDR5 in two modules, leaving two slots free',
      'Air cooled, which keeps the part count and the noise down',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-5-7600x'],
      ['motherboard', 'mb-asrock-b650m-pro-rs'],
      ['cooler', 'cool-thermalright-pa120-se'],
      ['ram', 'ram-kingston-fury-16gb-ddr5-5600'],
      ['gpu', 'gpu-asus-prime-rtx-5060-ti'],
      ['storage', 'ssd-wd-black-sn850x-1tb'],
      ['psu', 'psu-msi-mag-a650bn'],
      ['case', 'case-nzxt-h5-flow'],
      ['os', 'os-windows-11-home'],
    ]),
  },
  {
    slug: 'gaming-1440p',
    name: 'Meridian 1440p',
    audience: 'gaming',
    tagline: 'High-refresh 1440p with room to grow.',
    rationale:
      'The configuration most gaming customers end up at. A cache-heavy gaming processor, a 16 GB card for 1440p, and a power supply with enough headroom that a bigger card later does not mean a second purchase.',
    highlights: [
      '32 GB DDR5-6000 in two modules',
      '2 TB NVMe boot drive, no secondary drive needed on day one',
      '850 W supply leaves headroom for a larger card later',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-9800x3d'],
      ['motherboard', 'mb-asus-rog-strix-b850-f'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-corsair-vengeance-32gb-ddr5-6000'],
      ['gpu', 'gpu-gigabyte-rtx-5070-ti'],
      ['storage', 'ssd-samsung-990-pro-2tb'],
      ['psu', 'psu-be-quiet-pure-power-12m-850'],
      ['case', 'case-corsair-4000d-airflow'],
      ['os', 'os-windows-11-home'],
    ]),
  },
  {
    slug: 'gaming-4k',
    name: 'Summit 4K',
    audience: 'gaming',
    tagline: 'Built around the fastest card the budget allows.',
    rationale:
      'At 4K the graphics card sets the ceiling, so the rest of the build exists to keep it fed and cool: a 360 mm radiator, a case with real clearance, and a supply sized with headroom above the estimated draw.',
    highlights: [
      'Dual-chamber case with room for a long card and a 360 mm radiator',
      '1000 W supply against an estimated draw well under it',
      '4 TB of NVMe storage across two drives',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-9800x3d'],
      ['motherboard', 'mb-msi-mag-x870-tomahawk'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-corsair-vengeance-32gb-ddr5-6000'],
      ['gpu', 'gpu-msi-ventus-rtx-5080'],
      ['storage', 'ssd-samsung-990-pro-2tb', 2],
      ['psu', 'psu-corsair-rm1000x'],
      ['case', 'case-lian-li-o11d-evo'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'creator-workstation',
    name: 'Studio 16C',
    audience: 'workstation',
    tagline: 'Rendering, editing and compile jobs that scale with cores.',
    rationale:
      'Sixteen cores and 64 GB of memory, because export and build times respond to both. Storage is split so the scratch drive is not competing with the OS.',
    highlights: [
      '16-core processor for export, render and compile work',
      '64 GB DDR5 with two slots still free',
      'Separate OS and project drives',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-9-9950x'],
      ['motherboard', 'mb-msi-mag-x870-tomahawk'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-gskill-trident-z5-64gb-ddr5-6000'],
      ['gpu', 'gpu-msi-ventus-rtx-5070'],
      ['storage', 'ssd-samsung-990-pro-2tb'],
      ['storage', 'ssd-crucial-p3-plus-4tb'],
      ['psu', 'psu-corsair-rm1000x'],
      ['case', 'case-fractal-meshify-2'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'engineering-workstation',
    name: 'Atlas 96',
    audience: 'workstation',
    tagline: 'Large datasets, simulation and heavy virtualisation.',
    rationale:
      'Memory capacity first. 96 GB covers datasets and several virtual machines at once, on a platform with the PCIe lanes and M.2 slots to add storage later.',
    highlights: [
      '96 GB DDR5 across two modules',
      'Five M.2 slots on the board for future storage',
      'Titanium-rated supply for a machine that runs long jobs',
    ],
    items: items([
      ['cpu', 'cpu-intel-core-ultra-9-285k'],
      ['motherboard', 'mb-msi-mpg-z890-carbon'],
      ['cooler', 'cool-corsair-icue-h150i'],
      ['ram', 'ram-crucial-pro-96gb-ddr5-5600'],
      ['gpu', 'gpu-sapphire-rx-9070-xt'],
      ['storage', 'ssd-samsung-990-pro-2tb'],
      ['storage', 'ssd-crucial-p3-plus-4tb'],
      ['psu', 'psu-seasonic-prime-tx-1300'],
      ['case', 'case-fractal-meshify-2'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'compact-itx',
    name: 'Transit ITX',
    audience: 'gaming',
    tagline: 'Full performance in a case that fits in a backpack.',
    rationale:
      'Small-form-factor builds are constrained by clearance before anything else, so every part here is chosen against the case: a short card, a 240 mm radiator, and an SFX supply.',
    highlights: [
      'Mini-ITX board and SFX power supply',
      'Card and cooler chosen against the case clearance figures',
      '18 litre case volume',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-7800x3d'],
      ['motherboard', 'mb-asus-rog-strix-b850-i'],
      ['cooler', 'cool-nzxt-kraken-240'],
      ['ram', 'ram-corsair-vengeance-32gb-ddr5-6000'],
      ['gpu', 'gpu-asus-prime-rtx-5060-ti'],
      ['storage', 'ssd-samsung-990-pro-2tb'],
      ['psu', 'psu-corsair-sf750'],
      ['case', 'case-cooler-master-nr200p'],
      ['os', 'os-windows-11-home'],
    ]),
  },
];

export function getPreset(slug: string): BuildPreset | undefined {
  return BUILD_PRESETS.find((p) => p.slug === slug);
}

export function presetsFor(audience: PresetAudience): BuildPreset[] {
  return BUILD_PRESETS.filter((p) => p.audience === audience);
}
