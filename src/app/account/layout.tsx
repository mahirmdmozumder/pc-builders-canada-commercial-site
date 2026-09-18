import Link from 'next/link';
import { PageShell } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/account/sign-out-button';

const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/builds', label: 'Saved builds' },
  { href: '/account/quotes', label: 'Quotes' },
  { href: '/account/support', label: 'Support' },
  { href: '/account/profile', label: 'Profile' },
];

export default async function AccountLayout({ children }: LayoutProps<'/account'>) {
  // Server-side gate. Middleware also redirects anonymous requests, but this
  // is the check that actually decides, and it runs on every render.
  const user = await requireUser();

  return (
    <PageShell className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-2 border-b border-ink-700 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Your account</h1>
          <p className="mt-1 text-sm text-ink-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' ? (
            <Link
              href="/admin"
              className="rounded-md border border-ink-600 px-3 py-1.5 text-sm text-ink-200 hover:text-white"
            >
              Admin
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Account" className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
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

        <div className="min-w-0">{children}</div>
      </div>
    </PageShell>
  );
}
