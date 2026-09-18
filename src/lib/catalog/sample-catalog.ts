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
    active: true,
    data_confidence: 'verified',
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
    price_cents: 124999,
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
      price_checked: CHECKED,
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
    },
  }),
  component({
    id: 'os-windows-11-home',
    sku: 'OS-MS-W11HOME',
    category: 'os',
    brand: 'Microsoft',
    model: 'Windows 11 Home',
    description: 'Windows 11 Home licence, installed and updated before the system ships.',
    price_cents: 15900,
    stock_quantity: 999,
    low_stock_threshold: 10,
    data_confidence: 'sample',
    specs: {
      edition: 'Home',
      delivery: 'Pre-installed and activated',
      unverified:
        'Price is a placeholder. OEM licence cost depends on your Microsoft reseller account, not retail.',
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
    price_cents: 23900,
    stock_quantity: 999,
    low_stock_threshold: 10,
    data_confidence: 'sample',
    specs: {
      edition: 'Pro',
      delivery: 'Pre-installed and activated',
      unverified:
        'Price is a placeholder. OEM licence cost depends on your Microsoft reseller account, not retail.',
    },
  }),
];

export const SAMPLE_COMPONENTS_BY_ID = new Map(SAMPLE_COMPONENTS.map((c) => [c.id, c]));
