import type { ListComponentsOptions } from '@/lib/catalog/repository';

/**
 * Storefront collections.
 *
 * A collection is a page that lists CATALOGUE ROWS, as opposed to /gaming-pcs
 * and /workstations which list build presets. Networking gear, NAS enclosures
 * and mini PCs are sold as finished units, so there is nothing to configure and
 * nothing for the compatibility engine to check — the page is a product list.
 *
 * Each definition owns its copy and its queries so the three routes stay thin
 * files. They are separate routes rather than one /shop/[slug] because the URLs
 * are worth having as plain words, and because each one wants its own metadata
 * and its own set of buying notes.
 */

export interface CollectionGroup {
  heading: string;
  description: string;
  query: ListComponentsOptions;
  /** Shown when the query comes back empty. */
  emptyMessage: string;
}

export interface ShopCollection {
  slug: string;
  /** Label in the site header. */
  nav: string;
  eyebrow: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  /** The main product list, and an optional related list beneath it. */
  primary: CollectionGroup;
  secondary?: CollectionGroup;
  /** Buying guidance. Written to be useful, not to pad the page. */
  notes: { title: string; body: string }[];
}

export const SHOP_COLLECTIONS: ShopCollection[] = [
  {
    slug: 'networking',
    nav: 'Networking',
    eyebrow: 'Networking & server',
    title: 'Switches and network gear',
    description:
      'Managed and smart switches for segmenting a home or small-office network, adding PoE, or getting past a gigabit bottleneck. Sold as units — tell us what the network has to do and we will say which one fits.',
    metaTitle: 'Networking & Server Hardware',
    metaDescription:
      'Managed and PoE network switches supplied and configured in Canada. Smart switches for VLANs, PoE for access points and cameras, and 2.5GbE for NAS and workstation links.',
    primary: {
      heading: 'Switches',
      description:
        'Prices are for the hardware. Configuration — VLANs, port profiles, PoE budgets — is a service; ask for a quote and we will scope it.',
      query: { category: 'networking' },
      emptyMessage: 'No networking hardware is listed yet.',
    },
    notes: [
      {
        title: 'Smart beats unmanaged the moment you want VLANs',
        body: 'An unmanaged switch moves frames and nothing else. The moment you want guest traffic, cameras or IoT kept away from your own machines, you need VLAN support, and that is the line between the two price brackets.',
      },
      {
        title: 'PoE budget is a total, not a per-port figure',
        body: 'A 64 W budget across four ports does not mean 64 W each. Add up what every device actually draws, then leave headroom — a switch that browns out under load is harder to diagnose than one that never had enough.',
      },
      {
        title: '2.5GbE is worth it between two specific machines',
        body: 'Upgrading a whole network to 2.5G rarely pays. Upgrading the link between a NAS and the one workstation that copies large files off it usually does, and a five-port switch is enough to do only that.',
      },
      {
        title: 'Cabling is usually the real limit',
        body: 'Cat 5e will carry 2.5GbE over normal household runs, so the cable is often fine. What is not fine is a crushed run, a hand-terminated keystone or a cheap patch lead. If throughput is short of the port speed, suspect the copper first.',
      },
    ],
  },

  {
    slug: 'nas',
    nav: 'NAS builds',
    eyebrow: 'NAS & network storage',
    title: 'Network storage, built and populated',
    description:
      'Enclosures and the drives that belong in them. We can supply the unit bare, or build it out with a redundant array, shares and scheduled backups configured before it reaches you.',
    metaTitle: 'NAS Builds & Network Storage',
    metaDescription:
      'NAS enclosures and NAS-rated drives supplied in Canada, assembled and configured on request. Redundant arrays, shares and backup schedules set up before delivery.',
    primary: {
      heading: 'Enclosures',
      description:
        'Every unit here is sold diskless. Pick drives below, or bring your own — we will tell you honestly whether they are suited to continuous operation.',
      query: { category: 'nas' },
      emptyMessage: 'No NAS enclosures are listed yet.',
    },
    secondary: {
      heading: 'NAS-rated drives',
      description:
        'Rated for continuous operation and for the vibration of sitting next to three other spinning drives. A desktop drive in a NAS bay is a false economy.',
      query: { category: 'storage', specFlag: { key: 'nas_rated', value: true } },
      emptyMessage: 'No NAS-rated drives are listed yet.',
    },
    notes: [
      {
        title: 'RAID is not a backup',
        body: 'A mirror survives a dead drive. It does not survive a deleted folder, ransomware, a failed power supply taking both drives with it, or a house fire. Plan a copy that leaves the building; we will set the schedule up with the unit.',
      },
      {
        title: 'Buy CMR drives, not SMR',
        body: 'Shingled drives rewrite neighbouring tracks to commit a write, which collapses their performance during a RAID rebuild — the one moment the array is already vulnerable. Every drive we list for NAS duty says which it is.',
      },
      {
        title: 'Two bays is a mirror; four bays can grow',
        body: 'With two bays your only redundant option is a mirror, and expanding means replacing both drives. Four bays lets you run single-drive redundancy and add capacity later, which is usually the cheaper path over the unit’s life.',
      },
      {
        title: 'Usable capacity is well under the sticker',
        body: 'Four 8 TB drives with single-drive redundancy give roughly 21 TiB usable, not 32 TB: redundancy takes a drive, and the decimal-to-binary conversion takes about 9% more. Work from the usable figure when sizing.',
      },
    ],
  },

  {
    slug: 'mini-pcs',
    nav: 'Mini PCs & Pi',
    eyebrow: 'Mini PCs & single-board',
    title: 'Mini PCs and Raspberry Pi setups',
    description:
      'Small always-on machines: barebones x86 mini PCs, and Raspberry Pi boards with the parts that actually make them usable. We can supply the board alone or deliver it imaged, cooled and configured for the job.',
    metaTitle: 'Mini PCs & Raspberry Pi Setups',
    metaDescription:
      'Mini PCs and Raspberry Pi boards supplied in Canada, with cooling, power and NVMe storage. Supplied bare or imaged and configured for home automation, Pi-hole, media or a small server.',
    primary: {
      heading: 'Boards and mini PCs',
      description:
        'Barebones means no memory, no drive and no operating system. A Pi board means exactly the board. Both are noted per item so nothing arrives as a surprise.',
      query: { category: 'mini-pc', specFlag: { key: 'sbc_accessory', value: false } },
      emptyMessage: 'No mini PCs or boards are listed yet.',
    },
    secondary: {
      heading: 'Essentials and accessories',
      description:
        'The parts a single-board computer needs before it does anything useful. Cooling and a proper power supply are not optional extras on a Pi 5.',
      query: { category: 'mini-pc', specFlag: { key: 'sbc_accessory', value: true } },
      emptyMessage: 'No accessories are listed yet.',
    },
    notes: [
      {
        title: 'A Pi 5 needs active cooling to hold its clocks',
        body: 'Without a heatsink and fan it will throttle under sustained load, and the benchmark you read will not be the performance you get. Budget the cooler in from the start rather than diagnosing slowness later.',
      },
      {
        title: 'Use the official power supply',
        body: 'A Pi 5 only raises its USB port current budget from roughly 600 mA to 1.6 A when it detects a proper Power Delivery supply. A generic charger will boot the board and then quietly starve whatever you plug into it.',
      },
      {
        title: 'Boot from NVMe, not microSD',
        body: 'A microSD card under constant writes — logs, a database, a container host — will wear out, usually without warning. An M.2 HAT and a small NVMe drive costs little and removes the most common cause of a dead Pi project.',
      },
      {
        title: 'Barebones means three more purchases',
        body: 'A barebones mini PC ships as a chassis, board and cooler. Memory, storage and a licensed operating system are all on you. That is often cheaper and always more flexible than a prebuilt, but price the whole thing before comparing.',
      },
    ],
  },
];

export function collectionBySlug(slug: string): ShopCollection {
  const found = SHOP_COLLECTIONS.find((c) => c.slug === slug);
  // A missing slug is a programming error, not a bad request: these routes are
  // static files that each name their own collection.
  if (!found) throw new Error(`Unknown shop collection: ${slug}`);
  return found;
}
