import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonLink, Card, PageShell, SectionHeading } from '@/components/ui';
import { PresetCard } from '@/components/build/preset-card';
import {
  listLivePromotions,
  listPublishedPresets,
  listPublishedServices,
} from '@/lib/cms/repository';
import { loadShopCatalogue, rotateShopItems, type ShopItem } from '@/lib/catalog/shop';
import { ShopCard } from '@/components/shop/shop-card';
import { isOrderable, getCatalogSource } from '@/lib/catalog/repository';
import type { ServiceRecord } from '@/lib/cms/types';
import { PromotionStrip } from '@/components/home/promotions';
import { summarisePresets } from '@/lib/catalog/preset-summary';
import { formatMoney } from '@/lib/utils';
import { ParticleField } from '@/components/visual/particle-field';
import { NavCard, type NavCardItem } from '@/components/home/nav-card';

export const metadata: Metadata = {
  title: 'Custom Gaming & Workstation PCs Built in Canada',
  description:
    'PC Builders Canada builds custom gaming PCs and workstations to order. Configure a build with live compatibility and power checks, or book upgrades, diagnostics and Windows setup.',
  alternates: { canonical: '/' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

export default async function HomePage() {
  // Featured presets are chosen in the admin now, not hardcoded here. If none
  // are marked featured, the first few published ones stand in, so the section
  // never renders empty just because nobody has ticked a box yet.
  const [{ rows: presets }, promotions, { rows: services }, shop] = await Promise.all([
    listPublishedPresets(),
    listLivePromotions('home-hero'),
    listPublishedServices(),
    loadShopCatalogue(),
  ]);

  const picked = presets.filter((p) => p.featured);
  const featured = await summarisePresets((picked.length > 0 ? picked : presets).slice(0, 3));

  // The "from" price is the cheapest ASSEMBLED machine, not the cheapest thing
  // in the catalogue. Using the catalogue minimum would put a $7 cooler behind
  // "Pre-built from", which is true of nothing we sell.
  const prebuiltPrices = shop.items
    .filter((item) => item.kind === 'prebuilt' && item.priceCents > 0)
    .map((item) => item.priceCents);
  const cheapestPrebuilt = prebuiltPrices.length > 0 ? Math.min(...prebuiltPrices) : null;

  // Featured products come from the admin. Nothing ticked means the section
  // stays off rather than filling itself with whatever happened to be first.
  const featuredProducts = rotateShopItems(shop.items.filter((item) => item.featured)).slice(0, 8);
  const orderable = isOrderable(getCatalogSource());

  return (
    <>
      <Hero fromCents={cheapestPrebuilt} />
      <PromotionStrip promotions={promotions} />
      <Pillars />
      <FeaturedProducts items={featuredProducts} orderable={orderable} />
      <BeyondTheDesktop />
      <FeaturedBuilds featured={featured} />
      <Process />
      <Services services={services} />
      <WhyUs />
      <ContactCta />
    </>
  );
}

function Hero({ fromCents }: { fromCents: number | null }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-700">
      {/*
        Three layers, cheapest first:
          1. Two static gradient washes. No repaint cost at all.
          2. A faint circuit grid, drawn as a CSS gradient rather than an image
             so it adds nothing to the page weight.
          3. The particle canvas, which is the only animated thing on the page
             and stops itself once the hero scrolls away.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.16),transparent_58%),radial-gradient(ellipse_at_bottom_left,rgba(212,160,60,0.09),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,var(--color-gold-400)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gold-400)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <ParticleField />
      <PageShell className="relative py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">
            PC Builders Canada
          </p>
          <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-6xl">
            Custom Gaming PCs, repairs and{' '}
            <span className="gold-text">on-site IT support</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            Desktops and workstations built to order, plus networking, NAS and always-on systems
            supplied and configured. Build a machine here with live compatibility checks, buy the
            hardware on its own, or have us come to you and set it up.
          </p>

          {/*
            Three destinations, one primary.
            Only "Build your PC" stays gold: three gold buttons would mean no
            primary button at all, and the eye would have to choose between
            three equal options instead of being pointed at one.

            On a phone the primary takes the full width and the other two sit
            side by side beneath it — two rows rather than three. The hero
            already carries a headline, a paragraph and the figures below, and
            a third stacked full-width button would push those under the fold.
            `sm:contents` dissolves the wrapper at desktop so all three become
            direct flex children and sit in one row.
          */}
          <div className="mt-9 space-y-3 sm:flex sm:gap-3 sm:space-y-0">
            <ButtonLink href="/build" size="lg" className="w-full justify-center sm:w-auto">
              Build your PC
            </ButtonLink>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <ButtonLink href="/shop" variant="secondary" size="lg" className="justify-center">
                Shop
              </ButtonLink>
              <ButtonLink href="/quote" variant="secondary" size="lg" className="justify-center">
                Get a quote
              </ButtonLink>
            </div>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-ink-700 pt-8 sm:grid-cols-3">
            {/* Omitted entirely when nothing is published, rather than
                printing a zero or a price nothing is actually sold at. */}
            {fromCents !== null ? (
              <div>
                <dt className="text-xs tracking-wide text-ink-400 uppercase">Pre-built from</dt>
                <dd className="tnum mt-1 text-xl font-semibold text-white">
                  {formatMoney(fromCents, { whole: true })}
                </dd>
                <dd className="mt-0.5 text-xs text-ink-400">assembled and tested, before tax</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs tracking-wide text-ink-400 uppercase">Compatibility</dt>
              <dd className="mt-1 text-xl font-semibold text-white">10 checks</dd>
              <dd className="mt-0.5 text-xs text-ink-400">run on every configuration</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs tracking-wide text-ink-400 uppercase">On-site support</dt>
              <dd className="mt-1 text-xl font-semibold text-white">Greater Toronto</dd>
              <dd className="mt-0.5 text-xs text-ink-400">
                or shipped Canada-wide, free over $1,500
              </dd>
            </div>
          </dl>
        </div>
      </PageShell>
    </section>
  );
}

const PILLARS: NavCardItem[] = [
  {
    href: '/build',
    title: 'Custom PC builds',
    body: 'Start from nothing or from a configuration, then change any part. Compatibility and estimated power update as you select.',
    cta: 'Open the configurator',
    image: '/home/custom-pc-builds.webp',
  },
  {
    href: '/gaming-pcs',
    title: 'Pre-built gaming PCs',
    body: 'Ready configurations aimed at a resolution and a frame rate target, assembled and tested before they ship.',
    cta: 'See pre-built PCs',
    image: '/home/pre-built-gaming-pcs.webp',
  },
  {
    href: '/shop',
    title: 'Shop hardware',
    body: 'Parts, switches, NAS enclosures, drives and mini PCs in one catalogue, including open-box and refurbished stock.',
    cta: 'Browse the shop',
    image: '/home/shop-hardware.webp',
  },
  {
    href: '/services',
    title: 'Repairs & IT support',
    body: 'Diagnostics, upgrades, networking, storage and Windows work — on our bench or at your home or office.',
    cta: 'See services',
    image: '/home/repairs-it-support.webp',
  },
];

function Pillars() {
  return (
    <section className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Eager, because this row sits near the fold and is part of what the
              page gets measured on. The second row below is lazy. */}
          {PILLARS.map((pillar) => (
            <NavCard key={pillar.href} item={pillar} priority />
          ))}
        </div>
      </PageShell>
    </section>
  );
}

/**
 * Products the admin has ticked as featured.
 *
 * Renders nothing when none are ticked. That is deliberate: a section that
 * fills itself with whatever happened to be first would make the tick box
 * meaningless, and the homepage already has plenty to look at without a row of
 * arbitrary products.
 */
function FeaturedProducts({ items, orderable }: { items: ShopItem[]; orderable: boolean }) {
  if (items.length === 0) return null;

  return (
    <section className="border-b border-ink-700">
      <PageShell className="py-16 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Featured"
            title="Picked out this week"
            description="Hardware worth a look, whether you are building, upgrading or replacing something that died."
          />
          <Link href="/shop" className="text-sm font-medium text-gold-400 hover:text-gold-300">
            Browse the shop &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ShopCard key={`${item.kind}-${item.id}`} item={item} orderable={orderable} />
          ))}
        </div>
      </PageShell>
    </section>
  );
}

