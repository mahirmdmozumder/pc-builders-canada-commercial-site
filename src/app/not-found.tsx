import Link from 'next/link';
import { ButtonLink, PageShell } from '@/components/ui';

/**
 * 404.
 *
 * A dead end is where people leave, so this one offers routes out rather than
 * just an apology. The links cover the things somebody is most likely to have
 * been looking for when a URL went stale: a product that was unpublished, a
 * service page, or the shop.
 *
 * Next.js returns a real 404 status with this page, which is what matters for
 * search — a soft 404 keeps a dead URL in the index pointing at nothing.
 */
export default function NotFound() {
  return (
    <PageShell className="py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          That page does not exist
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-300">
          The link may be out of date, or a product may have been withdrawn. Here is where most
          people are heading.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/shop">Browse the shop</ButtonLink>
          <ButtonLink href="/build" variant="secondary">
            Build a PC
          </ButtonLink>
        </div>
      </div>

      <nav aria-label="Popular pages" className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-center text-xs font-semibold tracking-[0.18em] text-ink-400 uppercase">
          Or try one of these
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/', label: 'Home', hint: 'Everything we do' },
            { href: '/shop', label: 'Shop', hint: 'Parts, networking, NAS, mini PCs' },
            { href: '/gaming-pcs', label: 'Pre-built gaming PCs', hint: 'Ready to order' },
            { href: '/services', label: 'All services', hint: 'Repairs, networking, IT support' },
            { href: '/services/diagnostics', label: 'PC repair & diagnostics', hint: 'Something is wrong' },
            { href: '/services/onsite-it', label: 'On-site IT support', hint: 'We come to you' },
            { href: '/portfolio', label: 'Past work', hint: 'Builds we have finished' },
            { href: '/contact', label: 'Contact', hint: 'Ask us directly' },
            { href: '/quote', label: 'Get a quote', hint: 'Tell us what you need' },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-ink-700 bg-ink-850 px-4 py-3 transition-colors hover:border-gold-600/50 hover:bg-ink-800"
              >
                <span className="block text-sm font-medium text-ink-100">{item.label}</span>
                <span className="mt-0.5 block text-xs text-ink-400">{item.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PageShell>
  );
}
