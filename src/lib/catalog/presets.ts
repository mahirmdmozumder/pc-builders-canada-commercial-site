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
      'Spends where frame rate comes from and nowhere else: a current six-core processor, a card with enough memory to age well, and a board on the AM5 socket so the processor can be replaced later without changing anything else.',
    highlights: [
      'AM5 platform, so a processor upgrade does not mean a new board',
      '16 GB of memory in two modules, leaving two slots free',
      'Air cooled, which keeps the part count and the noise down',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-5-7600x'],
      ['motherboard', 'mb-asus-rog-strix-b850-f'],
      ['cooler', 'cool-deepcool-ak620-g2'],
      ['ram', 'ram-xpg-lancer-blade-16gb-ddr5-5600'],
      ['gpu', 'gpu-msi-rtx-5060-ti-16g'],
      ['storage', 'ssd-kingston-nv3-1tb'],
      ['psu', 'psu-deepcool-pn650m'],
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
      'The configuration most gaming customers end up at. A cache-heavy gaming processor, a 16 GB card sized for 1440p, and a power supply with enough headroom that a bigger card later does not mean a second purchase.',
    highlights: [
      '32 GB of low-latency DDR5-6000 CL30',
      '2 TB NVMe boot drive, no secondary drive needed on day one',
      '850 W supply leaves headroom for a larger card later',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-9800x3d'],
      ['motherboard', 'mb-asus-rog-strix-b850-f'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-teamgroup-vulcan-32gb-ddr5-6000'],
      ['gpu', 'gpu-sapphire-rx-9070-xt'],
      ['storage', 'ssd-wd-black-sn850x-2tb'],
      ['psu', 'psu-deepcool-pn850m'],
      ['case', 'case-corsair-frame-4000d-rs'],
      ['os', 'os-windows-11-home'],
    ]),
  },
  {
    slug: 'gaming-4k',
    name: 'Summit 4K',
    audience: 'gaming',
    tagline: 'Built around the fastest card the budget allows.',
    rationale:
      'At 4K the graphics card sets the ceiling, so the rest of the build exists to keep it fed and cool: a 360 mm radiator, a case with real clearance for a 340 mm card, and a supply sized with headroom above the estimated draw.',
    highlights: [
      'Dual-chamber case with room for a long card and a 360 mm radiator',
      '1000 W supply against an estimated draw well under it',
      '6 TB of NVMe storage across two drives',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-9800x3d'],
      ['motherboard', 'mb-msi-mag-x870-tomahawk'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-teamgroup-vulcan-32gb-ddr5-6000'],
      ['gpu', 'gpu-gigabyte-rtx-5080-gaming-oc'],
      ['storage', 'ssd-wd-black-sn850x-2tb'],
      ['storage', 'ssd-wd-black-sn7100-4tb'],
      ['psu', 'psu-deepcool-pn1000m'],
      ['case', 'case-lian-li-o11d-evo-rgb'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'creator-workstation',
    name: 'Studio 16C',
    audience: 'workstation',
    tagline: 'Rendering, editing and compile jobs that scale with cores.',
    rationale:
      'Sixteen cores and 64 GB of memory, because export and build times respond to both. Storage is split so the project drive is not competing with the operating system.',
    highlights: [
      '16-core processor for export, render and compile work',
      '64 GB of DDR5 with two slots still free',
      'Separate operating system and project drives',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-9-9950x'],
      ['motherboard', 'mb-msi-mag-x870-tomahawk'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-teamgroup-delta-64gb-ddr5-6000'],
      ['gpu', 'gpu-msi-rtx-5060-ti-16g'],
      ['storage', 'ssd-wd-black-sn850x-2tb'],
      ['storage', 'ssd-wd-black-sn7100-4tb'],
      ['psu', 'psu-deepcool-pn1000m'],
      ['case', 'case-corsair-frame-4000d-rs'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'engineering-workstation',
    name: 'Atlas 24C',
    audience: 'workstation',
    tagline: 'Large datasets, simulation and heavy virtualisation.',
    rationale:
      'Core count and memory capacity first, on a platform with five M.2 slots so storage can be added without replacing anything. A job that fits in memory finishes; one that spills to disk takes an order of magnitude longer.',
    highlights: [
      '24 cores on the LGA1851 platform',
      '64 GB of DDR5, expandable to 256 GB on this board',
      'Five M.2 slots on the board for future storage',
    ],
    items: items([
      ['cpu', 'cpu-intel-core-ultra-9-285k'],
      ['motherboard', 'mb-msi-mpg-z890-carbon'],
      ['cooler', 'cool-arctic-liquid-freezer-iii-360'],
      ['ram', 'ram-teamgroup-delta-64gb-ddr5-6000'],
      ['gpu', 'gpu-sapphire-rx-9070-xt'],
      ['storage', 'ssd-wd-black-sn850x-2tb'],
      ['storage', 'ssd-wd-black-sn7100-4tb'],
      ['psu', 'psu-gigabyte-ud1300gm'],
      ['case', 'case-lian-li-o11d-evo-rgb'],
      ['os', 'os-windows-11-pro'],
    ]),
  },
  {
    slug: 'compact-itx',
    name: 'Transit ITX',
    audience: 'gaming',
    tagline: 'A mini-ITX board in a case that still takes a full-size card.',
    rationale:
      'Small-form-factor builds are constrained by clearance before anything else. This pairs a mini-ITX board with a case that accepts it, so the board footprint shrinks without forcing compromises on the card or the cooler.',
    highlights: [
      'Mini-ITX board with Wi-Fi 7 and a PCIe 5.0 graphics slot',
      'Two memory slots, so one 32 GB kit fills it',
      'Card and cooler checked against the case clearance figures',
    ],
    items: items([
      ['cpu', 'cpu-amd-ryzen-7-7800x3d'],
      ['motherboard', 'mb-asus-rog-strix-b850-i'],
      ['cooler', 'cool-deepcool-ak620-g2'],
      ['ram', 'ram-teamgroup-vulcan-32gb-ddr5-6000'],
      ['gpu', 'gpu-msi-rtx-5060-ti-16g'],
      ['storage', 'ssd-wd-black-sn850x-1tb'],
      ['psu', 'psu-deepcool-pn750m'],
      ['case', 'case-nzxt-h5-flow'],
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
