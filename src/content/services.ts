/**
 * Services, as shipped.
 *
 * This file plays the same role for services that sample-catalog.ts plays for
 * components: it is the SEED SOURCE for the `services` table, and the fallback
 * the public page renders when no database is configured.
 *
 * Once the seed has run, the database is authoritative and this file is only
 * a starting point. Editing it will not change a deployed site — that is what
 * the admin is for.
 *
 * The wording is deliberate throughout. Several entries say plainly when a
 * service is not worth buying, and `note` exists to carry exactly that. If a
 * caveat is edited away in the admin later, that is a decision someone made,
 * not an accident of the migration.
 */

export interface ServiceContent {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  includes: string[];
  note?: string;
  /** Free text, because most of this work is quoted after diagnosis. */
  price_text?: string;
  sort_order: number;
  featured?: boolean;
}

export const SERVICE_CONTENT: ServiceContent[] = [
  {
    id: 'custom-builds',
    slug: 'custom-builds',
    name: 'Custom PC building',
    short_description:
      'A machine assembled from a parts list we have checked together, cabled properly and tested before it leaves.',
    includes: [
      'Parts list review against your workload and budget',
      'Assembly with cable routing that does not block airflow',
      'BIOS configuration and memory profile verification',
      'Thermal and stability testing under sustained load',
      'Operating system, drivers and updates if requested',
    ],
    sort_order: 10,
    featured: true,
  },
  {
    id: 'upgrades',
    slug: 'upgrades',
    name: 'PC upgrades',
    short_description:
      'Adding or replacing parts in a machine you already own, after checking what the existing system can actually take.',
    includes: [
      'Compatibility check against your current motherboard, case and power supply',
      'Graphics card, memory, storage and cooling upgrades',
      'Migration of your existing installation to a new drive where practical',
      'Post-upgrade testing so the machine leaves in a known-good state',
    ],
    note: 'We will tell you when an upgrade is not worth it. A platform at the end of its upgrade path is better replaced than fed.',
    sort_order: 20,
    featured: true,
  },
  {
    id: 'onsite-it',
    slug: 'onsite-it',
    name: 'On-site IT support',
    short_description:
      'We come to you. Home, office or site: the machine stays where it is and the work happens in front of you.',
    includes: [
      'Diagnosis at your location, so nothing has to be unplugged and carried',
      'New machine set up and configured on your desk',
      'Network, Wi-Fi and switch installation on site',
      'NAS and storage set up on your own network, with shares and backups configured',
      'Hardware installed or upgraded in place',
      'Handover in person, with the reasoning explained rather than emailed',
    ],
    note: 'Travel is quoted with the job and depends on where you are in the Greater Toronto Area. Some faults are genuinely faster to fix on a bench, and we will say so rather than charging for a visit that does not help.',
    price_text: 'Quoted per visit',
    sort_order: 15,
    featured: true,
  },
  {
    id: 'networking',
    slug: 'networking',
    name: 'Networking',
    short_description:
      'Home and small-office networks: wired, wireless, and the segmenting that keeps them sensible.',
    includes: [
      'Router and switch setup, including VLANs and port profiles',
      'Wi-Fi coverage assessment and access point placement',
      'PoE installation for access points, cameras and phones',
      '2.5GbE links where a NAS and a workstation actually need one',
      'Wired runs terminated and tested rather than guessed at',
      'Wi-Fi and connectivity troubleshooting',
    ],
    note: 'Throughput problems are more often cabling than equipment. We test before recommending anything, because selling a faster switch to fix a crushed cable helps nobody.',
    sort_order: 25,
    featured: true,
  },
  {
    id: 'nas-storage',
    slug: 'nas-storage',
    name: 'NAS & storage',
    short_description:
      'Network storage supplied, built and configured, with backups that actually run.',
    includes: [
      'NAS supplied and populated with drives rated for continuous use',
      'Redundant array built and verified before handover',
      'Shares, users and permissions configured',
      'Scheduled backups set up, including a copy that leaves the building',
      'Storage expansion on an existing unit',
      'File sharing across Windows, macOS and phones',
    ],
    note: 'A redundant array is not a backup. It survives a dead drive, not a deleted folder or a fire, and we will set up a real backup alongside it rather than let redundancy stand in for one.',
    sort_order: 35,
    featured: true,
  },
  {
    id: 'server-infrastructure',
    slug: 'server-infrastructure',
    name: 'Small server & infrastructure',
    short_description:
      'Always-on machines for a home lab or a small office, specified and configured for the job.',
    includes: [
      'Small server or always-on system specified around the workload',
      'Home lab hardware supplied and set up',
      'Local services configured: file sharing, media, automation, containers',
      'Rack or shelf layout, power and cooling planned before anything is bought',
      'Remote access set up where it is needed, and locked down where it is not',
    ],
    note: 'We build small, local infrastructure. We do not manage enterprise domains or run a helpdesk, and will say so rather than take on work that needs a team behind it.',
    sort_order: 45,
  },
  {
    id: 'mini-pc-setup',
    slug: 'mini-pc-setup',
    name: 'Mini PC & Raspberry Pi setup',
    short_description:
      'Small machines delivered working: imaged, cooled, and configured for what you are actually doing with them.',
    includes: [
      'Mini PC supplied with memory, storage and an operating system fitted',
      'Raspberry Pi imaged, cooled and booting from NVMe rather than a card',
      'Pi-hole, Home Assistant, media or container hosts configured',
      'Headless setup with remote access, so it runs without a monitor',
      'Power and cooling chosen properly, which is where most Pi projects fail',
    ],
    sort_order: 55,
  },
  {
    id: 'diagnostics',
    slug: 'diagnostics',
    name: 'Hardware diagnostics',
    short_description:
      'Finding the actual cause of instability, rather than replacing parts until the symptom moves.',
    includes: [
      'Memory testing and storage health checks',
      'Thermal behaviour under load, including throttling analysis',
      'Power delivery and connection inspection',
      'Component isolation testing where a fault is not obvious',
      'A written summary of what was found and what we recommend',
    ],
    sort_order: 30,
    featured: true,
  },
  {
    id: 'windows',
    slug: 'windows',
    name: 'Windows installation',
    short_description: 'A clean installation, configured and updated, with your data preserved.',
    includes: [
      'Clean install of Windows 11 with current updates',
      'Partition and drive configuration',
      'Data migration from the previous installation where recoverable',
      'Recovery media for your specific configuration on request',
    ],
    note: 'We need a valid licence for the edition being installed, or you can add one to the order.',
    sort_order: 40,
  },
  {
    id: 'drivers',
    slug: 'drivers',
    name: 'Driver and software setup',
    short_description:
      'The right drivers from the right source, and the software you actually use, configured.',
    includes: [
      'Chipset, graphics, network and storage drivers from vendor sources',
      'Firmware and BIOS updates where they address a real issue',
      'Application installation and configuration',
      'Removal of preinstalled software you did not ask for',
    ],
    sort_order: 50,
  },
  {
    id: 'optimisation',
    slug: 'optimisation',
    name: 'Performance optimisation',
    short_description:
      'Measuring what the machine does now, changing the thing that is actually limiting it, then measuring again.',
    includes: [
      'Baseline measurement before any change',
      'Memory profile (XMP/EXPO) verification and correction',
      'Fan curve tuning for the noise level you want',
      'Storage configuration and boot time work',
      'Before-and-after figures so the change is visible',
    ],
    note: 'Results depend entirely on what was wrong to begin with. We do not promise a percentage in advance.',
    sort_order: 60,
  },
  {
    id: 'thermal',
    slug: 'thermal',
    name: 'Thermal testing',
    short_description:
      'Sustained load testing to find out what the machine holds, not what it peaks at.',
    includes: [
      'Extended load testing with temperature and clock logging',
      'Thermal paste and cooler mounting inspection',
      'Case airflow assessment and fan configuration',
      'Recommendations ordered by what would actually help most',
    ],
    sort_order: 70,
  },
  {
    id: 'troubleshooting',
    slug: 'troubleshooting',
    name: 'Hardware troubleshooting',
    short_description:
      'Machines that will not boot, crash under load, or have started behaving differently.',
    includes: [
      'No-boot and no-display diagnosis',
      'Crash, freeze and blue screen investigation',
      'Peripheral and connectivity faults',
      'Post-repair verification before the machine goes back',
    ],
    sort_order: 80,
  },
];
