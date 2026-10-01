import Image from 'next/image';
import Link from 'next/link';
import { PageShell } from '@/components/ui';

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Build',
    links: [
      { href: '/shop', label: 'Shop all hardware' },
      { href: '/build', label: 'PC configurator' },
      { href: '/gaming-pcs', label: 'Pre-built gaming PCs' },
      { href: '/workstations', label: 'Workstation PCs' },
      { href: '/quote', label: 'Request a quote' },
    ],
  },
  {
    heading: 'Shop',
    links: [
      { href: '/networking', label: 'Networking & server' },
      { href: '/nas', label: 'NAS & storage' },
      { href: '/mini-pcs', label: 'Mini PCs & Pi' },
      { href: '/refurbished', label: 'Refurbished' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { href: '/services', label: 'All services' },
      { href: '/services#upgrades', label: 'PC upgrades' },
      { href: '/services#diagnostics', label: 'Hardware diagnostics' },
      { href: '/services#windows', label: 'Windows installation' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/portfolio', label: 'Portfolio' },
      { href: '/contact', label: 'Contact' },
      // The footer rather than the header. The main nav already carries eight
      // items plus a shop dropdown, and a ninth to reach a help page costs more
      // in scanning than it returns — this is where people look for it anyway.
      { href: '/faq', label: 'FAQ' },
      { href: '/account/support', label: 'Support' },
      { href: '/refer', label: 'Refer a friend' },
    ],
  },
  {
    heading: 'Policies',
    links: [
      { href: '/legal/privacy', label: 'Privacy policy' },
      { href: '/legal/terms', label: 'Terms of service' },
      { href: '/legal/shipping', label: 'Shipping policy' },
      { href: '/legal/refunds', label: 'Refund policy' },
      { href: '/legal/warranty', label: 'Warranty policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-700 bg-ink-950">
      <PageShell className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_repeat(5,0.85fr)]">
          <div className="max-w-xs sm:col-span-2 md:col-span-3 lg:col-span-1">
            <Image
              src="/logo-lockup.png"
              alt="PC Builders Canada"
              width={1044}
              height={462}
              sizes="220px"
              className="h-auto w-[220px] max-w-full"
            />
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              Custom gaming and workstation PCs, built to order and tested before they ship.
              Upgrades, diagnostics and Windows setup for machines you already own.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink-200 uppercase">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-400 transition-colors hover:text-ink-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-800 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} PC Builders Canada. Prices in Canadian dollars.</p>
          <p>
            Configurator totals are estimates. Compatibility and power figures are calculated from
            component data, not measured.
          </p>
        </div>
      </PageShell>
    </footer>
  );
}
