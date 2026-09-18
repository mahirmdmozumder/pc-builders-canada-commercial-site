import type { Metadata } from 'next';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About',
  description:
    'PC Builders Canada builds custom gaming PCs and workstations to order, and works on machines customers already own. How we work and what we will and will not claim.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  {
    title: 'The parts list is the product',
    body: 'Anyone can put expensive components in a box. The value is in choosing the ones that matter for what you actually do, and not spending on the ones that do not.',
  },
  {
    title: 'Show the working',
    body: 'The configurator shows which compatibility checks ran, what they compared, and where the data was missing. A result you cannot inspect is just an assertion.',
  },
  {
    title: 'Estimates are labelled as estimates',
    body: 'Power figures are calculated from component data, not measured with instruments. Configurator totals move with catalogue prices. Both say so where they appear.',
  },
  {
    title: 'Say when something is not worth doing',
    body: 'Some upgrades cost more than they return, and some faults are not economic to repair. Saying so costs one sale and keeps the relationship.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Custom PCs, built and tested properly"
        description="PC Builders Canada assembles gaming PCs and workstations to order, and works on machines customers already own: upgrades, diagnostics, Windows setup and troubleshooting."
      />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6 text-ink-300">
            <h2 className="text-2xl font-semibold tracking-tight text-white">What we do</h2>
            <p className="leading-relaxed">
              Every machine is assembled by hand, cabled so that airflow and future access are not
              compromised, then tested under sustained load before the operating system goes on. The
              parts list is checked by a person before anything is ordered, on top of the automatic
              compatibility checks the configurator runs.
            </p>
            <p className="leading-relaxed">
              The service side exists because not every problem needs a new computer. A machine that
              has become unstable usually has one identifiable cause, and finding it is cheaper than
              replacing parts until the symptom moves.
            </p>

            <h2 className="pt-4 text-2xl font-semibold tracking-tight text-white">
              What the configurator does
            </h2>
            <p className="leading-relaxed">
              The compatibility engine compares structured specifications: socket against socket,
              DDR generation against what the board accepts, card length against case clearance,
              radiator size against case mounting points, estimated draw against supply capacity.
              Where a specification is missing from a part, the check reports that it could not run,
              rather than guessing and calling it compatible.
            </p>
            <p className="leading-relaxed">
              The power figure is an estimate built from published component power draw plus a fixed
              allowance for fans and conversion losses, with a headroom multiplier applied to the
              recommendation. It is not a measurement, and the site does not present it as one.
            </p>
          </div>

          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                At a glance
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-ink-400">Based in</dt>
                  <dd className="text-ink-100">Canada</dd>
                </div>
                <div>
                  <dt className="text-ink-400">Ships</dt>
                  <dd className="text-ink-100">Canada-wide</dd>
                </div>
                <div>
                  <dt className="text-ink-400">Payment</dt>
                  <dd className="text-ink-100">Card via Stripe</dd>
                </div>
                <div>
                  <dt className="text-ink-400">Currency</dt>
                  <dd className="text-ink-100">Canadian dollars</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-ink-700 pt-4 text-xs leading-relaxed text-ink-500">
                Full business details, service area and hours are being finalised and will be
                published here.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Get in touch
              </h2>
              <p className="mt-3 text-sm text-ink-300">
                Questions about a configuration, or a machine that needs looking at?
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <ButtonLink href="/quote" size="sm">
                  Request a quote
                </ButtonLink>
                <ButtonLink href="/contact" variant="secondary" size="sm">
                  Contact us
                </ButtonLink>
              </div>
            </Card>
          </aside>
        </div>
      </PageShell>

      <section className="border-t border-ink-700 bg-ink-850">
        <PageShell className="py-16">
          <SectionHeading eyebrow="How we work" title="Four things we hold to" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-lg border border-ink-700 bg-ink-900 p-6">
                <h3 className="text-base font-semibold text-white">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{principle.body}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </>
  );
}
