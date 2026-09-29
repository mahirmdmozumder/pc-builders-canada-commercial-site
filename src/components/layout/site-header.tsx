'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { useClientSession } from '@/lib/auth/use-session';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { cn } from '@/lib/utils';
import { buttonClass } from '@/components/ui';

/**
 * Navigation.
 *
 * The shop grew from four destinations to eight, which is more than fits on one
 * row at a readable size. Rather than shrinking the type, the product
 * categories are grouped behind one disclosure and everything else stays flat.
 *
 * The group is a CLICK disclosure, not a hover menu. Hover menus cannot be
 * operated by touch or keyboard without extra scaffolding, and they open by
 * accident when a pointer crosses them on the way somewhere else.
 */

/**
 * Main navigation.
 *
 * The Shop group used to be a dropdown. It is a plain link now, because the
 * shop became one page listing everything rather than six category routes, and
 * a menu whose only job was to choose between those routes had nothing left to
 * do.
 *
 * The flat bar appears at XL rather than LG. "Pre-built Gaming PCs" is a long
 * label and eight items plus the logo and the two buttons do not fit on a
 * 1024px laptop without shrinking the type to the point of being hard to read.
 * Below XL the same links are in the menu, in full, with nothing hidden.
 */
const NAV = [
  { href: '/build', label: 'Build your PC' },
  { href: '/shop', label: 'Shop' },
  { href: '/gaming-pcs', label: 'Pre-built Gaming PCs' },
  { href: '/workstations', label: 'Workstations' },
  { href: '/services', label: 'Services' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/** Shown in the mobile menu under Shop, so the sections stay discoverable. */
const SHOP_SECTIONS = [
  { href: '/networking', label: 'Networking & switches' },
  { href: '/nas', label: 'NAS & storage' },
  { href: '/mini-pcs', label: 'Mini PCs & Pi' },
  { href: '/refurbished', label: 'Open box & refurbished' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { signedIn, isAdmin } = useClientSession();
  const [open, setOpen] = useState(false);
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();

  // The cart count lives in localStorage, which the server cannot know, so it
  // stays at zero until hydration rather than causing a markup mismatch.
  const count = hydrated ? lines.reduce((sum, l) => sum + l.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
      {/* Hairline of brand gold along the top edge. */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-gold-600/60 to-transparent"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="PC Builders Canada home"
        >
          <Image
            src="/logo-mark.png"
            alt=""
            width={292}
            height={278}
            priority
            className="size-9 w-auto object-contain"
          />
          <span className="hidden text-sm leading-tight font-semibold tracking-tight text-white sm:block">
            PC Builders
            <span className="block text-[0.65rem] font-medium tracking-[0.2em] text-gold-400 uppercase">
              Canada
            </span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            className="relative rounded-md p-2 text-ink-300 transition-colors hover:text-white"
            aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ', empty'}`}
          >
            <CartIcon />
            {count > 0 ? (
              <span className="tnum absolute -top-0.5 -right-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold-500 px-1 text-[0.65rem] font-semibold text-ink-950">
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
            className="rounded-md p-2 text-ink-200 xl:hidden"
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
        <nav
          id="mobile-nav"
          className="border-t border-ink-700 bg-ink-850 xl:hidden"
          aria-label="Main"
          onClick={() => setOpen(false)}
        >
          <div className="space-y-1 px-4 py-3">
            {NAV.map((item) => (
              <MobileLink key={item.href} href={item.href} label={item.label} />
            ))}

            {/* The shop sections still have their own pages; listing them here
                keeps them one tap away without putting a menu in the bar. */}
            <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-ink-400 uppercase">
              Shop sections
            </p>
            {SHOP_SECTIONS.map((item) => (
              <MobileLink key={item.href} href={item.href} label={item.label} />
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

function NavLink({
  item,
  pathname,
}: {
  item: { href: string; label: string };
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
        active ? 'text-white' : 'text-ink-300 hover:text-white',
      )}
    >
      {item.label}
    </Link>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2.5 text-sm text-ink-200 hover:bg-ink-800 hover:text-white"
    >
      {label}
    </Link>
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
