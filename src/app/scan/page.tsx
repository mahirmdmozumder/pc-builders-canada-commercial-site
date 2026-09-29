import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/ui';
import { ParticleField } from '@/components/visual/particle-field';
import { CHANNELS, REFERRAL } from '@/content/business';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'PC Builders Canada',
  description:
    'Custom PC builds, repairs, networking, NAS and mini-PC setups in the Greater Toronto Area. Get a quote, book a repair, or browse what we supply.',
  alternates: { canonical: '/scan' },
  /**
   * Deliberately not indexed.
   *
   * This page is a hub: almost everything on it is a link to a page that says
   * the same thing at greater length. Letting it be indexed puts it in
   * competition with /services and the homepage for the same brand and local
   * terms, and a thin hub page is the one most likely to win and the least
   * useful one to land on. `follow` stays on so the links still pass through.
   */
  robots: { index: false, follow: true },
};

/**
 * Landing page for the QR code on printed business cards.
 *
 * Written for one situation: somebody standing in a shop or a parking lot who
 * has just pointed a phone at a card, on mobile data, with maybe fifteen
 * seconds of patience. That drives every decision here.
 *
 *   - Actions come before information. The three things a new customer wants
 *     to do are at the top, at full width, with 56px tap targets.
 *   - Line icons rather than emoji. Emoji render differently on every handset,
 *     and a few land as tofu boxes on older Android, which looks broken on the
 *     first impression a card is paying for.
 *   - Only configured channels render. See src/content/business.ts: a card
 *     that leads to a dead Call button is worse than one that never offered it.
 *   - Static, so it serves from the edge cache with no database round trip.
 */
export default function ScanPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.20),transparent_60%),radial-gradient(ellipse_at_top_right,rgba(212,160,60,0.10),transparent_55%)]"
      />
      <div className="absolute inset-x-0 top-0 h-[28rem]">
        <ParticleField />
      </div>

      <PageShell className="relative max-w-xl py-10 sm:py-14">
        <header className="text-center">
          <Image
            src="/logo-lockup.png"
            alt="PC Builders Canada"
            width={1044}
            height={462}
            priority
            sizes="(max-width: 640px) 280px, 340px"
            className="mx-auto h-auto w-[280px] max-w-full sm:w-[340px]"
          />
          <p className="mt-5 text-base leading-relaxed text-ink-200">
            Custom PCs, repairs and upgrades, networking and storage. Built, tested and supported
            in the Greater Toronto Area.
          </p>
        </header>

        <nav className="mt-9 space-y-3" aria-label="What would you like to do">
          <BigAction
            href="/build"
            icon={<DesktopIcon />}
            title="View custom PC builds"
            subtitle="Configure a machine with live compatibility checks"
            primary
          />
          <BigAction
            href="/quote"
            icon={<TagIcon />}
            title="Get a quote"
            subtitle="Tell us the job and the budget, get a parts list back"
          />
          <BigAction
            href="/contact"
            icon={<WrenchIcon />}
            title="Book a repair or service"
            subtitle="Diagnostics, upgrades, Windows setup, troubleshooting"
          />
          <BigAction
            href="/refurbished"
            icon={<TagIcon />}
            title="Refurbished & open box"
            subtitle="Tested hardware, priced accordingly"
          />

          {CHANNELS.googleReviewUrl ? (
            <BigAction
              href={CHANNELS.googleReviewUrl}
              icon={<StarIcon />}
              title="Leave a Google review"
              subtitle="Takes a minute, and it genuinely helps"
              external
            />
          ) : null}
          {CHANNELS.googleProfileUrl && !CHANNELS.googleReviewUrl ? (
            <BigAction
              href={CHANNELS.googleProfileUrl}
              icon={<StarIcon />}
              title="Google reviews"
              subtitle="See what other customers said"
              external
            />
          ) : null}
          {CHANNELS.instagram ? (
            <BigAction
              href={CHANNELS.instagram}
              icon={<CameraIcon />}
              title="Instagram"
              subtitle="Builds, benchmarks and work in progress"
              external
            />
          ) : null}
        </nav>

        <ContactBlock />

        {REFERRAL.active ? <ReferralCard /> : null}

        <Services />

        <footer className="mt-12 border-t border-ink-700 pt-6 text-center">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/" className="text-ink-300 hover:text-white">
              Full website
            </Link>
            <Link href="/services" className="text-ink-300 hover:text-white">
              All services
            </Link>
            <Link href="/portfolio" className="text-ink-300 hover:text-white">
              Past work
            </Link>
            <Link href="/about" className="text-ink-300 hover:text-white">
              About
            </Link>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-500">
            Prices in Canadian dollars. Compatibility and power figures are calculated from
            component data, not measured.
          </p>
        </footer>
      </PageShell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Direct contact
