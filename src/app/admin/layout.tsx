import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/session';
import { SignOutButton } from '@/components/account/sign-out-button';
import { isStripeLiveMode } from '@/lib/env';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/components', label: 'Components' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/builds', label: 'Builds' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/settings', label: 'Settings' },
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
            <span className="ml-2 rounded border border-maple-600/40 bg-maple-600/10 px-1.5 py-0.5 text-[0.65rem] tracking-wide text-maple-400 uppercase">
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
            <ul className="thin-scroll flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV.map((item) => (
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
          </nav>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
