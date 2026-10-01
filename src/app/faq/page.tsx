import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, Card, PageHeader, PageShell } from '@/components/ui';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { FaqJsonLd } from '@/components/seo/structured-data';
import { ALL_FAQS, FAQ_GROUPS } from '@/content/faqs';
import { REGION_LABEL } from '@/lib/seo/business';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about custom PC builds, repairs and upgrades, shipping and local pickup, our 1-year workmanship warranty, returns, and how manufacturer warranties differ.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Frequently Asked Questions | PC Builders Canada',
    description:
      'Custom builds, repairs, shipping and pickup, warranty and returns — answered plainly.',
    url: '/faq',
    type: 'website',
  },
};

/**
 * Frequently asked questions.
 *
 * ---------------------------------------------------------------------------
 * WHY <details> AND NOT A JAVASCRIPT ACCORDION
 * ---------------------------------------------------------------------------
 * Native <details>/<summary> gives keyboard operation, correct screen-reader
 * announcement, expand-on-find in the browser's own page search, and a working
 * page before any JavaScript runs. A hand-built accordion has to reimplement all
 * four, usually reimplements two, and ships a client bundle to do it.
 *
 * It also means this page is a server component with no hydration at all, which
 * matters because it is a page people reach from search and read once.
 *
 * The first group is open by default so the page never looks like a list of
 * inert headings, and so there is text above the fold for a crawler.
 *
 * ---------------------------------------------------------------------------
 * ON FAQPage STRUCTURED DATA
 * ---------------------------------------------------------------------------
 * Emitted because the markup mirrors questions and answers that are genuinely
 * visible on the page, which is the actual requirement. Worth being realistic
 * about the payoff: since 2023 Google has restricted FAQ rich results to
 * government and health sites, so this is very unlikely to produce the expanded
 * snippets it once did. It stays because it is accurate, it costs nothing, and
 * other consumers read it — not because it is expected to win a rich result.
 */
export default function FaqPage() {
  return (
    <>
      <FaqJsonLd
        items={ALL_FAQS.map((faq) => ({
          question: faq.question,
          // The schema carries the same words the page renders. Joining the
          // paragraphs is the whole answer, not a summary of it.
          answer: faq.answer.join(' '),
        }))}
      />

      <PageHeader
        eyebrow="Help"
        title="Frequently asked questions"
        description="Builds, repairs, shipping, warranty and returns. If the answer you need is not here, ask — an unanswered question is a gap on this page, not a gap in your understanding."
        actions={
          <>
            <ButtonLink href="/contact">Ask us something</ButtonLink>
            <ButtonLink href="/quote" variant="secondary">
              Request a quote
            </ButtonLink>
          </>
        }
      />

      <PageShell className="py-10 sm:py-14">
        <div className="mb-8">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'FAQ', href: '/faq' },
            ]}
          />
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <div className="max-w-3xl space-y-12">
            {FAQ_GROUPS.map((group, groupIndex) => (
              <section key={group.id} id={group.id} className="scroll-mt-24">
                <h2 className="text-xl font-semibold tracking-tight text-white">{group.title}</h2>
                <p className="mt-1.5 text-sm text-ink-400">{group.blurb}</p>

                <div className="mt-5 divide-y divide-ink-700 border-t border-ink-700">
                  {group.faqs.map((faq, faqIndex) => (
                    <details
                      key={faq.question}
                      // Only the very first question starts open, so the page has
                      // readable content immediately without becoming a wall.
                      open={groupIndex === 0 && faqIndex === 0}
                      className="group py-1"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 text-left font-medium text-ink-100 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                        <span>{faq.question}</span>
                        {/* Rotates via the parent's open state, so there is no
                            JavaScript keeping an icon in sync with a panel. */}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-45"
                        >
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                      </summary>
                      <div className="space-y-3 pr-8 pb-4">
                        {faq.answer.map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-relaxed text-ink-300">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <Card className="border-gold-600/30 p-6">
              <h2 className="text-base font-semibold text-white">Still stuck?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Some things genuinely depend on your situation — what a repair will cost, how long a
                particular build will take, whether an upgrade is worth doing at all. Those get a
                real answer rather than a guess, which means asking.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/contact" className="font-medium text-gold-400 hover:text-gold-300">
                  Contact us &rarr;
                </Link>
                <Link href="/quote" className="font-medium text-gold-400 hover:text-gold-300">
                  Get a written quote &rarr;
                </Link>
              </div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24">
            <nav aria-label="Question topics">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
                Jump to
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {FAQ_GROUPS.map((group) => (
                  <li key={group.id}>
                    <a href={`#${group.id}`} className="text-ink-400 hover:text-gold-400">
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-8 border-t border-ink-700 pt-6">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
                The full terms
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                These answers summarise the policies. Where the wording matters, the policy pages are
                what we actually operate by.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/legal/warranty" className="text-ink-400 hover:text-gold-400">
                    Warranty policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/refunds" className="text-ink-400 hover:text-gold-400">
                    Refund policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/shipping" className="text-ink-400 hover:text-gold-400">
                    Shipping policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="text-ink-400 hover:text-gold-400">
                    Terms of service
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-ink-400 hover:text-gold-400">
                    Privacy policy
                  </Link>
                </li>
              </ul>
            </div>

            <p className="mt-8 border-t border-ink-700 pt-6 text-xs leading-relaxed text-ink-500">
              On-site work covers {REGION_LABEL}. Hardware ships Canada-wide.
            </p>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
