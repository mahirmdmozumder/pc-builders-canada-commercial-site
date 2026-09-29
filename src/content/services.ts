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
