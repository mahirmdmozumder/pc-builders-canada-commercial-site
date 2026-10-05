import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { PosInterestForm } from '@/components/pos/interest-form';
import { POS_AUDIENCE, POS_PILLARS, POS_STATUS } from '@/content/pos';
import { REGION_LABEL } from '@/lib/seo/business';

export const metadata: Metadata = {
  title: 'PBC POS | Restaurant Point of Sale',
  description:
    'PBC POS is a restaurant point-of-sale system in development by PC Builders Canada: ordering, kitchen tickets, inventory and cloud reporting. Register interest to hear first.',
  alternates: { canonical: '/pos' },
  /**
   * Not indexed yet, and that is deliberate.
   *
   * A page that ranks for "restaurant POS Toronto" and then says the product is
   * not finished burns the click and teaches Google the page disappoints. It
   * works perfectly for anyone sent here directly, which is how early B2B leads
   * actually arrive, and `follow` means the links out still pass value.
   *
   * Flip to index on the day there is a product. One line.
   */
  robots: { index: false, follow: true },
  openGraph: {
    title: 'PBC POS — Smarter restaurant operations',
    description: 'A restaurant point-of-sale system in development by PC Builders Canada.',
    url: '/pos',
    type: 'website',
    images: [{ url: '/pos/pbc-pos-large.webp' }],
  },
};

/**
 * The PBC POS product page.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PAGE CLAIMS
 * ---------------------------------------------------------------------------
 * That the product is being built, and nothing else. No customers, no pilots,
 * no restaurants running it, no release date, no price. None of those exist
 * yet, and the first restaurant owner to ask "who else uses it?" is the one who
 * would find out.
 *
 * The four pillars describe intended scope and are written as intent rather
 * than as features somebody can use this afternoon. See src/content/pos.ts.
 *
 * ---------------------------------------------------------------------------
 * WHY THE POSTER IS A BACKDROP AND NOT THE PAGE
 * ---------------------------------------------------------------------------
 * The supplied artwork is a square social poster with its headline baked into
 * the pixels. Dropped in as-is, that text cannot be selected, translated, read
 * by a screen reader or indexed, and at phone width it shrinks past legibility.
 *
 * So the image provides the visual and the words are real HTML over it. Same
 * look, and the page works for everybody. It also means "coming soon" is one
 * line to change at launch rather than a reason to regenerate the artwork.
 */
export default function PosPage() {
  return (
    <>
      {/* ---------------------------------------------------------------
          Hero. The poster sits behind, dimmed, with a gradient floor so the
          type holds contrast over the bright areas of the render rather than
          depending on where the lamps happen to fall.
      --------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-ink-700">
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pos/pbc-pos-large.webp"
            alt=""
            className="size-full object-cover object-center opacity-45"
          />
          <span className="absolute inset-0 bg-gradient-to-b from-ink-950/85 via-ink-950/70 to-ink-950" />
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(124,58,237,.22),transparent_65%)]" />
        </div>

        <PageShell className="relative py-16 sm:py-24">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'POS Systems', href: '/pos' },
            ]}
          />

          <div className="mt-8 max-w-2xl">
            <Badge tone="accent">In development</Badge>

            <p className="mt-5 text-xs tracking-[0.3em] text-gold-400 uppercase">Coming soon</p>
            {/* Exactly one H1, and it is the product name. */}
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              PBC <span className="text-gold-400">POS</span>
            </h1>
            <p className="mt-4 text-lg tracking-[0.14em] text-ink-200 uppercase sm:text-xl">
              Smarter restaurant operations
            </p>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-300">
              A point-of-sale system for independent restaurants, built by the people who build the
              hardware it runs on. Ordering, kitchen tickets, inventory and reporting in one system
              &mdash; designed to keep working when the internet does not.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a href="#register" className="font-medium text-gold-400 hover:text-gold-300">
                Register your interest &rarr;
              </a>
              <Link href="/services/onsite-it" className="text-ink-300 hover:text-white">
                Need IT support today?
              </Link>
            </div>
          </div>
        </PageShell>
      </section>

      {/* --- the honest status, high up where it cannot be missed -------- */}
      <section className="border-b border-ink-700 bg-ink-850">
        <PageShell className="py-6">
          <p className="max-w-3xl text-sm leading-relaxed text-ink-300">
            <span className="font-medium text-white">Where this is up to:</span> {POS_STATUS}
          </p>
        </PageShell>
      </section>

      <PageShell className="py-14 sm:py-20">
        {/* --- four pillars ---------------------------------------------- */}
        <section aria-labelledby="pillars">
          <h2 id="pillars" className="text-2xl font-semibold tracking-tight text-white">
            What it covers
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Four areas, built in that order. A till that cannot take an order is not useful, so the
            till comes first.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {POS_PILLARS.map((pillar, index) => (
              <li key={pillar.key}>
                <Card className="h-full p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="tnum text-xs font-semibold text-gold-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-300">{pillar.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* --- who it is for ---------------------------------------------- */}
        <section className="mt-16" aria-labelledby="who">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <h2 id="who" className="text-2xl font-semibold tracking-tight text-white">
                Who it&rsquo;s for
              </h2>
              <ul className="mt-6 space-y-4">
                {POS_AUDIENCE.map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink-200">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500" />
                    {line}
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
                Why us
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink-300">
                Most POS companies sell you software and leave the hardware to somebody else, which
                is how a restaurant ends up with three numbers to call when the printer stops. We
                already build, supply and support the machines, the networking and the screens
                across {REGION_LABEL} &mdash; so the system and the box it runs on come from the
                same place.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">
                It is also being built with one restaurant&rsquo;s actual working day in mind rather
                than a feature list, which is the part that usually goes missing.
              </p>
            </div>

            {/* The artwork again, shown properly this time rather than as a
                backdrop, for anyone who wants to look at it. */}
            <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pos/pbc-pos.webp"
                alt="PBC POS — a point-of-sale terminal and receipt printer on a restaurant counter"
                width={900}
                height={900}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* --- register interest ------------------------------------------ */}
        <section id="register" className="mt-16 max-w-3xl scroll-mt-24">
          <PosInterestForm />
        </section>

        {/* --- honest footer note ------------------------------------------ */}
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-500">
          PBC POS is a product in development by PC Builders Canada. Nothing on this page is an
          offer to sell, and no feature described here should be relied on until it ships. If you
          need a point-of-sale system working this month, say so when you register and we will tell
          you honestly whether waiting makes sense.
        </p>
      </PageShell>
    </>
  );
}
