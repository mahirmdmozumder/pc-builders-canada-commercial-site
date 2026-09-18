'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { useClientSession } from '@/lib/auth/use-session';
import { cn } from '@/lib/utils';
import { buttonClass } from '@/components/ui';

const NAV = [
  { href: '/build', label: 'Build your PC' },
  { href: '/gaming-pcs', label: 'Gaming PCs' },
  { href: '/workstations', label: 'Workstations' },
  { href: '/services', label: 'Services' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { signedIn, isAdmin } = useClientSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lines = useCart((s) => s.lines);

  // Cart count comes from localStorage, which the server cannot know. Render
  // nothing until mount so the server and client markup agree.
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const count = mounted ? lines.reduce((sum, l) => sum + l.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="PC Builders Canada home">
          <MapleMark />
          <span className="hidden text-sm leading-tight font-semibold tracking-tight text-white sm:block">
            PC Builders
            <span className="block text-[0.65rem] font-medium tracking-[0.2em] text-ink-300 uppercase">
              Canada
            </span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'text-white' : 'text-ink-300 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            className="relative rounded-md p-2 text-ink-300 transition-colors hover:text-white"
            aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ', empty'}`}
          >
            <CartIcon />
            {count > 0 ? (
              <span className="tnum absolute -top-0.5 -right-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-maple-600 px-1 text-[0.65rem] font-semibold text-white">
                {count}
              </span>
            ) : null}
          </Link>

          <Link
            href={signedIn ? (isAdmin ? '/admin' : '/account') : '/login'}
            className="hidden rounded-md px-3 py-2 text-sm text-ink-300 transition-colors hover:text-white sm:block"
          >
            {signedIn ? (isAdmin ? 'Admin' : 'Account') : 'Sign in'}
          </Link>

          <Link href="/quote" className={cn(buttonClass('primary', 'sm'), 'hidden sm:inline-flex')}>
            Get a quote
          </Link>

          <button
            type="button"
            className="rounded-md p-2 text-ink-200 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-ink-700 bg-ink-850 lg:hidden" aria-label="Main">
          <div className="space-y-1 px-4 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2.5 text-sm text-ink-200 hover:bg-ink-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-700 pt-3">
              <Link
                href={signedIn ? (isAdmin ? '/admin' : '/account') : '/login'}
                className={cn(buttonClass('secondary', 'sm'), 'flex-1')}
              >
                {signedIn ? (isAdmin ? 'Admin' : 'Account') : 'Sign in'}
              </Link>
              <Link href="/quote" className={cn(buttonClass('primary', 'sm'), 'flex-1')}>
                Get a quote
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MapleMark() {
  return (
    <span
      className="flex size-9 items-center justify-center rounded-md border border-maple-600/50 bg-maple-600/10"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 fill-maple-500">
        <path d="M12 2.5 13.4 6l2.3-.7-.6 2.4 3.3-.6-1.1 2.3 2.2.6-3.5 2.9.6 1.7-3.6-.6.3 4h-2.6l.3-4-3.6.6.6-1.7L4.5 10l2.2-.6-1.1-2.3 3.3.6-.6-2.4 2.3.7z" />
      </svg>
    </span>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
