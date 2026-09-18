import type { Metadata } from 'next';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { PresetCard } from '@/components/build/preset-card';
import { presetsFor } from '@/lib/catalog/presets';
import { summarisePresets } from '@/lib/catalog/preset-summary';

export const metadata: Metadata = {
  title: 'Workstation PC Builds',
  description:
    'Custom workstations for rendering, compilation, simulation and virtualisation, built and tested in Canada. Core count, memory capacity and storage layout chosen for the workload.',
  alternates: { canonical: '/workstations' },
};

export const revalidate = 3600;

const WORKLOADS = [
  {
    title: 'Rendering and video export',
    body: 'Scales with cores, and then with memory bandwidth. A high-core processor with fast DDR5 usually beats a higher-clocked part with fewer cores.',
  },
  {
    title: 'Compilation and CI',
    body: 'Parallel builds are core-hungry and I/O-hungry at the same time. Separate NVMe drives for the OS and the working tree keep one from starving the other.',
  },
  {
    title: 'Simulation and large datasets',
    body: 'Memory capacity first. A job that fits in RAM finishes; a job that spills to disk takes an order of magnitude longer, whatever the processor is.',
  },
  {
    title: 'Virtualisation',
    body: 'Cores and memory to divide, plus enough M.2 and SATA capacity to give each machine its own storage rather than contending for one drive.',
  },
];

export default async function WorkstationsPage() {
  const summaries = await summarisePresets(presetsFor('workstation'));

  return (
    <>
      <PageHeader
        eyebrow="Workstations"
        title="Workstations built for the job in front of them"
        description="A render node, a compile machine and a simulation box want different things. These configurations start from the workload rather than from a price bracket."
        actions={
          <>
            <ButtonLink href="/build">Configure a workstation</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Describe your workload
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {summaries.map((summary) => (
            <PresetCard key={summary.preset.slug} summary={summary} />
          ))}
        </div>

        <Card className="mt-8 p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            If the workload is unusual, tell us about it
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-300">
            The configurations above cover common cases. If your software has specific requirements
            (certified drivers, ECC memory, a particular accelerator, a fixed rack depth) send the
            details and we will build the parts list around them rather than around a template.
          </p>
          <ButtonLink href="/quote" variant="secondary" className="mt-5">
            Send the requirements
          </ButtonLink>
        </Card>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Matching parts to work"
            title="What each workload actually needs"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {WORKLOADS.map((item) => (
              <div key={item.title} className="rounded-lg border border-ink-700 bg-ink-900 p-6">
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm text-ink-400">
            These are general engineering principles, not benchmark claims. Where a specific
            application behaves differently we will say so rather than guess.
          </p>
        </PageShell>
      </section>
    </>
  );
}