/**
 * The categories that are not a tower.
 *
 * Kept as its own section rather than folded into PILLARS above, because these
 * are whole units bought off a list, not builds that go through the
 * configurator. Presenting them next to "Build your PC" would imply the
 * compatibility engine has something to say about them, and it does not.
 */
const BEYOND: NavCardItem[] = [
  {
    href: '/networking',
    title: 'Networking & server',
    body: 'Smart and PoE switches for segmenting a network, powering access points and cameras, or getting a NAS past a gigabit bottleneck.',
    cta: 'See switches',
    image: '/home/networking-server.webp',
  },
  {
    href: '/nas',
    title: 'NAS & network storage',
    body: 'Enclosures and NAS-rated drives, supplied bare or built out with a redundant array, shares and backup schedules configured.',
    cta: 'See NAS builds',
    image: '/home/nas-storage.webp',
  },
  {
    href: '/mini-pcs',
    title: 'Mini PCs & Raspberry Pi',
    body: 'Small always-on machines. Barebones x86 mini PCs, and Pi boards with the cooling, power and NVMe storage that make them reliable.',
    cta: 'See mini PCs',
    image: '/home/mini-pcs.webp',
  },
  {
    href: '/refurbished',
    title: 'Refurbished & open box',
    body: 'Tested hardware at a lower price, with every listing stating what was checked, what was replaced and what warranty applies.',
    cta: 'See refurbished',
    image: '/home/refurbished.webp',
  },
];

