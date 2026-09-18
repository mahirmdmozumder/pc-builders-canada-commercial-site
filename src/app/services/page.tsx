import type { Metadata } from 'next';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { ServiceJsonLd } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'PC Services: Upgrades, Diagnostics & Windows Setup',
  description:
    'PC upgrades, hardware diagnostics, Windows installation, driver setup, thermal testing and troubleshooting for machines you already own.',
  alternates: { canonical: '/services' },
};

interface Service {
  id: string;
  title: string;
  summary: string;
  includes: string[];
  note?: string;
}

const SERVICES: Service[] = [
  {
    id: 'custom-builds',
    title: 'Custom PC building',
    summary:
      'A machine assembled from a parts list we have checked together, cabled properly and tested before it leaves.',
    includes: [
      'Parts list review against your workload and budget',
      'Assembly with cable routing that does not block airflow',
      'BIOS configuration and memory profile verification',
      'Thermal and stability testing under sustained load',
      'Operating system, drivers and updates if requested',
    ],
  },
  {
    id: 'upgrades',
    title: 'PC upgrades',
    summary:
      'Adding or replacing parts in a machine you already own, after checking what the existing system can actually take.',
    includes: [
      'Compatibility check against your current motherboard, case and power supply',
      'Graphics card, memory, storage and cooling upgrades',
      'Migration of your existing installation to a new drive where practical',
      'Post-upgrade testing so the machine leaves in a known-good state',
    ],
    note: 'We will tell you when an upgrade is not worth it. A platform at the end of its upgrade path is better replaced than fed.',
  },
  {
    id: 'diagnostics',
    title: 'Hardware diagnostics',
    summary:
      'Finding the actual cause of instability, rather than replacing parts until the symptom moves.',
    includes: [
      'Memory testing and storage health checks',
      'Thermal behaviour under load, including throttling analysis',
      'Power delivery and connection inspection',
      'Component isolation testing where a fault is not obvious',
      'A written summary of what was found and what we recommend',
    ],
  },
  {
    id: 'windows',
    title: 'Windows installation',
    summary: 'A clean installation, configured and updated, with your data preserved.',
    includes: [
      'Clean install of Windows 11 with current updates',
      'Partition and drive configuration',
      'Data migration from the previous installation where recoverable',
      'Recovery media for your specific configuration on request',
    ],
    note: 'We need a valid licence for the edition being installed, or you can add one to the order.',
  },
  {
    id: 'drivers',
    title: 'Driver and software setup',
    summary: 'The right drivers from the right source, and the software you actually use, configured.',
    includes: [
      'Chipset, graphics, network and storage drivers from vendor sources',
      'Firmware and BIOS updates where they address a real issue',
      'Application installation and configuration',
      'Removal of preinstalled software you did not ask for',
    ],
  },
  {
    id: 'optimisation',
    title: 'Performance optimisation',
    summary:
      'Measuring what the machine does now, changing the thing that is actually limiting it, then measuring again.',
    includes: [
      'Baseline measurement before any change',
      'Memory profile (XMP/EXPO) verification and correction',
      'Fan curve tuning for the noise level you want',
      'Storage configuration and boot time work',
      'Before-and-after figures so the change is visible',
    ],
    note: 'Results depend entirely on what was wrong to begin with. We do not promise a percentage in advance.',
  },
  {
    id: 'thermal',
    title: 'Thermal testing',
    summary: 'Sustained load testing to find out what the machine holds, not what it peaks at.',
    includes: [
      'Extended load testing with temperature and clock logging',
      'Thermal paste and cooler mounting inspection',
      'Case airflow assessment and fan configuration',
      'Recommendations ordered by what would actually help most',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Hardware troubleshooting',
    summary: 'Machines that will not boot, crash under load, or have started behaving differently.',
    includes: [
      'No-boot and no-display diagnosis',
      'Crash, freeze and blue screen investigation',
      'Peripheral and connectivity faults',
      'Post-repair verification before the machine goes back',
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <ServiceJsonLd />
      <PageHeader
        eyebrow="Services"
        title="Work on machines you already own"
        description="Upgrades, diagnostics, a clean Windows setup and honest advice about when a repair is worth it and when it is not."
        actions={
          <>
            <ButtonLink href="/contact">Book a service</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Ask a question first
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {SERVICES.map((service) => (
            <Card key={service.id} id={service.id} className="scroll-mt-24 p-6">
              <h2 className="text-lg font-semibold text-white">{service.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{service.summary}</p>

              <ul className="mt-4 space-y-2">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink-200">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-maple-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              {service.note ? (
                <p className="mt-4 border-t border-ink-700 pt-4 text-sm text-ink-400">
                  {service.note}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16">
          <SectionHeading eyebrow="Pricing" title="How service work is quoted" />
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold text-white">Diagnostics first</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Service work is quoted after we know what is wrong. Quoting a repair before
                diagnosing it either overcharges you or commits us to a price we cannot hold.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Parts at cost plus handling</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                If a repair needs parts, the part price and the labour are listed separately, so you
                can see what you are paying for and source the part yourself if you prefer.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No work without approval</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                You approve the quote before anything is done. If we find something else once the
                machine is open, we come back to you rather than adding it to the bill.
              </p>
            </div>
          </div>

          <p className="mt-10 max-w-3xl text-sm text-ink-400">
            Service rates are being finalised and are not published here yet. Send a description of
            the problem and you will get a written quote before any work starts.
          </p>
          <ButtonLink href="/contact" className="mt-6">
            Describe the problem
          </ButtonLink>
        </PageShell>
      </section>
    </>
  );
}