// ---------------------------------------------------------------------------

/**
 * Phone, text and email.
 *
 * The whole block disappears when nothing is configured, rather than rendering
 * an empty card with a heading over it. A card handed to a stranger should not
 * advertise a channel that does not answer.
 */
function ContactBlock() {
  const { phone, phoneDisplay, phoneAcceptsSms, email } = CHANNELS;
  if (!phone && !email) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg border border-ink-600 bg-ink-850 px-4 font-medium text-ink-100 transition-colors hover:border-gold-600/50 hover:bg-ink-800"
        >
          <PhoneIcon />
          Call {phoneDisplay ?? phone}
        </a>
      ) : null}
      {phone && phoneAcceptsSms ? (
        <a
          href={`sms:${phone}`}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg border border-ink-600 bg-ink-850 px-4 font-medium text-ink-100 transition-colors hover:border-gold-600/50 hover:bg-ink-800"
        >
          <MessageIcon />
          Send a text
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg border border-ink-600 bg-ink-850 px-4 font-medium text-ink-100 transition-colors hover:border-gold-600/50 hover:bg-ink-800 sm:col-span-2"
        >
          <MailIcon />
          Email us
        </a>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Referral
// ---------------------------------------------------------------------------

function ReferralCard() {
  const amount = formatMoney(REFERRAL.amountCents, { whole: true });
  const minimum = formatMoney(REFERRAL.minimumSpendCents, { whole: true });

  return (
    <section className="relative mt-8 overflow-hidden rounded-xl border border-gold-600/40 bg-ink-850 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,160,60,0.13),transparent_65%)]"
      />
      <div className="relative">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase">
          Refer a friend
        </p>
        <h2 className="mt-2 text-2xl leading-tight font-semibold text-white">
          <span className="gold-text">{amount} for them</span>, {amount} for you
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-200">
          Send someone our way and they get {amount} off their first service. Once their job is
          done and paid, you get {amount} off your next one. No limit on how many people you
          refer.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          <span className="font-medium text-ink-100">How to claim:</span> they just name you when
          they book, on the quote form or by phone. Nothing to print, no code to remember.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/quote"
            className="inline-flex min-h-11 items-center rounded-md bg-gold-500 px-5 font-medium text-ink-950 transition-colors hover:bg-gold-400"
          >
            Start a quote
          </Link>
          <Link href="/refer" className="text-sm font-medium text-gold-400 hover:text-gold-300">
            Full terms &rarr;
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Applies to labour on services of {minimum} or more, not to hardware. One discount per
          job.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/**
 * Everything offered, grouped.
 *
 * Every line here is something the site already commits to elsewhere, and each
 * one links to the page that describes it. Nothing was added to make the list
 * look longer: no data recovery, no on-site support, no monitoring contracts.
 * A card that promises work the business does not do generates one call and
 * one disappointment.
 */
const SERVICE_GROUPS: { heading: string; href: string; items: string[] }[] = [
  {
    heading: 'Custom PCs',
    href: '/build',
    items: [
      'Custom PC building, assembled and tested',
      'Gaming PCs built to a resolution target',
      'Workstations for render, compile and simulation',
      'PC upgrades to machines you already own',
    ],
  },
  {
    heading: 'Repair & diagnostics',
    href: '/services',
    items: [
      'Hardware diagnostics',
      'Hardware troubleshooting',
      'Thermal testing under sustained load',
      'Performance optimisation',
    ],
  },
  {
    heading: 'Windows & software',
    href: '/services#windows',
    items: [
      'Windows installation',
      'Driver and software setup',
      'BIOS configuration and memory profile checks',
    ],
  },
  {
    heading: 'Networking & servers',
    href: '/networking',
    items: [
      'Managed and PoE switches supplied',
      'VLAN segmentation, port profiles and PoE budgets configured',
      '2.5GbE links between NAS and workstation',
    ],
  },
  {
    heading: 'NAS & network storage',
    href: '/nas',
    items: [
      'NAS enclosures and NAS-rated drives supplied',
      'Redundant arrays built and configured',
      'Shares and scheduled backups set up before delivery',
    ],
  },
  {
    heading: 'Mini PCs & Raspberry Pi',
    href: '/mini-pcs',
    items: [
      'Barebones x86 mini PCs supplied',
      'Raspberry Pi boards with cooling, power and NVMe storage',
      'Boards imaged and configured for the job',
    ],
  },
];

function Services() {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase gold-rule">
        What we do
      </h2>

      <div className="mt-6 space-y-3">
        {SERVICE_GROUPS.map((group) => (
          <Link
            key={group.heading}
            href={group.href}
            className="group block rounded-lg border border-ink-700 bg-ink-850 p-5 transition-colors hover:border-gold-600/45 hover:bg-ink-800"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">{group.heading}</h3>
              <span
                aria-hidden
                className="text-gold-400 transition-transform group-hover:translate-x-0.5"
              >
                &rarr;
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-300">
                  <span
                    aria-hidden
                    className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-gold-500/80"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-ink-400">
        Something not on this list? Ask anyway &mdash;{' '}
        <Link href="/contact" className="font-medium text-gold-400 hover:text-gold-300">
          send us the details
        </Link>{' '}
        and we will tell you straight whether it is work we can do well.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function BigAction({
  href,
  icon,
  title,
  subtitle,
  primary = false,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  external?: boolean;
}) {
  const className = [
    'flex min-h-14 w-full items-center gap-4 rounded-lg border px-5 py-3.5 transition-colors',
    primary
      ? 'border-gold-500 bg-gold-500 text-ink-950 hover:bg-gold-400'
      : 'border-ink-600 bg-ink-850 text-ink-100 hover:border-gold-600/50 hover:bg-ink-800',
  ].join(' ');

  const body = (
    <>
      <span className={primary ? 'shrink-0 text-ink-950' : 'shrink-0 text-gold-400'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block leading-tight font-semibold">{title}</span>
        <span
          className={[
            'mt-0.5 block text-sm leading-snug',
            primary ? 'text-ink-950/75' : 'text-ink-400',
          ].join(' ')}
        >
          {subtitle}
        </span>
      </span>
      <span aria-hidden className="shrink-0 opacity-60">
        &rarr;
      </span>
    </>
  );

  // External destinations are not app routes, so they get a plain anchor and
  // the usual protections on a new-tab link.
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

const ICON = 'size-6';

function DesktopIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="3" width="11" height="18" rx="1.5" />
      <path d="M7 7h5M7 10.5h5" strokeLinecap="round" />
      <circle cx="9.5" cy="16.5" r="1.6" />
      <path d="M18 8v8" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M3.5 11.2V4.5A1 1 0 0 1 4.5 3.5h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7Z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M15.5 3.5a5.5 5.5 0 0 0-5 7.7L3.9 17.8a2 2 0 0 0 2.8 2.8l6.6-6.6a5.5 5.5 0 0 0 6.9-7.2l-3 3-2.6-2.6 3-3a5.5 5.5 0 0 0-2.1-.7Z" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M6.6 3.5h3l1.5 3.8-2 1.3a12 12 0 0 0 5.3 5.3l1.3-2 3.8 1.5v3a1.6 1.6 0 0 1-1.8 1.6A15.8 15.8 0 0 1 5 5.3 1.6 1.6 0 0 1 6.6 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M20.5 12a7.5 8 0 0 1-11 7.1l-4.9 1.4 1.4-4.3A7.9 7.9 0 0 1 5 12a7.5 8 0 0 1 15.5 0Z" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.8 6.4 8.2 6 8.2-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
