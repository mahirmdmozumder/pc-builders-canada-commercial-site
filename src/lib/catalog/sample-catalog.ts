import type { ComponentRecord } from '@/lib/catalog/types';

/**
 * CATALOGUE
 * ---------
 * Checked against Canadian retail on 2026-09-18.
 *
 * Every row marked `data_confidence: 'verified'` had its price AND its
 * compatibility-critical fields (socket, form factor, clearances, capacity)
 * read from a retailer or manufacturer listing on that date. Rows still
 * marked 'sample' have at least one figure that was not confirmed; the note
 * on each says which one, and the storefront labels them as unverified.
 *
 * Prices are Canadian retail at the time of checking, recorded in each row's
 * `specs.price_checked`. They are a starting point, not a margin model:
 * `cost_cents` is deliberately null because this business does not yet have
 * distributor pricing, and inventing a cost would produce a fake margin
 * column in the admin.
 *
 * Two things move fast and should be re-checked before any serious trading:
 *   - Memory and storage pricing, which rose sharply through 2026.
 *   - Graphics card availability, which churns monthly. Several models that
 *     were stocked at the last revision had already been discontinued.
 *
 * Component ids are readable slugs rather than UUIDs on purpose: saved builds
 * and order snapshots store these ids as JSON, and a human-readable id makes
 * support tickets and database inspection far easier. See docs/database.md.
 */

type ComponentSeed = Partial<ComponentRecord> &
  Pick<
    ComponentRecord,
    'id' | 'sku' | 'category' | 'brand' | 'model' | 'description' | 'price_cents'
  >;

const NOW = '2026-09-18T00:00:00.000Z';
const CHECKED = '2026-09-18';

/**
 * The networking, NAS and mini-PC rows were added later, so they carry their
 * own check date. Mixing the two under one constant would have back-dated
 * seventeen prices that were never checked on the earlier date.
 */
const UNITS_ADDED = '2026-09-27T00:00:00.000Z';
const CHECKED_UNITS = '2026-09-27';

/**
 * Graphics cards added on 2026-10-05, with their own check date for the same
 * reason the whole-unit rows carry one. GPU pricing moves monthly, and sharing
 * an older constant would back-date prices that were never checked then.
 *
 * Every price below was read from the Canada Computers product listing on that
 * date, not from a price-aggregator summary. Three separate aggregator figures
 * were checked against the retailer page first and all three were wrong, by
 * $40, $130 and $150 — so the retailer page is the only source used here.
 */
const GPUS_ADDED = '2026-10-05T00:00:00.000Z';
const CHECKED_GPUS = '2026-10-05';

/**
 * Processors added on 2026-10-06.
 *
 * Prices are the Canada Computers REGULAR price, with any sale seen on the day
 * recorded in specs.sale_price_observed. That follows the convention the
 * networking rows set: the regular price is the one that survives the week, and
 * listing a sale price as if it were the standing price means honouring it
 * after the sale ends.
 *
 * Socket and TDP came from the retailer's own product title where it states
 * them, and from the Zen 5 specification table where it does not. Neither was
 * written from memory, because the socket figure is what the compatibility
 * engine matches against the motherboard and a wrong one would pass a build
 * that cannot be assembled.
 */
const CPUS_ADDED = '2026-10-06T00:00:00.000Z';
const CHECKED_CPUS = '2026-10-06';

/**
 * Storage, power supplies and memory checked the same day as the processors.
 *
 * Aliases rather than repeated literals, so the date cannot be updated in one
 * place and missed in another.
 */
const PARTS_ADDED = CPUS_ADDED;
const CHECKED_PARTS = CHECKED_CPUS;

function component(seed: ComponentSeed): ComponentRecord {
  return {
    slug: seed.id,
    // No distributor pricing yet, so there is no honest cost figure to record.
    cost_cents: null,
    // Nominal opening stock so the storefront is usable. These are NOT real
    // counts: set them from /admin/inventory against what is actually on the
    // shelf before trading.
    stock_quantity: 5,
    low_stock_threshold: 3,
    image_url: null,
    gallery_urls: [],
    // No product photography or video for the reference catalogue. The storefront
    // draws an honest placeholder rather than borrowing a manufacturer render.
    video_url: null,
    active: true,
    status: 'published',
    featured: false,
    sort_order: 0,
    short_description: null,
    seo_title: null,
    seo_description: null,
    archived_at: null,
    data_confidence: 'verified',
    // Everything seeded here is new stock. Refurbished and open-box units are
    // entered through /admin/components, where the condition notes are
    // mandatory, because those notes describe a specific physical unit and
    // cannot honestly be seeded from a template.
    condition: 'new',
    condition_notes: null,
    socket: null,
    supported_sockets: null,
    chipset: null,
    memory_slots: null,
    max_memory_gb: null,
    m2_slots: null,
    sata_ports: null,
    form_factor: null,
    supported_form_factors: null,
    memory_type: null,
    memory_capacity_gb: null,
    memory_modules: null,
    memory_speed_mts: null,
    tdp_watts: null,
    recommended_psu_watts: null,
    psu_wattage: null,
    psu_efficiency: null,
    psu_form_factor: null,
    gpu_length_mm: null,
    max_gpu_length_mm: null,
    cooler_height_mm: null,
    max_cooler_height_mm: null,
    radiator_support_mm: null,
    radiator_size_mm: null,
    cooler_type: null,
    cooling_capacity_watts: null,
    storage_interface: null,
    storage_capacity_gb: null,
    pcie_version: null,
    specs: {},
    created_at: NOW,
    updated_at: NOW,
    ...seed,
  } as ComponentRecord;
}

