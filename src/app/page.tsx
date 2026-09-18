import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonLink, Card, PageShell, SectionHeading } from '@/components/ui';
import { PresetCard } from '@/components/build/preset-card';
import { BUILD_PRESETS } from '@/lib/catalog/presets';
import { summarisePresets } from '@/lib/catalog/preset-summary';
import { formatMoney } from '@/lib/utils';
import { OrganizationJsonLd } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Custom Gaming & Workstation PCs Built in Canada',
  description:
    'PC Builders Canada builds custom gaming PCs and workstations to order. Configure a build with live compatibility and power checks, or book upgrades, diagnostics and Windows setup.',
  alternates: { canonical: '/' },
};

export const revalidate = 3600;

export default async function HomePage() {
  const featured = await summarisePresets(
    BUILD_PRESETS.filter((p) => ['gaming-1440p', 'gaming-4k', 'creator-workstation'].includes(p.slug)),
  );
  const cheapest = Math.min(...featured.map((f) => f.subtotalCents));

  return (
    <>
      <OrganizationJsonLd />
      <Hero fromCents={cheapest} />
      <Pillars />
      <FeaturedBuilds featured={featured} />
      <Process />
      <Services />
      <WhyUs />
      <ContactCta />
    </>
  );
}

function Hero({ fromCents }: { fromCents: number }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-700">
      {/* One static gradient, no animation: it frames the copy without costing a repaint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(224,49,49,0.10),transparent_55%)]"
      />
      <PageShell className="relative py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-maple-400 uppercase">
            PC Builders Canada
          </p>
          <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-6xl">
            Custom PCs built for gaming, work and performance.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            Pick your parts and the configurator checks them against each other as you go: socket,
            memory, clearance, radiator support and power draw. Every machine is assembled, cabled
            and tested before it ships.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/build" size="lg">
              Build your PC
            </ButtonLink>
            <ButtonLink href="/quote" variant="secondary" size="lg">
              Get a quote
            </ButtonLink>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-ink-700 pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-xs tracking-wide text-ink-400 uppercase">Builds from</dt>
              <dd className="tnum mt-1 text-xl font-semibold text-white">
                {formatMoney(fromCents, { whole: true })}
              </dd>
              <dd className="mt-0.5 text-xs text-ink-400">in parts, before assembly</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-ink-400 uppercase">Compatibility</dt>
              <dd className="mt-1 text-xl font-semibold text-white">10 checks</dd>
              <dd className="mt-0.5 text-xs text-ink-400">run on every configuration</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs tracking-wide text-ink-400 uppercase">Shipping</dt>
              <dd className="mt-1 text-xl font-semibold text-white">Canada-wide</dd>
              <dd className="mt-0.5 text-xs text-ink-400">free on systems over $1,500</dd>
            </div>
          </dl>
        </div>
      </PageShell>
    </section>
  );
}

const PILLARS = [
  {
    href: '/build',
    title: 'Custom PC builds',
    body: 'Start from nothing or from a configuration, then change any part. Compatibility and estimated power update as you select.',
    cta: 'Open the configurator',
  },
  {
    href: '/gaming-pcs',
    title: 'Gaming PCs',
    body: 'Configurations aimed at a resolution and a frame rate target, from high-refresh 1080p through 4K.',
    cta: 'See gaming builds',
  },
  {
    href: '/workstations',
    title: 'Workstation PCs',
    body: 'Core count, memory capacity and storage layout chosen for render, compile and simulation work.',
    cta: 'See workstations',
  },
  {
    href: '/services',
    title: 'PC services',
    body: 'Upgrades, hardware diagnostics, Windows installation, driver setup and thermal testing for machines you already own.',
    cta: 'See services',
  },
];

function Pillars() {
  return (
    <section className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Link
              key={pillar.href}
              href={pillar.href}
              className="group flex flex-col rounded-lg border border-ink-700 bg-ink-900 p-6 transition-colors hover:border-maple-600/50"
            >
              <h2 className="text-base font-semibold text-white">{pillar.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">{pillar.body}</p>
              <span className="mt-5 text-sm font-medium text-maple-400 group-hover:text-maple-300">
                {pillar.cta} &rarr;
              </span>
            </Link>
          ))}
        </div>
      </PageShell>
    </section>
  );
}

function FeaturedBuilds({ featured }: { featured: Awaited<ReturnType<typeof summarisePresets>> }) {
  return (
    <section className="border-b border-ink-700">
      <PageShell className="py-16 sm:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Starting points"
            title="Configurations to build from"
            description="Each one is a real parts list priced from the current catalogue. Load it in the configurator and change anything you like."
          />
          <Link href="/build" className="text-sm font-medium text-maple-400 hover:text-maple-300">
            Start from scratch &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((summary) => (
            <PresetCard key={summary.preset.slug} summary={summary} />
          ))}
        </div>
      </PageShell>
    </section>
  );
}

const PROCESS = [
  {
    step: '01',
    title: 'Configure or request a quote',
    body: 'Use the configurator, or send a description of what the machine is for and we will put a parts list together.',
  },
  {
    step: '02',
    title: 'We check the configuration',
    body: 'Automatic checks cover socket, memory, clearance and power. We review the list by hand before anything is ordered.',
  },
  {
    step: '03',
    title: 'Assembly and cabling',
    body: 'Parts are inspected on arrival, assembled, and cabled so airflow and future access are not compromised.',
  },
  {
    step: '04',
    title: 'Testing and setup',
    body: 'BIOS configuration, memory profile, thermal and stability testing under load, then the OS, drivers and updates.',
  },
  {
    step: '05',
    title: 'Packed and shipped',
    body: 'The card is braced for transit, the machine is repacked in its original box, and tracking goes out with it.',
  },
];

function Process() {
  return (
    <section className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-16 sm:py-24">
        <SectionHeading
          eyebrow="Build process"
          title="What happens after you order"
          description="Five steps, the same every time."
        />
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700 sm:grid-cols-2 lg:grid-cols-5">
          {PROCESS.map((item) => (
            <li key={item.step} className="bg-ink-900 p-6">
              <span className="tnum font-mono text-xs text-maple-400">{item.step}</span>
              <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{item.body}</p>
            </li>
          ))}
        </ol>
      </PageShell>
    </section>
  );
}

const SERVICE_ITEMS = [
  'Custom PC building',
  'PC upgrades',
  'Hardware diagnostics',
  'Windows installation',
  'Driver and software setup',
  'Performance optimisation',
  'Thermal testing',
  'Hardware troubleshooting',
];

function Services() {
  return (
    <section className="border-b border-ink-700">
      <PageShell className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Services"
              title="Work on machines you already own"
              description="Not every problem needs a new computer. Upgrades, diagnostics and a clean Windows setup often get more back than a replacement would."
            />
            <ButtonLink href="/services" variant="secondary" className="mt-8">
              See all services
            </ButtonLink>
          </div>
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700 sm:grid-cols-2">
            {SERVICE_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3 bg-ink-900 px-5 py-4 text-sm text-ink-100">
                <span className="size-1.5 rounded-full bg-maple-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </PageShell>
    </section>
  );
}

const REASONS = [
  {
    title: 'The compatibility check is real',
    body: 'Socket, DDR generation, DIMM slots, M.2 and SATA counts, radiator support, cooler height, card length and power headroom are compared against structured part data. Where a figure is missing, the check says so instead of guessing.',
  },
  {
    title: 'Power figures are shown, not hidden',
    body: 'The estimated draw is broken down part by part, with the headroom multiplier used to recommend a supply. It is an estimate from component data, and it is labelled as one.',
  },
  {
    title: 'Pricing has no surprises',
    body: 'Parts, assembly, shipping and provincial tax are listed separately before checkout. The configurator total is an estimate until the order is placed, and it says so.',
  },
  {
    title: 'Built and tested by hand',
    body: 'Every machine gets BIOS configuration, a memory profile check, and thermal and stability testing under load before the OS goes on.',
  },
];

function WhyUs() {
  return (
    <section className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-16 sm:py-24">
        <SectionHeading eyebrow="Why PC Builders Canada" title="How we work" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <Card key={reason.title} className="p-6">
              <h3 className="text-base font-semibold text-white">{reason.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{reason.body}</p>
            </Card>
          ))}
        </div>
      </PageShell>
    </section>
  );
}

function ContactCta() {
  return (
    <section>
      <PageShell className="py-16 sm:py-24">
        <div className="rounded-xl border border-ink-700 bg-ink-850 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Not sure which parts you need?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-300">
            Tell us what the machine is for, what you want to spend, and what you already own. We
            will put a parts list together and explain why each part is on it.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/quote" size="lg">
              Request a quote
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Contact us
            </ButtonLink>
          </div>
        </div>
      </PageShell>
    </section>
  );
}
