import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/session';
import { SignOutButton } from '@/components/account/sign-out-button';
import { isStripeLiveMode } from '@/lib/env';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin navigation, in two groups.
 *
 * Operations is the day-to-day work that arrives from customers: orders,
 * quotes, tickets, stock. Content is what the public site shows. They are
 * separated because they are different jobs done at different times, and
 * because mixing "how many do I have" with "what does the page say" is how
 * stock counts end up being edited on two screens.
 */
const NAV_GROUPS: { heading: string | null; items: { href: string; label: string }[] }[] = [
  {
    heading: null,
    items: [{ href: '/admin', label: 'Dashboard' }],
  },
  {
    heading: 'Operations',
    items: [
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/quotes', label: 'Quotes' },
      { href: '/admin/inventory', label: 'Inventory' },
      // Next to Inventory, because they are the same kind of job: scan a list,
      // change one number per row. Both edit a single column on `components`.
      { href: '/admin/pricing', label: 'Pricing' },
      { href: '/admin/customers', label: 'Customers' },
      { href: '/admin/builds', label: 'Saved builds' },
      { href: '/admin/support', label: 'Support' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/content/products', label: 'Products' },
      { href: '/admin/content/refurbished', label: 'Refurbished' },
      { href: '/admin/content/builds', label: 'PC builds' },
      { href: '/admin/content/portfolio', label: 'Portfolio' },
      { href: '/admin/content/services', label: 'Services' },
      { href: '/admin/content/reviews', label: 'Reviews' },
      { href: '/admin/content/promotions', label: 'Promotions' },
      { href: '/admin/content/categories', label: 'Categories' },
    ],
  },
  {
    heading: null,
    items: [{ href: '/admin/settings', label: 'Settings' }],
  },
];

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  // The authorization check. Middleware only verifies that someone is signed
  // in; this verifies the role, server-side, on every request. Row Level
  // Security enforces it a second time at the database.
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-ink-900">
      <div className="border-b border-ink-700 bg-ink-950">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="text-sm font-semibold tracking-tight text-white">
            PC Builders Canada
            <span className="ml-2 rounded border border-gold-600/40 bg-gold-600/10 px-1.5 py-0.5 text-[0.65rem] tracking-wide text-gold-400 uppercase">
              Admin
            </span>
          </Link>

          {!isStripeLiveMode ? (
            <span className="hidden rounded border border-info-500/40 bg-info-500/10 px-2 py-0.5 text-xs text-info-400 sm:inline">
              Stripe test mode
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ink-400 sm:inline">{admin.email}</span>
            <Link href="/" className="text-sm text-ink-300 hover:text-white">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <nav aria-label="Admin" className="lg:sticky lg:top-6 lg:self-start">
            <div className="thin-scroll flex gap-4 overflow-x-auto pb-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
              {NAV_GROUPS.map((group, index) => (
                <div key={group.heading ?? `group-${index}`}>
                  {group.heading ? (
                    <p className="mb-1 hidden px-3 text-[0.65rem] font-semibold tracking-[0.16em] text-ink-500 uppercase lg:block">
                      {group.heading}
                    </p>
                  ) : null}
                  <ul className="flex gap-1 lg:flex-col">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-md px-3 py-2 text-sm whitespace-nowrap text-ink-300 transition-colors hover:bg-ink-800 hover:text-white"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