export const SAMPLE_COMPONENTS: ComponentRecord[] = [
  // -------------------------------------------------------------------------
  // Processors
  // -------------------------------------------------------------------------
  component({
    id: 'cpu-amd-ryzen-5-7600x',
    sku: 'CPU-AMD-7600X',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 5 7600X',
    description:
      'Six-core AM5 processor for 1080p and 1440p gaming. A sensible floor for a new system that still leaves an upgrade path on the AM5 socket.',
    price_cents: 20988,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 105,
    pcie_version: 5,
    specs: {
      cores: 6,
      threads: 12,
      integrated_graphics: true,
      cooler_included: false,
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-7-7800x3d',
    sku: 'CPU-AMD-7800X3D',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 7 7800X3D',
    description:
      'Eight-core AM5 processor with stacked cache. Aimed at high-framerate gaming, where cache-sensitive titles benefit most.',
    price_cents: 60999,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 120,
    pcie_version: 5,
    specs: {
      cores: 8,
      threads: 16,
      cache: '104 MB total, 3D V-Cache',
      integrated_graphics: true,
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-7-9800x3d',
    sku: 'CPU-AMD-9800X3D',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 7 9800X3D',
    description:
      'Current-generation eight-core AM5 gaming processor with stacked cache. The default choice in most high-framerate gaming builds.',
    price_cents: 68900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 120,
    pcie_version: 5,
    specs: {
      cores: 8,
      threads: 16,
      cache: '104 MB total, second-generation 3D V-Cache',
      integrated_graphics: true,
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-9-9950x',
    sku: 'CPU-AMD-9950X',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 9 9950X',
    description:
      'Sixteen-core AM5 processor for rendering, compilation and multi-track production, where core count is the bottleneck.',
    price_cents: 89900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 170,
    pcie_version: 5,
    specs: { cores: 16, threads: 32, integrated_graphics: true, price_checked: CHECKED },
  }),
  component({
    id: 'cpu-intel-core-ultra-5-245k',
    sku: 'CPU-INT-U5245K',
    category: 'cpu',
    brand: 'Intel',
    model: 'Core Ultra 5 245K',
    description:
      'Mid-range LGA1851 processor for mixed gaming and productivity, with integrated graphics for troubleshooting without a card fitted.',
    price_cents: 28999,
    socket: 'LGA1851',
    memory_type: 'ddr5',
    tdp_watts: 125,
    pcie_version: 5,
    specs: {
      cores: '14 (6P + 8E)',
      integrated_graphics: true,
      max_turbo_power_watts: 159,
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'cpu-intel-core-ultra-7-265k',
    sku: 'CPU-INT-U7265K',
    category: 'cpu',
    brand: 'Intel',
    model: 'Core Ultra 7 265K',
    description:
      'Twenty-core LGA1851 processor balancing gaming performance against heavily threaded creative work.',
    price_cents: 47999,
    socket: 'LGA1851',
    memory_type: 'ddr5',
    tdp_watts: 125,
    pcie_version: 5,
    specs: { cores: '20 (8P + 12E)', integrated_graphics: true, price_checked: CHECKED },
  }),
  component({
    id: 'cpu-intel-core-ultra-9-285k',
    sku: 'CPU-INT-U9285K',
    category: 'cpu',
    brand: 'Intel',
    model: 'Core Ultra 9 285K',
    description:
      'Flagship LGA1851 processor for workstation duty: simulation, rendering and large compile jobs.',
    price_cents: 89999,
    socket: 'LGA1851',
    memory_type: 'ddr5',
    tdp_watts: 125,
    pcie_version: 5,
    specs: {
      cores: '24 (8P + 16E)',
      integrated_graphics: true,
      chipset_support: 'B860, H810, H870, Z890',
      price_checked: CHECKED,
    },
  }),

  // The six rows below were added on 2026-10-06, deepening the two platforms
  // already sold here rather than opening a third. A new socket is not a row,
  // it is a row plus a motherboard plus memory: adding an LGA1700 processor
  // without an LGA1700 board would put a part in the configurator that cannot
  // reach a complete build, which is worse than not listing it.
  //
  // An AM4 Ryzen 7 5700X was written and then removed, which is the same rule
  // applied to itself. scripts/verify-catalog-builds.ts reported it stranded:
  // this catalogue has no AM4 motherboard, so the part was selectable with no
  // route to a finished machine. Completing AM4 needs a board whose M.2 and
  // SATA counts are confirmed, because the storage check counts drives against
  // them, and a guessed count fails quietly rather than loudly. AM4 is worth a
  // batch of its own: processor, board and a DDR4 kit, verified together.
  component({
    id: 'cpu-amd-ryzen-5-9600x',
    sku: 'CPU-AMD-R59600X',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 5 9600X',
    description:
      'Six-core Zen 5 processor and the sensible floor for a new AM5 build. 65 W, so a modest cooler is enough.',
    price_cents: 39900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 65,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    specs: {
      cores: 6,
      threads: 12,
      integrated_graphics: true,
      source: 'Canada Computers',
      sale_price_observed: '$279.98 on 2026-10-06',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-7-9700x',
    sku: 'CPU-AMD-R79700X',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 7 9700X',
    description:
      'Eight-core Zen 5 processor at 65 W. The all-round choice when the build is as much work as it is games.',
    price_cents: 51900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 65,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    specs: {
      cores: 8,
      threads: 16,
      integrated_graphics: true,
      source: 'Canada Computers',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-9-9900x',
    sku: 'CPU-AMD-R99900X',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 9 9900X',
    description:
      'Twelve cores for rendering, compiling and anything that scales past eight. 120 W, so plan the cooler around it.',
    price_cents: 64900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 120,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    specs: {
      cores: 12,
      threads: 24,
      integrated_graphics: true,
      source: 'Canada Computers',
      sale_price_observed: '$519.99 on 2026-10-06',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-9-9900x3d',
    sku: 'CPU-AMD-R99900X3D',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 9 9900X3D',
    description:
      'Twelve cores with 3D V-Cache: gaming performance close to the 9800X3D without giving up the core count for work.',
    price_cents: 84900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 120,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    specs: {
      cores: 12,
      threads: 24,
      cache: '140 MB total',
      integrated_graphics: true,
      source: 'Canada Computers',
      sale_price_observed: '$799.99 on 2026-10-06',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'cpu-amd-ryzen-9-9950x3d',
    sku: 'CPU-AMD-R99950X3D',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 9 9950X3D',
    description:
      'Sixteen cores with 3D V-Cache. The one to pick when the same machine has to game and earn its keep. 170 W.',
    price_cents: 99900,
    socket: 'AM5',
    memory_type: 'ddr5',
    tdp_watts: 170,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    specs: {
      cores: 16,
      threads: 32,
      cache: '144 MB total',
      integrated_graphics: true,
      source: 'Canada Computers',
      sale_price_observed: '$929.98 on 2026-10-06',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'cpu-intel-core-ultra-7-265kf',
    sku: 'CPU-INT-U7265KF',
    category: 'cpu',
    brand: 'Intel',
    model: 'Core Ultra 7 265KF',
    description:
      'Twenty cores on LGA1851. The KF has no integrated graphics, which is a saving if a graphics card is going in anyway.',
    price_cents: 41999,
    socket: 'LGA1851',
    memory_type: 'ddr5',
    tdp_watts: 125,
    pcie_version: 5,
    created_at: CPUS_ADDED,
    updated_at: CPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      cores: '20 (8P + 12E)',
      integrated_graphics: false,
      chipset_support: 'B860, H810, H870, Z890',
      source: 'Canada Computers',
      sale_price_observed: '$339.99 on 2026-10-06',
      unverified:
        'Base power is the Intel figure for the Core Ultra 7 265K/KF; the retailer listing states the socket and core layout but not the wattage.',
      price_checked: CHECKED_CPUS,
    },
  }),

  // -------------------------------------------------------------------------
  // Motherboards
  // -------------------------------------------------------------------------
  component({
    id: 'mb-msi-mag-x870-tomahawk',
    sku: 'MB-MSI-X870TOMA',
    category: 'motherboard',
    brand: 'MSI',
    model: 'MAG X870 TOMAHAWK WIFI',
    description:
      'ATX AM5 board for high-core-count Ryzen builds, with heavy VRM cooling, Wi-Fi 7 and four M.2 slots.',
    price_cents: 38999,
    socket: 'AM5',
    chipset: 'X870',
    form_factor: 'atx',
    memory_type: 'ddr5',
    memory_slots: 4,
    max_memory_gb: 256,
    m2_slots: 4,
    sata_ports: 4,
    pcie_version: 5,
    tdp_watts: 55,
    specs: {
      wifi: 'Wi-Fi 7',
      lan: '5 Gbps',
      m2_detail: '2x PCIe 5.0 x4, 2x PCIe 4.0',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'mb-asus-rog-strix-b850-f',
    sku: 'MB-ASU-B850F',
    category: 'motherboard',
    brand: 'ASUS',
    model: 'ROG STRIX B850-F GAMING WIFI',
    description:
      'ATX AM5 board with PCIe 5.0 graphics and storage support, strong power delivery and Wi-Fi 7.',
    price_cents: 41999,
    socket: 'AM5',
    chipset: 'B850',
    form_factor: 'atx',
    memory_type: 'ddr5',
    memory_slots: 4,
    max_memory_gb: 192,
    m2_slots: 4,
    sata_ports: 4,
    pcie_version: 5,
    tdp_watts: 50,
    data_confidence: 'sample',
    specs: {
      wifi: 'Wi-Fi 7',
      lan: 'Intel 2.5 Gbps',
      power_stages: '16+2+2',
      unverified: 'SATA port count not stated by the retailer',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'mb-asus-rog-strix-b850-i',
    sku: 'MB-ASU-B850I',
    category: 'motherboard',
    brand: 'ASUS',
    model: 'ROG STRIX B850-I GAMING WIFI',
    description:
      'Mini-ITX AM5 board for compact builds. Two memory slots, dense layout, PCIe 5.0 graphics slot.',
    price_cents: 48999,
    socket: 'AM5',
    chipset: 'B850',
    form_factor: 'mini-itx',
    memory_type: 'ddr5',
    memory_slots: 2,
    max_memory_gb: 96,
    m2_slots: 2,
    sata_ports: 2,
    pcie_version: 5,
    tdp_watts: 40,
    data_confidence: 'sample',
    specs: {
      wifi: 'Wi-Fi 7',
      lan: '2.5 Gbps',
      power_stages: '10+2+1',
      unverified: 'SATA port count not stated by the retailer',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'mb-gigabyte-b860-aorus-elite',
    sku: 'MB-GIG-B860ELITE',
    category: 'motherboard',
    brand: 'Gigabyte',
    model: 'B860 AORUS ELITE WIFI7 ICE',
    description:
      'ATX LGA1851 board with Wi-Fi 7 and three M.2 slots, for mid-range Intel Core Ultra builds.',
    price_cents: 30999,
    socket: 'LGA1851',
    chipset: 'B860',
    form_factor: 'atx',
    memory_type: 'ddr5',
    memory_slots: 4,
    max_memory_gb: 256,
    m2_slots: 3,
    sata_ports: 4,
    pcie_version: 5,
    tdp_watts: 45,
    data_confidence: 'sample',
    specs: {
      wifi: 'Wi-Fi 7',
      lan: '2.5 GbE',
      unverified: 'SATA port count not stated by the retailer',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'mb-msi-mpg-z890-carbon',
    sku: 'MB-MSI-Z890CARBON',
    category: 'motherboard',
    brand: 'MSI',
    model: 'MPG Z890 CARBON WIFI',
    description:
      'Enthusiast ATX LGA1851 board with five M.2 slots and Thunderbolt-class connectivity, for workstation builds.',
    price_cents: 74999,
    socket: 'LGA1851',
    chipset: 'Z890',
    form_factor: 'atx',
    memory_type: 'ddr5',
    memory_slots: 4,
    max_memory_gb: 256,
    m2_slots: 5,
    sata_ports: 4,
    pcie_version: 5,
    tdp_watts: 55,
    data_confidence: 'sample',
    specs: {
      wifi: 'Wi-Fi 7',
      lan: 'Killer 5G',
      unverified: 'SATA port count and maximum memory not stated by the retailer',
      price_checked: CHECKED,
    },
  }),

  component({
    id: 'mb-asus-tuf-b650e-plus-wifi',
    sku: 'MB-ASU-B650EPLUS',
    category: 'motherboard',
    brand: 'ASUS',
    model: 'TUF GAMING B650E-PLUS WIFI',
    description:
      'AM5 board with four DIMM slots and three M.2 slots, which is the practical middle of the range: room to add storage later without paying for an X870E.',
    price_cents: 27999,
    socket: 'AM5',
    chipset: 'B650',
    form_factor: 'atx',
    memory_type: 'ddr5',
    memory_slots: 4,
    max_memory_gb: 256,
    m2_slots: 3,
    sata_ports: 4,
    pcie_version: 5,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      wifi: 'Wi-Fi 6E',
      cpu_support: 'Ryzen 9000, 8000 and 7000 series',
      source: 'Canada Computers (price), ASUS techspec (specifications)',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // CPU coolers
  // -------------------------------------------------------------------------
  component({
    id: 'cool-deepcool-ak620-g2',
    sku: 'COOL-DC-AK620G2',
    category: 'cooler',
    brand: 'DeepCool',
    model: 'AK620 G2',
    description:
      'Dual-tower air cooler with six heat pipes and two 120 mm fans. Handles mid-range and most high-end processors without a pump to fail.',
    price_cents: 7999,
    cooler_type: 'air',
    cooler_height_mm: 159,
    cooling_capacity_watts: 260,
    supported_sockets: ['AM5', 'AM4', 'LGA1851', 'LGA1700', 'LGA1200', 'LGA1151'],
    // Power the cooler's own fans draw, not the heat it can move.
    tdp_watts: 5,
    specs: {
      fans: 2,
      fan_size_mm: 120,
      heat_pipes: 6,
      airflow_cfm: 57.76,
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'cool-arctic-liquid-freezer-iii-360',
    sku: 'COOL-ARC-LF3-360',
    category: 'cooler',
    brand: 'Arctic',
    model: 'Liquid Freezer III 360',
    description:
      '360 mm all-in-one liquid cooler with three 120 mm fans. Strong thermal headroom for high-power processors.',
    price_cents: 18999,
    cooler_type: 'aio',
    radiator_size_mm: [360],
    supported_sockets: ['AM5', 'AM4', 'LGA1851', 'LGA1700'],
    tdp_watts: 12,
    data_confidence: 'sample',
    specs: {
      fans: 3,
      fan_size_mm: 120,
      fan_rpm: '200-1800',
      unverified: 'Socket bracket list not stated by the retailer',
      price_checked: CHECKED,
    },
  }),

  component({
    id: 'cool-deepcool-ak400-digital-se',
    sku: 'COOL-DC-AK400DSE',
    category: 'cooler',
    brand: 'DeepCool',
    model: 'AK400 DIGITAL SE',
    description:
      'Single-tower air cooler with a temperature display on the cap. The budget end of the range, and enough for any 65 W processor here.',
    price_cents: 3999,
    supported_sockets: [
      'AM5',
      'AM4',
      'LGA1851',
      'LGA1700',
      'LGA1200',
      'LGA1151',
      'LGA1150',
      'LGA1155',
    ],
    cooler_type: 'air',
    cooler_height_mm: 157,
    tdp_watts: 3,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    data_confidence: 'sample',
    specs: {
      fan: '120 mm FDB, 500-1850 RPM',
      heat_pipes: 4,
      display: 'CPU temperature and load',
      dimensions_mm: '126 x 97 x 157',
      source: 'Canada Computers (price), DeepCool product page (specifications)',
      unverified:
        'DeepCool publishes no TDP rating for this cooler, so none is recorded and the engine does not compare it against a processor. Height and socket support are the manufacturer figures.',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Memory
  //
  // DDR5 pricing rose steeply through 2026. These are Canadian retail as
  // checked and are the fastest-moving figures in the catalogue.
  // -------------------------------------------------------------------------
  component({
    id: 'ram-xpg-lancer-blade-16gb-ddr5-5600',
    sku: 'RAM-XPG-16G5600',
    category: 'ram',
    brand: 'XPG',
    model: 'Lancer Blade RGB 16GB (2x8GB) DDR5-5600',
    description: 'Entry DDR5 kit for office systems and light gaming.',
    price_cents: 30999,
    memory_type: 'ddr5',
    memory_capacity_gb: 16,
    memory_modules: 2,
    memory_speed_mts: 5600,
    tdp_watts: 8,
    specs: { cas_latency: 'CL46', form: 'UDIMM', price_checked: CHECKED },
  }),
  component({
    id: 'ram-lexar-thor-32gb-ddr5-6000',
    sku: 'RAM-LEX-32G6000',
    category: 'ram',
    brand: 'Lexar',
    model: 'THOR OC 32GB (2x16GB) DDR5-6000',
    description:
      'The value 32 GB kit. Two modules at 6000 MT/s, leaving two slots free on a four-slot board.',
    price_cents: 56999,
    memory_type: 'ddr5',
    memory_capacity_gb: 32,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 10,
    specs: { cas_latency: 'CL36', form: 'UDIMM', price_checked: CHECKED },
  }),
  component({
    id: 'ram-teamgroup-vulcan-32gb-ddr5-6000',
    sku: 'RAM-TEA-32G6000',
    category: 'ram',
    brand: 'TEAMGROUP',
    model: 'T-FORCE VULCAN 32GB (2x16GB) DDR5-6000 CL30',
    description:
      'Low-latency 32 GB kit. CL30 at 6000 MT/s is the sweet spot for cache-sensitive gaming processors.',
    price_cents: 73999,
    memory_type: 'ddr5',
    memory_capacity_gb: 32,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 10,
    specs: { cas_latency: 'CL30', form: 'UDIMM', price_checked: CHECKED },
  }),
  component({
    id: 'ram-teamgroup-delta-64gb-ddr5-6000',
    sku: 'RAM-TEA-64G6000',
    category: 'ram',
    brand: 'TEAMGROUP',
    model: 'T-FORCE DELTA RGB 64GB (2x32GB) DDR5-6000 CL30',
    description:
      'High-capacity dual-module kit for workstation duty: large project files, virtual machines, multi-application workloads.',
    price_cents: 148999,
    memory_type: 'ddr5',
    memory_capacity_gb: 64,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 12,
    specs: { cas_latency: 'CL30', form: 'UDIMM', price_checked: CHECKED },
  }),

  // -------------------------------------------------------------------------
  // Graphics cards
  //
  // The most volatile category in the catalogue, for both price and
  // availability. Re-check before quoting anything.
  // -------------------------------------------------------------------------
  component({
    id: 'gpu-msi-rtx-5060-ti-16g',
    sku: 'GPU-MSI-5060TI16',
    category: 'gpu',
    brand: 'MSI',
    model: 'GeForce RTX 5060 Ti 16G VENTUS 3X OC',
    description:
      '1080p and 1440p card with 16 GB of memory, which matters more than raw speed in newer titles.',
    price_cents: 114999,
    gpu_length_mm: 306,
    tdp_watts: 180,
    recommended_psu_watts: 600,
    pcie_version: 5,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR7 128-bit',
      power_connectors: '1x 8-pin',
      cuda_cores: 4608,
      unverified: 'Board power and recommended PSU taken from the NVIDIA reference figures',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'gpu-sapphire-rx-9070-xt',
    sku: 'GPU-SAP-9070XT',
    category: 'gpu',
    brand: 'SAPPHIRE',
    model: 'PULSE Radeon RX 9070 XT 16GB',
    description:
      'AMD 1440p and 4K card with 16 GB of memory and a triple-fan cooler. The value choice at this tier.',
    price_cents: 139900,
    gpu_length_mm: 320,
    tdp_watts: 304,
    recommended_psu_watts: 850,
    pcie_version: 5,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR6 256-bit',
      stream_processors: 4096,
      dimensions_mm: '320 x 120.25 x 61.6',
      unverified: 'Board power taken from the AMD reference figure',
      source: 'Canada Computers',
      price_checked: CHECKED_GPUS,
    },
  }),
  component({
    id: 'gpu-gigabyte-rtx-5080-gaming-oc',
    sku: 'GPU-GIG-5080GOC',
    category: 'gpu',
    brand: 'Gigabyte',
    model: 'GeForce RTX 5080 GAMING OC 16GB',
    description:
      '4K gaming card and a strong option for GPU-accelerated creative work. Long and heavy, so check case clearance.',
    price_cents: 239900,
    gpu_length_mm: 340,
    tdp_watts: 360,
    recommended_psu_watts: 850,
    pcie_version: 5,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR7 256-bit, 30 Gbps',
      dimensions_mm: '340 x 140 x 70',
      cooling: 'WINDFORCE triple fan',
      unverified: 'Board power taken from the NVIDIA reference figure',
      price_checked: CHECKED,
    },
  }),

  // The five rows below were added on 2026-10-05. Board power is the chipset
  // reference figure in each case, which is why they carry data_confidence
  // 'sample' and name that in specs.unverified, exactly as the earlier cards
  // do. Prices and card lengths are per-variant and retailer-confirmed.
  component({
    id: 'gpu-asus-prime-rtx-5070-oc',
    sku: 'GPU-ASU-5070POC',
    category: 'gpu',
    brand: 'ASUS',
    model: 'Prime GeForce RTX 5070 OC Edition 12GB',
    description:
      '1440p card with 12 GB of GDDR7. A 304 mm board, so check it against the case clearance before ordering.',
    price_cents: 129999,
    gpu_length_mm: 304,
    tdp_watts: 250,
    pcie_version: 5,
    created_at: GPUS_ADDED,
    updated_at: GPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      vram_gb: 12,
      memory: 'GDDR7 192-bit, 28 Gbps',
      power_connectors: '1x 16-pin',
      source: 'Canada Computers',
      unverified:
        'Board power is the NVIDIA reference figure for the RTX 5070, not an ASUS figure for this card. No recommended PSU wattage was stated by the retailer, so none is recorded.',
      price_checked: CHECKED_GPUS,
    },
  }),
  component({
    id: 'gpu-sapphire-pulse-rx-9060-xt-16gb',
    sku: 'GPU-SAP-9060XT16',
    category: 'gpu',
    brand: 'SAPPHIRE',
    model: 'PULSE Radeon RX 9060 XT Gaming OC 16GB',
    description:
      '1080p and 1440p card with 16 GB of memory, which ages better than raw speed in newer titles. 285 mm, so it fits more cases than the larger cards above it.',
    price_cents: 84999,
    gpu_length_mm: 285,
    tdp_watts: 160,
    recommended_psu_watts: 650,
    pcie_version: 5,
    created_at: GPUS_ADDED,
    updated_at: GPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR6 128-bit',
      power_connectors: '1x 8-pin',
      source: 'Canada Computers',
      unverified:
        'Board power is the AMD reference figure for the RX 9060 XT. The recommended 650 W is the retailer-stated figure for this card.',
      price_checked: CHECKED_GPUS,
    },
  }),
  component({
    id: 'gpu-gigabyte-rx-9070-xt-gaming-oc',
    sku: 'GPU-GIG-9070XTG',
    category: 'gpu',
    brand: 'Gigabyte',
    model: 'Radeon RX 9070 XT GAMING OC 16GB',
    description:
      '1440p and 4K card with 16 GB of memory. At 288 mm it is the shortest of the 9070 XT boards listed here, which matters in a compact case.',
    price_cents: 149900,
    gpu_length_mm: 288,
    tdp_watts: 304,
    recommended_psu_watts: 850,
    pcie_version: 5,
    created_at: GPUS_ADDED,
    updated_at: GPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR6 256-bit',
      power_connectors: '2x 8-pin',
      source: 'Canada Computers',
      sale_price_observed: '$1,049.00 on 2026-10-05',
      unverified:
        'Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not Gigabyte figures for this card.',
      price_checked: CHECKED_GPUS,
    },
  }),
  component({
    id: 'gpu-asus-prime-rx-9070-xt-oc',
    sku: 'GPU-ASU-9070XTP',
    category: 'gpu',
    brand: 'ASUS',
    model: 'Prime Radeon RX 9070 XT OC Edition 16GB',
    description:
      '1440p and 4K card with 16 GB of memory and a triple-fan cooler. 312 mm long.',
    price_cents: 153999,
    gpu_length_mm: 312,
    tdp_watts: 304,
    recommended_psu_watts: 850,
    pcie_version: 5,
    created_at: GPUS_ADDED,
    updated_at: GPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR6 256-bit',
      power_connectors: '2x 8-pin',
      source: 'Canada Computers',
      unverified:
        'Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not ASUS figures for this card.',
      price_checked: CHECKED_GPUS,
    },
  }),
  component({
    id: 'gpu-sapphire-pure-rx-9070-xt',
    sku: 'GPU-SAP-9070XTPU',
    category: 'gpu',
    brand: 'SAPPHIRE',
    model: 'PURE Radeon RX 9070 XT 16GB',
    description:
      'The white-shroud 9070 XT, for a build where the parts are meant to match. Same 16 GB and the same 320 mm length as the PULSE.',
    price_cents: 144900,
    gpu_length_mm: 320,
    tdp_watts: 304,
    recommended_psu_watts: 850,
    pcie_version: 5,
    created_at: GPUS_ADDED,
    updated_at: GPUS_ADDED,
    data_confidence: 'sample',
    specs: {
      vram_gb: 16,
      memory: 'GDDR6 256-bit',
      power_connectors: '2x 8-pin',
      colour: 'White',
      source: 'Canada Computers',
      unverified:
        'Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not SAPPHIRE figures for this card.',
      price_checked: CHECKED_GPUS,
    },
  }),

  component({
    id: 'ram-corsair-vengeance-rgb-32gb-ddr5-6000',
    sku: 'RAM-COR-32G6000',
    category: 'ram',
    brand: 'Corsair',
    model: 'VENGEANCE RGB 32GB (2x16GB) DDR5-6000 CL30',
    description:
      'The common 32 GB sweet spot for a gaming build, at the CL30 timing AM5 prefers.',
    price_cents: 88699,
    memory_type: 'ddr5',
    memory_capacity_gb: 32,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 8,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      cas_latency: 'CL30',
      form: 'UDIMM',
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ram-corsair-vengeance-rgb-64gb-ddr5-6000',
    sku: 'RAM-COR-64G6000',
    category: 'ram',
    brand: 'Corsair',
    model: 'VENGEANCE RGB 64GB (2x32GB) DDR5-6000 CL30',
    description:
      'Two sticks rather than four for 64 GB, which is the configuration AM5 runs at full speed more reliably.',
    price_cents: 177999,
    memory_type: 'ddr5',
    memory_capacity_gb: 64,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 10,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      cas_latency: 'CL30',
      form: 'UDIMM',
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ram-gskill-trident-z5-neo-32gb-ddr5-6000',
    sku: 'RAM-GSK-32G6000',
    category: 'ram',
    brand: 'G.SKILL',
    model: 'Trident Z5 Neo RGB 32GB (2x16GB) DDR5-6000 CL30',
    description:
      'EXPO-tuned 32 GB kit aimed at Ryzen. The Neo line is the AMD-profile version of the Trident Z5.',
    price_cents: 108999,
    memory_type: 'ddr5',
    memory_capacity_gb: 32,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 8,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      cas_latency: 'CL30',
      form: 'UDIMM',
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ram-kingston-fury-beast-64gb-ddr5-6000',
    sku: 'RAM-KIN-64G6000',
    category: 'ram',
    brand: 'Kingston',
    model: 'FURY Beast 64GB (2x32GB) DDR5-6000 CL30',
    description: '64 GB for rendering, virtual machines and large datasets.',
    price_cents: 188999,
    memory_type: 'ddr5',
    memory_capacity_gb: 64,
    memory_modules: 2,
    memory_speed_mts: 6000,
    tdp_watts: 10,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      cas_latency: 'CL30',
      form: 'UDIMM',
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------
  component({
    id: 'ssd-kingston-nv3-1tb',
    sku: 'SSD-KIN-NV31T',
    category: 'storage',
    brand: 'Kingston',
    model: 'NV3 1TB NVMe',
    description: 'Value M.2 NVMe drive. Enough for the operating system and a working set of games.',
    price_cents: 21999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 1000,
    tdp_watts: 6,
    pcie_version: 4,
    specs: { form_factor: 'M.2 2280', price_checked: CHECKED },
  }),
  component({
    id: 'ssd-wd-black-sn850x-1tb',
    sku: 'SSD-WD-SN850X1T',
    category: 'storage',
    brand: 'Western Digital',
    model: 'WD_BLACK SN850X 1TB NVMe',
    description: 'Fast M.2 NVMe drive with a DRAM cache. A good single-drive boot and game library option.',
    price_cents: 31999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 1000,
    tdp_watts: 7,
    pcie_version: 4,
    specs: { form_factor: 'M.2 2280', dram_cache: true, price_checked: CHECKED },
  }),
  component({
    id: 'ssd-wd-black-sn850x-2tb',
    sku: 'SSD-WD-SN850X2T',
    category: 'storage',
    brand: 'Western Digital',
    model: 'WD_BLACK SN850X 2TB NVMe',
    description:
      'High-performance 2 TB M.2 drive. The default boot drive for gaming and workstation builds.',
    price_cents: 52999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 2000,
    tdp_watts: 8,
    pcie_version: 4,
    specs: { form_factor: 'M.2 2280', dram_cache: true, price_checked: CHECKED },
  }),
  component({
    id: 'ssd-wd-black-sn7100-4tb',
    sku: 'SSD-WD-SN71004T',
    category: 'storage',
    brand: 'Western Digital',
    model: 'WD_BLACK SN7100 4TB NVMe',
    description:
      'High-capacity M.2 drive for project files and large game libraries, at a lower cost per terabyte.',
    price_cents: 72999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 4000,
    tdp_watts: 7,
    pcie_version: 4,
    specs: { form_factor: 'M.2 2280', price_checked: CHECKED },
  }),

  component({
    id: 'ssd-samsung-990-pro-1tb',
    sku: 'SSD-SAM-990P1T',
    category: 'storage',
    brand: 'Samsung',
    model: '990 Pro 1TB NVMe',
    description:
      'Gen4 drive with a DRAM cache. A safe boot drive where sustained write speed matters more than a benchmark number.',
    price_cents: 43999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 1000,
    tdp_watts: 7,
    pcie_version: 4,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      form_factor: 'M.2 2280',
      dram_cache: true,
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ssd-samsung-9100-pro-1tb',
    sku: 'SSD-SAM-9100P1T',
    category: 'storage',
    brand: 'Samsung',
    model: '9100 PRO 1TB PCIe Gen5 NVMe',
    description:
      'PCIe Gen5 drive. Worth it on a Gen5 M.2 slot and wasted on a Gen4 one, where it runs at Gen4 speed.',
    price_cents: 46499,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 1000,
    tdp_watts: 7,
    pcie_version: 5,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      form_factor: 'M.2 2280',
      source: 'Canada Computers',
      sale_price_observed: '$249.99 on 2026-10-06',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ssd-samsung-9100-pro-2tb',
    sku: 'SSD-SAM-9100P2T',
    category: 'storage',
    brand: 'Samsung',
    model: '9100 PRO 2TB PCIe Gen5 NVMe',
    description: 'PCIe Gen5 drive at the capacity most single-drive builds actually want.',
    price_cents: 92499,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 2000,
    tdp_watts: 7,
    pcie_version: 5,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      form_factor: 'M.2 2280',
      source: 'Canada Computers',
      sale_price_observed: '$489.99 on 2026-10-06',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'ssd-wd-black-sn850x-4tb',
    sku: 'SSD-WD-SN850X4T',
    category: 'storage',
    brand: 'Western Digital',
    model: 'WD_BLACK SN850X 4TB NVMe',
    description: 'The 4 TB SN850X, for a single-drive machine with a large game library.',
    price_cents: 151999,
    storage_interface: 'nvme-m2',
    storage_capacity_gb: 4000,
    tdp_watts: 7,
    pcie_version: 4,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      form_factor: 'M.2 2280',
      dram_cache: true,
      source: 'Canada Computers',
      sale_price_observed: '$949.99 on 2026-10-06',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Power supplies
  // -------------------------------------------------------------------------
  component({
    id: 'psu-deepcool-pn650m',
    sku: 'PSU-DC-PN650M',
    category: 'psu',
    brand: 'DeepCool',
    model: 'PN650M 650W Gold',
    description: 'Fully modular 650 W ATX 3.1 unit for office builds and lower-power gaming systems.',
    price_cents: 8988,
    psu_wattage: 650,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    specs: { modular: 'Fully modular', atx_version: 'ATX 3.1', price_checked: CHECKED },
  }),
  component({
    id: 'psu-deepcool-pn750m',
    sku: 'PSU-DC-PN750M',
    category: 'psu',
    brand: 'DeepCool',
    model: 'PN750M 750W Gold',
    description: 'Fully modular 750 W ATX 3.1 unit. A sensible match for mid-range gaming builds.',
    price_cents: 9988,
    psu_wattage: 750,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    specs: { modular: 'Fully modular', atx_version: 'ATX 3.1', price_checked: CHECKED },
  }),
  component({
    id: 'psu-deepcool-pn850m',
    sku: 'PSU-DC-PN850M',
    category: 'psu',
    brand: 'DeepCool',
    model: 'PN850M 850W Gold',
    description:
      'Fully modular 850 W ATX 3.1 unit, sized for builds with a higher-power graphics card.',
    price_cents: 11488,
    psu_wattage: 850,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    specs: { modular: 'Fully modular', atx_version: 'ATX 3.1', price_checked: CHECKED },
  }),
  component({
    id: 'psu-deepcool-pn1000m',
    sku: 'PSU-DC-PN1000M',
    category: 'psu',
    brand: 'DeepCool',
    model: 'PN1000M 1000W Gold',
    description:
      'Fully modular 1000 W ATX 3.1 unit with the 12V-2x6 connector current high-power cards expect.',
    price_cents: 13988,
    psu_wattage: 1000,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    specs: { modular: 'Fully modular', atx_version: 'ATX 3.1', price_checked: CHECKED },
  }),
  component({
    id: 'psu-gigabyte-ud1300gm',
    sku: 'PSU-GIG-UD1300GM',
    category: 'psu',
    brand: 'Gigabyte',
    model: 'UD1300GM PG5 1300W Gold',
    description:
      'High-capacity unit for flagship graphics cards and high-core-count workstations that run long jobs.',
    price_cents: 32999,
    psu_wattage: 1300,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    specs: { modular: 'Fully modular', price_checked: CHECKED },
  }),

  component({
    id: 'psu-fsp-vita-750w',
    sku: 'PSU-FSP-VITA750',
    category: 'psu',
    brand: 'FSP',
    model: 'VITA 750W 80 PLUS Gold',
    description: '750 W Gold unit, enough for a single mid-range card with headroom to spare.',
    price_cents: 13999,
    psu_wattage: 750,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    data_confidence: 'sample',
    specs: {
      source: 'Canada Computers',
      unverified:
        'Modularity and connector counts are not stated in the retailer listing. Confirm before quoting a build that needs two 8-pin PCIe connectors.',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'psu-fsp-vita-1000w',
    sku: 'PSU-FSP-VITA1000',
    category: 'psu',
    brand: 'FSP',
    model: 'VITA 1000W 80 PLUS Gold',
    description:
      '1000 W Gold unit for a high-draw card, or for a build meant to take a bigger one later.',
    price_cents: 19999,
    psu_wattage: 1000,
    psu_efficiency: '80 PLUS Gold',
    psu_form_factor: 'atx',
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    data_confidence: 'sample',
    specs: {
      source: 'Canada Computers',
      unverified:
        'Modularity and connector counts are not stated in the retailer listing. Confirm before quoting a build that needs a 12V-2x6 connector.',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Cases
  // -------------------------------------------------------------------------
  component({
    id: 'case-nzxt-h5-flow',
    sku: 'CASE-NZX-H5FLOW',
    category: 'case',
    brand: 'NZXT',
    model: 'H5 Flow Compact ATX Mid-Tower',
    description:
      'Compact ATX case with a perforated front panel and straightforward cable routing. Good value at the entry tier.',
    price_cents: 9999,
    supported_form_factors: ['atx', 'micro-atx', 'mini-itx'],
    max_gpu_length_mm: 410,
    max_cooler_height_mm: 170,
    // Front takes a 360; the top is limited to 240.
    radiator_support_mm: [240, 360],
    psu_form_factor: 'atx',
    specs: {
      front_panel: 'Perforated steel',
      psu_clearance_mm: 200,
      radiator_detail: 'Front 360 mm, top 240 mm',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'case-corsair-frame-4000d-rs',
    sku: 'CASE-COR-FRAME4000D',
    category: 'case',
    brand: 'Corsair',
    model: 'FRAME 4000D RS',
    description:
      'Mid-tower with a high-airflow panel and a clean cable channel. A dependable default for most builds.',
    price_cents: 10499,
    supported_form_factors: ['e-atx', 'atx', 'micro-atx', 'mini-itx'],
    max_gpu_length_mm: 430,
    max_cooler_height_mm: 170,
    radiator_support_mm: [240, 280, 360],
    psu_form_factor: 'atx',
    specs: {
      radiator_detail: 'Front, top and side all take 240/280/360 mm; rear 120/140 mm',
      price_checked: CHECKED,
    },
  }),
  component({
    id: 'case-lian-li-o11d-evo-rgb',
    sku: 'CASE-LL-O11DEVORGB',
    category: 'case',
    brand: 'Lian Li',
    model: 'O11D EVO RGB Mid-Tower',
    description:
      'Dual-chamber showcase case with wide radiator support and room for the longest cards. The usual choice for builds meant to be looked at.',
    price_cents: 23999,
    supported_form_factors: ['e-atx', 'atx', 'micro-atx', 'mini-itx'],
    max_gpu_length_mm: 455,
    max_cooler_height_mm: 167,
    radiator_support_mm: [240, 280, 360, 420],
    psu_form_factor: 'atx',
    data_confidence: 'sample',
    specs: {
      layout: 'Dual chamber',
      radiator_detail: 'Top 240/360/420 mm with bracket; side and bottom 240/280/360 mm',
      psu_clearance_mm: 220,
      unverified: 'Full motherboard form factor list not stated by the retailer',
      price_checked: CHECKED,
    },
  }),

  component({
    id: 'case-asus-proart-pa602',
    sku: 'CASE-ASU-PA602',
    category: 'case',
    brand: 'ASUS',
    model: 'ProArt PA602 E-ATX',
    description:
      'Large workstation case. Takes E-ATX boards, a 440 mm card and a 420 mm radiator, and ships with two 200 mm front fans.',
    price_cents: 37999,
    supported_form_factors: ['e-atx', 'atx', 'micro-atx', 'mini-itx'],
    max_gpu_length_mm: 440,
    max_cooler_height_mm: 185,
    radiator_support_mm: [120, 140, 240, 280, 360, 420],
    psu_form_factor: 'atx',
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      included_fans: '2 x 200 mm front, 1 x 140 mm rear',
      psu_clearance_mm: 190,
      radiator_detail: 'Up to 420 mm',
      board_support: 'Mini-DTX, DTX, Mini-ITX, Micro-ATX, ATX, E-ATX up to 12 x 10.9 in',
      source: 'Canada Computers (price), ASUS techspec (clearances)',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'case-asus-tuf-gt302-argb',
    sku: 'CASE-ASU-GT302',
    category: 'case',
    brand: 'ASUS',
    model: 'TUF Gaming GT302 ARGB',
    description:
      'Mid-tower with four 140 mm ARGB fans fitted. Takes a 407 mm card, but the 165 mm cooler limit rules out the tallest air towers.',
    price_cents: 20999,
    supported_form_factors: ['e-atx', 'atx', 'micro-atx', 'mini-itx'],
    max_gpu_length_mm: 407,
    max_cooler_height_mm: 165,
    radiator_support_mm: [120, 140, 240, 280, 360],
    psu_form_factor: 'atx',
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      included_fans: '3 x 140 mm ARGB front, 1 x 140 mm ARGB rear',
      psu_clearance_mm: 220,
      radiator_detail: 'Top up to 360 mm, front up to 280 mm, rear 140 mm',
      source: 'Canada Computers (price), ASUS techspec (clearances)',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Case fans
  // -------------------------------------------------------------------------
  // These are THREE-PACKS, and the model name says so, because the quantity
  // stepper in the configurator counts units of sale rather than fans. Picking
  // quantity 2 of a three-pack is six fans, and somebody reading "2" has to be
  // able to tell which it means.
  //
  // tdp_watts is 6 rather than the 2 W the power calculator assumes per fan,
  // for the same reason: the row is three fans, so it draws three fans' worth,
  // and the calculator multiplies by the quantity chosen.
  //
  // No compatibility rule reads anything else here. A fan has nothing to check
  // against the rest of a build, which is why these rows carry no clearance or
  // socket fields at all.
  component({
    id: 'fan-bequiet-light-wings-lx-120-3pack',
    sku: 'FAN-BQ-LWLX120X3',
    category: 'case-fan',
    brand: 'be quiet!',
    model: 'Light Wings LX 120mm PWM ARGB, 3-pack',
    description:
      'Three 120 mm ARGB fans from a brand that builds its reputation on noise. The usual choice when the machine sits on the desk rather than under it.',
    price_cents: 7499,
    tdp_watts: 6,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      size_mm: 120,
      pack_quantity: 3,
      lighting: 'ARGB',
      control: 'PWM',
      source: 'Canada Computers',
      sale_price_observed: '$39.99 on 2026-10-06',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'fan-asus-tuf-tf120-argb-3pack',
    sku: 'FAN-ASU-TF120X3',
    category: 'case-fan',
    brand: 'ASUS',
    model: 'TUF Gaming TF120 ARGB 3-in-1, 3-pack',
    description: 'Three 120 mm ARGB fans with daisy-chained cabling, which keeps the back of the case tidier than three separate runs.',
    price_cents: 8999,
    tdp_watts: 6,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      size_mm: 120,
      pack_quantity: 3,
      lighting: 'ARGB',
      control: 'PWM',
      source: 'Canada Computers',
      sale_price_observed: '$64.99 on 2026-10-06',
      price_checked: CHECKED_PARTS,
    },
  }),
  component({
    id: 'fan-corsair-rs360-ii-argb-3pack',
    sku: 'FAN-COR-RS360X3',
    category: 'case-fan',
    brand: 'Corsair',
    model: 'RS360 II ARGB 120mm, 3-pack',
    description: 'Three 120 mm ARGB fans. A straightforward set for filling the front of a mid-tower.',
    price_cents: 7499,
    tdp_watts: 6,
    created_at: PARTS_ADDED,
    updated_at: PARTS_ADDED,
    specs: {
      size_mm: 120,
      pack_quantity: 3,
      lighting: 'ARGB',
      control: 'PWM',
      source: 'Canada Computers',
      price_checked: CHECKED_PARTS,
    },
  }),

  // -------------------------------------------------------------------------
  // Operating systems
  // -------------------------------------------------------------------------
  component({
    id: 'os-none',
    sku: 'OS-NONE',
    category: 'os',
    brand: 'PC Builders Canada',
    model: 'No operating system',
    description:
      'Ships without an OS installed. Choose this if you are supplying your own licence or installing Linux yourself.',
    price_cents: 0,
    stock_quantity: 999,
    low_stock_threshold: 0,
    specs: {
      note: 'The system is still tested before shipping, using our own bootable media.',
      // No price_checked: this option costs nothing, so there is no price to
      // check against the market. See the zero-price exemption in
      // price-freshness.test.ts.
    },
  }),
  component({
    id: 'os-windows-11-home',
    sku: 'OS-MS-W11HOME',
    category: 'os',
    brand: 'Microsoft',
    model: 'Windows 11 Home',
    description: 'Windows 11 Home licence, installed and updated before the system ships.',
    price_cents: 17999,
    stock_quantity: 999,
    low_stock_threshold: 10,
    data_confidence: 'sample',
    specs: {
      edition: 'Home',
      delivery: 'Pre-installed and activated',
      source: 'Canada Computers',
      unverified:
        'This is the retail licence price, not an OEM price. OEM cost depends on a Microsoft reseller account; until there is one, retail is the figure that can actually be honoured.',
      price_checked: CHECKED_CPUS,
    },
  }),
  component({
    id: 'os-windows-11-pro',
    sku: 'OS-MS-W11PRO',
    category: 'os',
    brand: 'Microsoft',
    model: 'Windows 11 Pro',
    description:
      'Windows 11 Pro licence. Adds BitLocker, Remote Desktop host and domain join, the usual requirements for a work machine.',
    price_cents: 23999,
    stock_quantity: 999,
    low_stock_threshold: 10,
    data_confidence: 'sample',
    specs: {
      edition: 'Pro',
      delivery: 'Pre-installed and activated',
      source: 'Canada Computers',
      unverified:
        'This is the retail licence price, not an OEM price. OEM cost depends on a Microsoft reseller account; until there is one, retail is the figure that can actually be honoured.',
      price_checked: CHECKED_CPUS,
    },
  }),

  // ===========================================================================
  // WHOLE UNITS - networking, NAS and mini PCs
  // ===========================================================================
  // Prices and specifications checked against Canadian retail on 2026-09-27.
  // Sources: Canada Computers (switches, NAS enclosures, NAS drives) and
  // PiShop.ca (Raspberry Pi, the official Canadian distributor).
  //
  // These rows carry NONE of the tower-build fields. That is deliberate, not an
  // omission: a switch has no socket and a NAS enclosure has no radiator
  // clearance, so those columns stay null and the compatibility engine never
  // sees these categories at all. Their details live in `specs`, which no
  // compatibility rule is permitted to read.
  //
  // Where a retailer listing contradicted itself or omitted a figure, the row is
  // marked `data_confidence: 'sample'` and `specs.unverified` names the exact
  // field. The storefront prints that caveat. Two listings did contradict
  // themselves, and guessing would have been the easier and worse choice.
  //
  // Where a price was seen on promotion, `price_cents` holds the REGULAR price
  // and `specs.sale_price_observed` records the promotion. A storefront that
  // bakes in somebody else's expiring sale ends up selling below cost.

  // -------------------------------------------------------------------------
  // Networking and server
  // -------------------------------------------------------------------------
  component({
    id: 'net-tplink-tl-sg108e',
    sku: 'NET-TPL-SG108E',
    category: 'networking',
    brand: 'TP-Link',
    model: 'TL-SG108E 8-Port Gigabit Easy Smart Switch',
    description:
      'Eight gigabit ports with VLAN, QoS and IGMP snooping in a fanless metal case. The usual starting point when a flat home network needs segmenting without moving to a full managed stack.',
    price_cents: 3999,
    specs: {
      ports: '8 x 1GbE RJ45',
      management: 'Web-managed (Easy Smart)',
      vlan: 'Port-based, tag-based and MTU VLAN',
      qos: 'Yes, with IGMP snooping',
      jumbo_frame: '15K',
      cooling: 'Fanless',
      mounting: 'Desktop or wall',
      price_checked: CHECKED_UNITS,
      sale_price_observed: '$34.99 on 2026-09-27',
      source: 'Canada Computers',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'net-tplink-tl-sg108pe',
    sku: 'NET-TPL-SG108PE',
    category: 'networking',
    brand: 'TP-Link',
    model: 'TL-SG108PE 8-Port Gigabit PoE+ Easy Smart Switch',
    description:
      'The same eight gigabit ports as the SG108E, with four of them supplying PoE+ across a 64 W budget. Enough to run a pair of access points and a couple of cameras without separate power bricks.',
    price_cents: 8999,
    specs: {
      ports: '8 x 1GbE RJ45',
      poe_ports: '4 x PoE+ (802.3af/at)',
      poe_budget_watts: 64,
      management: 'Web-managed (Easy Smart)',
      vlan: 'Port-based, tag-based and MTU VLAN',
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'net-ubiquiti-usw-flex-2-5g-5',
    sku: 'NET-UBI-FLEX25G5',
    category: 'networking',
    brand: 'Ubiquiti',
    model: 'UniFi USW-Flex-2.5G-5',
    description:
      'Five 2.5GbE ports, managed through UniFi. The sensible upgrade once a NAS and a desktop both have 2.5G and a gigabit switch has become the bottleneck between them.',
    price_cents: 7999,
    specs: {
      ports: '5 x 2.5GbE RJ45',
      switching: 'Layer 2, IGMP snooping, port mirroring, spanning tree',
      management: 'UniFi Network application',
      form_factor: 'Desktop',
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
      availability_note:
        'Was sold out online at the retailer on the check date; confirm supply before promising a ship date.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'net-ubiquiti-usw-flex-2-5g-8-poe',
    sku: 'NET-UBI-FLEX25G8P',
    category: 'networking',
    brand: 'Ubiquiti',
    model: 'UniFi USW-Flex-2.5G-8-PoE',
    description:
      'Eight-port PoE switch with a 10 GbE RJ45/SFP+ combination uplink, in a desktop shell meant for deployment outside a wiring closet. That uplink is the reason to pick it over a cheaper eight-port unit.',
    price_cents: 28500,
    data_confidence: 'sample',
    specs: {
      ports: '8 ports, all PoE+ capable',
      uplink: '1 x 10GbE RJ45 / SFP+ combination',
      management: 'UniFi Network application',
      dimensions_mm: '99.6 x 163.7 x 31.7',
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
      unverified:
        'Port speed and total PoE budget. The retailer listing described the access ports as 10/100/1000 while naming the model 2.5G, and gave no PoE wattage at all. Confirm both against Ubiquiti documentation before publishing this row.',
      availability_note: 'Sold out online and in store at the retailer on the check date.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  // -------------------------------------------------------------------------
  // NAS enclosures
  // -------------------------------------------------------------------------
  component({
    id: 'nas-synology-ds224-plus',
    sku: 'NAS-SYN-DS224P',
    category: 'nas',
    brand: 'Synology',
    model: 'DiskStation DS224+ (2-bay, diskless)',
    description:
      'Two-bay DiskStation running DSM. Diskless, so pair it with a couple of NAS-rated drives in a mirror. The common first NAS for household backups, Time Machine targets and a media library.',
    price_cents: 44999,
    data_confidence: 'sample',
    specs: {
      bays: 2,
      drive_support: 'SATA HDD or SSD, 3.5 inch or 2.5 inch',
      memory: '2 GB DDR4',
      network: '2 x 1GbE RJ45',
      usb: '2 x USB 3.2 Gen 1',
      power_draw_watts: 15,
      supplied: 'Diskless - drives sold separately',
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
      unverified:
        'Exact CPU model and maximum raw capacity. The retailer listing said only "Intel Celeron 2 GHz" and described the bays as SAS, which is wrong for this unit. Confirm against the Synology datasheet before publishing this row.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'nas-synology-ds423-plus',
    sku: 'NAS-SYN-DS423P',
    category: 'nas',
    brand: 'Synology',
    model: 'DiskStation DS423+ (4-bay, diskless)',
    description:
      'Four-bay DiskStation with two M.2 NVMe slots for read and write cache. Four bays is the point where you can run a single-drive-redundant array and still grow it, which two bays never really allows.',
    price_cents: 74999,
    data_confidence: 'sample',
    specs: {
      bays: 4,
      drive_support: 'SATA HDD or SSD, 3.5 inch or 2.5 inch',
      cache_slots: '2 x M.2 2280 NVMe',
      memory: '2 GB DDR4',
      network: '2 x 1GbE RJ45',
      usb: '2 x USB 3.2 Gen 1',
      max_raw_capacity: 'Up to 72 TB per the retailer listing',
      dimensions_mm: '166 x 199 x 223',
      supplied: 'Diskless - drives sold separately',
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
      unverified:
        'Exact CPU model, and the 72 TB maximum capacity figure. Both came from retailer copy rather than the Synology datasheet.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  // -------------------------------------------------------------------------
  // NAS-rated drives
  // -------------------------------------------------------------------------
  // Category 'storage', not 'nas': these are drives, and somebody filtering for
  // storage should see them. `specs.nas_rated` is what puts them on the NAS page
  // alongside the enclosures.
  component({
    id: 'hdd-wd-red-plus-8tb',
    sku: 'HDD-WD-RED8TB',
    category: 'storage',
    brand: 'Western Digital',
    model: 'WD Red Plus 8TB NAS HDD (WD80EFPX)',
    description:
      'Eight terabytes of CMR NAS storage rated for 180 TB a year and continuous operation. CMR rather than SMR is the point: shingled drives behave badly during a RAID rebuild, which is exactly when you need them not to.',
    price_cents: 50999,
    storage_interface: 'sata',
    storage_capacity_gb: 8000,
    specs: {
      rpm: 5640,
      cache_mb: 256,
      recording: 'CMR',
      form_factor: '3.5 inch',
      workload_rating: '180 TB per year',
      warranty: '3-year limited',
      nas_rated: true,
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'hdd-seagate-ironwolf-4tb',
    sku: 'HDD-SEA-IW4TB',
    category: 'storage',
    brand: 'Seagate',
    model: 'IronWolf 4TB NAS HDD (ST4000VN006)',
    description:
      'Four terabytes rated for 24/7 NAS duty, with three years of Rescue data recovery included. A reasonable capacity per dollar for a first two-bay mirror.',
    price_cents: 27999,
    storage_interface: 'sata',
    storage_capacity_gb: 4000,
    specs: {
      rpm: 5400,
      cache_mb: 256,
      form_factor: '3.5 inch',
      duty: 'Rated for 24x7 operation',
      included: '3 years Rescue Data Recovery Services',
      warranty: '3-year limited',
      nas_rated: true,
      price_checked: CHECKED_UNITS,
      sale_price_observed: '$264.99 on 2026-09-27',
      source: 'Canada Computers',
      availability_note: 'Sold out online at the retailer on the check date; limited store stock.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  // -------------------------------------------------------------------------
  // Mini PCs and single-board computers
  // -------------------------------------------------------------------------
  component({
    id: 'mini-rpi5-4gb',
    sku: 'MINI-RPI5-4GB',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'Raspberry Pi 5 / 4GB',
    description:
      'The 4 GB Pi 5. Enough for Pi-hole, Home Assistant, a print server or a light Docker host. It needs a power supply, storage and cooling, none of which are in the box.',
    price_cents: 15395,
    specs: {
      soc: 'Broadcom BCM2712, quad-core Cortex-A76 at 2.4 GHz',
      memory: '4 GB LPDDR4X-4267',
      gpu: 'VideoCore VII',
      network: 'Gigabit Ethernet (PoE+ with HAT), Wi-Fi 802.11ac, Bluetooth 5.0',
      usb: '2 x USB 3.0, 2 x USB 2.0',
      display: 'Dual 4Kp60 micro HDMI',
      expansion: 'PCIe 2.0 x1, 40-pin GPIO, microSD',
      power_input: '5V/5A USB-C Power Delivery',
      supplied: 'Board only',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-rpi5-8gb',
    sku: 'MINI-RPI5-8GB',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'Raspberry Pi 5 / 8GB',
    description:
      'The 8 GB Pi 5, and the version to pick if it will run several containers at once or double as a small desktop. Roughly three times the CPU throughput of a Pi 4.',
    price_cents: 24495,
    specs: {
      soc: 'Broadcom BCM2712, quad-core Cortex-A76 at 2.4 GHz',
      memory: '8 GB LPDDR4X-4267',
      gpu: 'VideoCore VII, OpenGL ES 3.1 and Vulkan 1.2',
      network: 'Gigabit Ethernet (PoE+ with HAT), Wi-Fi 802.11ac, Bluetooth 5.0',
      usb: '2 x USB 3.0 (5 Gbps), 2 x USB 2.0',
      display: 'Dual 4Kp60 micro HDMI with HDR',
      expansion: 'PCIe 2.0 x1, 40-pin GPIO, microSD, real-time clock',
      power_input: '5V/5A USB-C Power Delivery',
      supplied: 'Board only',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-rpi5-16gb',
    sku: 'MINI-RPI5-16GB',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'Raspberry Pi 5 / 16GB',
    description:
      'The 16 GB Pi 5, for a workload that actually needs the memory rather than the cores: a larger container stack, a self-hosted database, or compiling on the board itself.',
    price_cents: 42695,
    specs: {
      soc: 'Broadcom BCM2712, quad-core Cortex-A76 at 2.4 GHz',
      memory: '16 GB LPDDR4X-4267',
      gpu: 'VideoCore VII, OpenGL ES 3.1 and Vulkan 1.2',
      network: 'Gigabit Ethernet (PoE+ with HAT), Wi-Fi 802.11ac, Bluetooth 5.0',
      usb: '2 x USB 3.0 (5 Gbps), 2 x USB 2.0',
      display: 'Dual 4Kp60 micro HDMI with HDR',
      expansion: 'PCIe 2.0 x1, 2 x 4-lane MIPI, 40-pin GPIO, microSD, real-time clock',
      power_input: '5V/5A USB-C Power Delivery',
      supplied: 'Board only',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-rpi5-desktop-kit',
    sku: 'MINI-RPI5-KIT8',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'Raspberry Pi 5 Desktop Kit (8GB)',
    description:
      'A complete Pi 5 desktop in one box: board, case, official keyboard and mouse, 27 W supply, both HDMI cables, a preloaded microSD card and the beginner guide. Connect a monitor and it runs.',
    price_cents: 28000,
    data_confidence: 'sample',
    specs: {
      includes:
        'Raspberry Pi 5 (8 GB), case, keyboard and mouse, 27 W USB-C PD supply, 2 x micro HDMI to HDMI 1 m, 16 GB microSD with Raspberry Pi OS, printed beginner guide',
      memory: '8 GB LPDDR4X-4267',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
      unverified:
        'The bundled microSD card is listed as carrying the 32-bit OS image. Confirm which image actually ships before advising a customer who wants 64-bit.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-gigabyte-brix-n150',
    sku: 'MINI-GB-BRIXN150',
    category: 'mini-pc',
    brand: 'GIGABYTE',
    model: 'BRIX Intel N150 Barebones',
    description:
      'A barebones x86 mini PC with Wi-Fi and Bluetooth already fitted. Barebones means no memory, no drive and no operating system, so budget for all three; the payoff is choosing them yourself.',
    price_cents: 23900,
    data_confidence: 'sample',
    specs: {
      cpu: 'Intel N150',
      wireless: 'Wi-Fi and Bluetooth included',
      supplied: 'Barebones - no memory, storage or operating system',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      source: 'Canada Computers',
      unverified:
        'Memory and storage slot counts, supported capacities and port layout were not stated in the retailer listing. Confirm from the GIGABYTE spec sheet before advising on an upgrade.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-gigabyte-brix-n250',
    sku: 'MINI-GB-BRIXN250',
    category: 'mini-pc',
    brand: 'GIGABYTE',
    model: 'BRIX Intel N250 Barebones',
    description:
      'The N250 barebones BRIX, a step up from the N150 on the same build-it-yourself terms. A quiet always-on box for a media front end, a small server or a point-of-sale terminal.',
    price_cents: 29900,
    data_confidence: 'sample',
    specs: {
      cpu: 'Intel N250',
      wireless: 'Wi-Fi and Bluetooth included',
      supplied: 'Barebones - no memory, storage or operating system',
      sbc_accessory: false,
      price_checked: CHECKED_UNITS,
      sale_price_observed: '$199.00 on 2026-09-27',
      source: 'Canada Computers',
      unverified:
        'Memory and storage slot counts, supported capacities and port layout were not stated in the retailer listing.',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  // -------------------------------------------------------------------------
  // Single-board accessories
  // -------------------------------------------------------------------------
  // Tagged `sbc_accessory` so the mini-PC page lists them beneath the boards
  // rather than mixed in among them.
  component({
    id: 'mini-rpi-active-cooler',
    sku: 'MINI-RPI-COOLER',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'Active Cooler for Raspberry Pi 5',
    description:
      'Clip-on aluminium heatsink with a temperature-controlled blower. A Pi 5 under sustained load will throttle without active cooling, so treat this as part of the board rather than an extra.',
    price_cents: 700,
    specs: {
      fits: 'Raspberry Pi 5',
      mounting: 'Clip-on, uses the board mounting points',
      control: 'Temperature-controlled fan',
      sbc_accessory: true,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-rpi-27w-psu',
    sku: 'MINI-RPI-PSU27',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: '27W USB-C Power Delivery Supply',
    description:
      'The official 27 W supply. A Pi 5 raises its own USB port budget from roughly 600 mA to 1.6 A only when it detects a PD supply of this class, so a generic charger quietly costs you peripheral power.',
    price_cents: 1695,
    specs: {
      output: '5.1V/5A, 9V/3A, 12V/2.25A, 15V/1.8A',
      connector: 'USB-C Power Delivery',
      note: 'Unlocks the higher USB port current budget on Raspberry Pi 5',
      sbc_accessory: true,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),

  component({
    id: 'mini-rpi-m2-hat',
    sku: 'MINI-RPI-M2HAT',
    category: 'mini-pc',
    brand: 'Raspberry Pi',
    model: 'M.2 HAT+ for Raspberry Pi 5',
    description:
      'Brings the Pi 5 PCIe lane out to an M.2 slot, so an NVMe drive can replace the microSD card as the boot device. Around 500 MB/s, and a far longer service life than a card under constant writes.',
    price_cents: 1695,
    specs: {
      interface: 'Single-lane PCIe 2.0',
      supports: 'M key M.2 devices, 2230 and 2242 form factors',
      throughput: 'Up to 500 MB/s',
      power_delivery: 'Up to 3 A to the attached device',
      includes: '16 mm stacking header, threaded spacers, ribbon cable',
      compatibility: 'Fits with the Raspberry Pi Active Cooler in place',
      sbc_accessory: true,
      price_checked: CHECKED_UNITS,
      source: 'PiShop.ca',
    },
    created_at: UNITS_ADDED,
    updated_at: UNITS_ADDED,
  }),
];

export const SAMPLE_COMPONENTS_BY_ID = new Map(SAMPLE_COMPONENTS.map((c) => [c.id, c]));
