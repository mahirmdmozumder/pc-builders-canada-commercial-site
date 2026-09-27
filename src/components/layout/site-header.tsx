'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

const SHOP_LINKS = [
  { href: '/networking', label: 'Networking & server', hint: 'Switches, PoE, 2.5GbE' },
  { href: '/nas', label: 'NAS & storage', hint: 'Enclosures and NAS drives' },
  { href: '/mini-pcs', label: 'Mini PCs & Pi', hint: 'Small always-on machines' },
  { href: '/refurbished', label: 'Refurbished', hint: 'Tested, priced accordingly' },
];

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
  const [shopOpen, setShopOpen] = useState(false);
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const shopRef = useRef<HTMLDivElement>(null);

  // The cart count lives in localStorage, which the server cannot know, so it
  // stays at zero until hydration rather than causing a markup mismatch.
  const count = hydrated ? lines.reduce((sum, l) => sum + l.quantity, 0) : 0;

  const shopActive = SHOP_LINKS.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );

  // Close the disclosure on Escape or on a click elsewhere. Without both, an
  // open menu is a trap for a keyboard user and clutter for everyone else.
  useEffect(() => {
    if (!shopOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setShopOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!shopRef.current?.contains(event.target as Node)) setShopOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [shopOpen]);

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

        <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.slice(0, 3).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          <div className="relative" ref={shopRef}>
            <button
              type="button"
              aria-expanded={shopOpen}
              aria-controls="shop-menu"
              onClick={() => setShopOpen((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors',
                shopActive || shopOpen ? 'text-white' : 'text-ink-300 hover:text-white',
              )}
            >
              Shop
              <ChevronIcon className={cn('size-3.5 transition-transform', shopOpen && 'rotate-180')} />
            </button>

            {shopOpen ? (
              <div
                id="shop-menu"
                className="absolute top-full left-0 mt-1 w-72 overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-2xl shadow-black/60"
              >
                <ul className="p-1.5">
                  {SHOP_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setShopOpen(false)}
                        className="block rounded-md px-3 py-2.5 hover:bg-ink-800"
                      >
                        <span className="block text-sm font-medium text-ink-100">{link.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-400">{link.hint}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {NAV.slice(3).map((item) => (
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
        <nav
          id="mobile-nav"
          className="border-t border-ink-700 bg-ink-850 lg:hidden"
          aria-label="Main"
          onClick={() => setOpen(false)}
        >
          <div className="space-y-1 px-4 py-3">
            {NAV.slice(0, 3).map((item) => (
              <MobileLink key={item.href} href={item.href} label={item.label} />
            ))}

            {/* On a phone there is room to show the group inline, so there is no
                reason to make somebody tap twice for it. */}
            <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-ink-400 uppercase">
              Shop
            </p>
            {SHOP_LINKS.map((link) => (
              <MobileLink key={link.href} href={link.href} label={link.label} />
            ))}

            <div className="pt-2">
              {NAV.slice(3).map((item) => (
                <MobileLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>

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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