function BeyondTheDesktop() {
  return (
    <section className="border-b border-ink-700">
      <PageShell className="py-16 sm:py-24">
        <SectionHeading
          eyebrow="Beyond the desktop"
          title="Networking, storage and small machines"
          description="Not everything worth building is a tower. These are sold as finished units, with the setup work available as a service."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Lazy: this row is a long scroll from the top and has no business
              being fetched before somebody reaches it. */}
          {BEYOND.map((item) => (
            <NavCard key={item.href} item={item} />
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
          <Link href="/build" className="text-sm font-medium text-gold-400 hover:text-gold-300">
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
              <span className="tnum font-mono text-xs text-gold-400">{item.step}</span>
              <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{item.body}</p>
            </li>
          ))}
        </ol>
      </PageShell>
    </section>
  );
}

/**
 * Services, from the database.
 *
 * Previously a hardcoded list of eight strings. It reads the same services
 * table the services page does, so adding a service in the admin puts it here
 * too without a code change — which is the whole point of having moved that
 * content out of the source.
 *
 * Featured services lead. If none are marked featured the first few by display
 * order stand in, because an empty services section on the homepage of a
 * services business is worse than an unopinionated one.
 */
function Services({ services }: { services: ServiceRecord[] }) {
  const featured = services.filter((service) => service.featured);
  const shown = (featured.length > 0 ? featured : services).slice(0, 8);

  return (
    <section className="border-b border-ink-700">
      <PageShell className="py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Services"
              title="More than building machines"
              description="Repairs and upgrades, networking and storage, small servers and always-on systems. On your bench or ours — we come to you across the Greater Toronto Area."
            />
            <ButtonLink href="/services" variant="secondary" className="mt-8">
              View all services
            </ButtonLink>
          </div>

          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700 sm:grid-cols-2">
            {shown.map((service) => (
              <li key={service.id} className="bg-ink-900 px-5 py-4">
                <Link href={`/services#${service.slug}`} className="group block">
                  <span className="flex items-center gap-3 text-sm font-medium text-ink-100 group-hover:text-white">
                    <span className="size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                    {service.name}
                  </span>
                  <span className="mt-1 block pl-4.5 text-xs leading-relaxed text-ink-400">
                    {service.short_description}
                  </span>
                </Link>
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
