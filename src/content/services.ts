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
  /**
   * Questions customers actually ask, with real answers.
   *
   * Rendered on the service page AND emitted as FAQPage structured data from
   * this same array, which is what keeps the markup and the visible page from
   * drifting apart. Several answers say plainly when a service is not the
   * right call; those are the useful ones.
   */
  faqs?: { question: string; answer: string }[];
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
    faqs: [
      {
        question: 'Can you build a custom gaming PC to my budget?',
        answer:
          'Yes. Tell us the budget, the games or software you run, and the monitor you have, and we put a parts list together and explain why each part is on it. The configurator on this site prices the same catalogue live, so you can also build one yourself and send it over for a second opinion.',
      },
      {
        question: 'How long does a custom build take?',
        answer:
          'It depends on how quickly every part can be sourced, since parts are ordered in once your build is confirmed rather than taken off a shelf. Once the parts are here the assembly is the shorter half of the job; BIOS configuration and the thermal and stability testing take longer than bolting it together. We give a date when the parts are confirmed rather than guessing up front.',
      },
      {
        question: 'Do you test the machine before I get it?',
        answer:
          'Every build gets BIOS configuration, a memory profile check, and thermal and stability testing under sustained load before the operating system goes on. Peak numbers are easy; what matters is the clock speed still held after an hour.',
      },
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
    faqs: [
      {
        question: 'Is it worth upgrading my PC or should I replace it?',
        answer:
          'That depends on the platform. If the motherboard and power supply can take what you want to add, an upgrade is usually the better value. If the socket is at the end of its life you would be spending money on a dead end, and we will tell you that rather than sell you parts.',
      },
      {
        question: 'Can you move my Windows installation to a new drive?',
        answer:
          'Usually yes. We migrate the existing installation where it is practical, which keeps your programs and settings. Occasionally a clean install is the better outcome, and we say so before starting rather than after.',
      },
    ],
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
    faqs: [
      {
        question: 'Do you come to my home or office?',
        answer:
          'Yes. On-site work across Toronto and the GTA is a normal part of what we do: setting up a new machine on your desk, diagnosing a PC where it sits, installing networking, configuring a NAS on your own network, or fitting hardware in place.',
      },
      {
        question: 'Which areas do you cover for on-site work?',
        answer:
          'Toronto and the surrounding Greater Toronto Area, including North York, Scarborough, Etobicoke, Markham, Richmond Hill, Vaughan, Mississauga and Brampton. Travel is quoted with the job and depends on where you are.',
      },
      {
        question: 'Is on-site always the best option?',
        answer:
          'No, and we will say so. Some faults are genuinely faster to diagnose on a bench with spare parts to hand, and paying for a visit that does not help you is a bad outcome for both of us.',
      },
    ],
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
    faqs: [
      {
        question: 'Can you set up a home or office network?',
        answer:
          'Yes. Router and switch setup, VLANs and port profiles where they are useful, PoE for access points and cameras, wired runs terminated and tested, and Wi-Fi coverage assessed rather than guessed at.',
      },
      {
        question: 'My Wi-Fi is slow in parts of the house. Can that be fixed?',
        answer:
          'Usually. Slow Wi-Fi in one area is a coverage problem rather than a speed problem, and a faster router rarely helps. We assess where the signal actually falls off and place access points accordingly.',
      },
      {
        question: 'Is 2.5GbE worth upgrading to?',
        answer:
          'Between two specific machines, often yes. Upgrading a whole network to 2.5G rarely pays; upgrading the link between a NAS and the one workstation that copies large files off it usually does. Cat 5e carries it over normal household runs, so the cabling is often already fine.',
      },
    ],
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
    faqs: [
      {
        question: 'Can you set up a NAS for me?',
        answer:
          'Yes. We supply the unit with drives rated for continuous use, build the redundant array, configure shares and permissions, and set up backups before it reaches you. We also work on units you already own.',
      },
      {
        question: 'Is a NAS a backup?',
        answer:
          'No, and this matters. A redundant array survives a dead drive. It does not survive a deleted folder, ransomware, a failed power supply taking both drives, or a fire. We set up a real backup alongside it rather than let redundancy stand in for one.',
      },
      {
        question: 'How much usable space do I actually get?',
        answer:
          'Less than the sticker. Four 8 TB drives with single-drive redundancy give roughly 21 TiB usable, not 32 TB: redundancy takes a drive and the decimal-to-binary conversion takes about nine percent more. We size from the usable figure.',
      },
    ],
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
    faqs: [
      {
        question: 'Can you set up a home server or home lab?',
        answer:
          'Yes. Small always-on systems specified around the workload, with local services configured: file sharing, media, automation or containers. Power, cooling and layout get planned before anything is bought.',
      },
      {
        question: 'Do you handle enterprise servers and domains?',
        answer:
          'No. We build small, local infrastructure for homes and small offices. Managing an enterprise domain or running a helpdesk needs a team behind it, and we would rather say so than take on work we cannot support properly.',
      },
    ],
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
    faqs: [
      {
        question: 'Can you set up a Raspberry Pi for me?',
        answer:
          'Yes. Imaged, cooled, and booting from NVMe rather than a microSD card, configured for whatever it is doing: Pi-hole, Home Assistant, a media box or a container host. Headless setup with remote access is normal.',
      },
      {
        question: 'Why does my Raspberry Pi keep failing?',
        answer:
          'Two causes account for most of it. A microSD card under constant writes wears out without warning, and a Pi 5 without active cooling throttles under sustained load. An M.2 HAT with a small NVMe drive and a proper cooler removes both.',
      },
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
    faqs: [
      {
        question: 'How do you diagnose a computer problem?',
        answer:
          'By testing, not by guessing. Memory testing, storage health, thermal behaviour under load, power delivery and connection inspection, and component isolation where a fault is not obvious. You get a written summary of what was found and what we recommend.',
      },
      {
        question: 'Do I still pay if the repair is not worth doing?',
        answer:
          'Diagnostics are quoted before we start and the finding is yours either way. We would rather tell you a machine is not worth repairing than charge you for a repair that does not make sense.',
      },
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
    faqs: [
      {
        question: 'Do you install Windows and transfer my files?',
        answer:
          'Yes. A clean install of Windows 11 with current updates, drive and partition configuration, and data migration from the previous installation where it is recoverable. You need a valid licence for the edition, or you can add one to the order.',
      },
    ],
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
    faqs: [
      {
        question: 'Can you make my computer faster?',
        answer:
          'Sometimes substantially, sometimes barely. We measure a baseline first, change the thing that is actually limiting the machine, then measure again so the difference is visible. What we will not do is promise a percentage in advance, because it depends entirely on what was wrong to begin with.',
      },
    ],
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
    faqs: [
      {
        question: 'My PC will not turn on at all. Can you help?',
        answer:
          'Yes, that is one of the more common jobs. No-boot and no-display faults are usually power delivery, memory seating, or a failed component, and isolating which one is a testing exercise rather than a parts-swapping one.',
      },
      {
        question: 'My computer crashes or freezes randomly. What causes that?',
        answer:
          'Most often memory, storage, thermals or a driver. Random crashes are exactly the kind of fault that gets misdiagnosed by replacing parts until the symptom moves, which is why we test rather than substitute.',
      },
    ],
    sort_order: 80,
  },
];
