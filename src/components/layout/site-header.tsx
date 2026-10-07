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
 * accident when a pointer crosses them on the way somewhere else. A laptop with
 * a touchscreen is the case that settles it: there is no hover state to rely on.
 */

/**
 * Main navigation.
 *
 * ---------------------------------------------------------------------------
 * SHOP IS A DISCLOSURE AGAIN, AND WHY THE ARGUMENT FOR REMOVING IT WAS WRONG
 * ---------------------------------------------------------------------------
 * It was a dropdown, then a plain link, and is a disclosure again. The reason
 * for flattening it was recorded here as: the shop became one page listing
 * everything, so a menu whose only job was choosing between category routes had
 * nothing left to do.
 *
 * That contained a mistake. The category routes are not duplicates of /shop.
 * /shop lists PRODUCTS; /workstations explains what a render node, a compile
 * machine and a simulation box each want, and /gaming-pcs explains what
 * actually changes frame rate. None of that is on /shop and none of it is
 * reachable from a product filter.
 *
 * Worse, the same note said those pages had "moved to the shop section list" —
 * and that list renders only inside the mobile drawer. So from 1280px up, six
 * category pages and four company pages were reachable only from the footer.
 * The phone had better navigation than the desktop, which is backwards.
 *
 * So the disclosure is back, with /shop itself as its first item so the flat
 * link is not lost. It is fed by the same SHOP_SECTIONS array the drawer uses,
 * because two hand-kept copies of a menu is how one of them goes stale.
 *
 * ---------------------------------------------------------------------------
 * FOUR ITEMS, NOT EIGHT
 * ---------------------------------------------------------------------------
 * Eight links plus a logo and two buttons did not fit a 1024px laptop without
 * shrinking the type, and eight is past the point where a bar is scanned rather
 * than read.
 *
 * What moved and why:
 *
 *   Pre-built Gaming PCs, Workstations  -> the Shop disclosure. They were
 *     sent to the drawer-only section list, which is the bug described above.
 *     Both keep their own URLs, pages and sitemap entries; nothing redirects.
 *
 *   Portfolio, About, Contact           -> the footer, where two of the three
 *     already appeared. None is a buying step; a visitor looks for them
 *     deliberately, and the footer is where people look.
 *
 * Services STAYS in the bar. It fronts thirteen service pages written to rank
 * for things like "PC repair Toronto", and burying it would cut the internal
 * link path those depend on.
 *
 * POS Systems is its own item rather than folded into Services, because a
 * restaurant owner looking for a till and a homeowner with a dead PC are
 * different people who do not use each other's words.
 */
const NAV = [
  { href: '/build', label: 'Build your PC' },
  { href: '/shop', label: 'Shop' },
  { href: '/services', label: 'Services' },
  { href: '/pos', label: 'POS Systems' },
];

/** Shown in the mobile menu under Shop, so the sections stay discoverable. */
const SHOP_SECTIONS = [
  { href: '/gaming-pcs', label: 'Pre-built gaming PCs' },
  { href: '/workstations', label: 'Workstations' },
  { href: '/networking', label: 'Networking & switches' },
  { href: '/nas', label: 'NAS & storage' },
  { href: '/mini-pcs', label: 'Mini PCs & Pi' },
  { href: '/refurbished', label: 'Open box & refurbished' },
];

/**
 * Whether a path belongs under Shop, so the bar item stays marked.
 *
 * Exported and pure so it can be tested, because the cases that matter are the
 * ones easiest to get wrong by hand: a DETAIL page three levels in
 * (/workstations/creator-workstation) has to count, and a path that merely
 * starts with the same letters (/shopping, /nascar) must not. The second kind
 * is what a naive startsWith check gets wrong.
 */
export function isShopPath(pathname: string): boolean {
  const paths = ['/shop', ...SHOP_SECTIONS.map((section) => section.href)];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Secondary pages, listed in the mobile menu under the shop sections.
 *
 * They are in the footer on every page too. Repeating them here is for the
 * phone, where the footer is a long scroll away and the menu is already open.
 */
const COMPANY_LINKS = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
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
          {NAV.map((item) =>
            item.href === '/shop' ? (
              <ShopMenu key={item.href} pathname={pathname} />
            ) : (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ),
          )}
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

            <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-ink-400 uppercase">
              Company
            </p>
            {COMPANY_LINKS.map((item) => (
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

/**
 * The Shop disclosure in the desktop bar.
 *
 * ---------------------------------------------------------------------------
 * WHY "SHOP" IS A BUTTON AND /shop IS THE FIRST ITEM
 * ---------------------------------------------------------------------------
 * One control cannot both navigate and open a panel without one of the two
 * being a guess about intent. Making the bar item a button and putting "All
 * products" at the top of the panel keeps /shop exactly one click away while
 * giving the categories somewhere to live. The alternative — a link with a
 * separate chevron beside it — puts two targets a few pixels apart in a bar,
 * which is the layout people miss on a trackpad.
 *
 * CLOSING. Three ways out, because a panel that traps you is worse than no
 * panel: Escape, a pointer down anywhere outside it, and clicking any link in
 * it. The last is handled on the panel rather than per link, the same way the
 * mobile drawer does it.
 *
 * It deliberately does NOT close on navigation via an effect. Setting state in
 * an effect is what react-hooks/set-state-in-effect exists to catch, and the
 * three handlers above already cover every way a visitor actually leaves: they
 * either click something in the panel, click outside it, or press Escape.
 */
function ShopMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Any shop page keeps the bar item marked, so somebody three levels into a
  // category still sees where they are. See isShopPath.
  const active = isShopPath(pathname);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="shop-menu"
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
          active || open ? 'text-white' : 'text-ink-300 hover:text-white',
        )}
      >
        Shop
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          id="shop-menu"
          // One handler for every link in the panel, rather than one per link.
          onClick={() => setOpen(false)}
          className="absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 py-1.5 shadow-xl shadow-black/50"
        >
          <MenuLink href="/shop" label="All products" />
          <div className="my-1.5 border-t border-ink-700" />
          {SHOP_SECTIONS.map((section) => (
            <MenuLink key={section.href} href={section.href} label={section.label} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-800 hover:text-white"
    >
      {label}
    </Link>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-3.5 transition-transform', open && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
