import Link from 'next/link';
import { PageShell } from '@/components/ui';

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Build',
    links: [
      { href: '/build', label: 'PC configurator' },
      { href: '/gaming-pcs', label: 'Gaming PCs' },
      { href: '/workstations', label: 'Workstation PCs' },
      { href: '/quote', label: 'Request a quote' },
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
      { href: '/account/support', label: 'Support' },
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
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <p className="text-sm leading-tight font-semibold text-white">
              PC Builders
              <span className="block text-[0.65rem] tracking-[0.2em] text-ink-400 uppercase">
                Canada
              </span>
            </p>
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
