import Link from 'next/link';
import { PageShell } from '@/components/ui';
import type { PublicPromotion } from '@/lib/cms/types';

/**
 * Promotional strip under the hero.
 *
 * Renders NOTHING when there are no live promotions, which is the normal
 * state. That is deliberate: the homepage was designed without this section,
 * and adding an empty container or a placeholder would change the page for
 * everyone in order to serve a feature nobody is using yet.
 *
 * What counts as live is decided by the database view, which applies both the
 * publish state and the schedule window, so this component never has to reason
 * about dates and cannot disagree with the admin about what is showing.
 */
export function PromotionStrip({ promotions }: { promotions: PublicPromotion[] }) {
  if (promotions.length === 0) return null;

  return (
    <section className="border-b border-ink-700 bg-ink-850">
      <PageShell className="py-8 sm:py-10">
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.map((promo) => (
            <article
              key={promo.id}
              className="relative flex gap-5 overflow-hidden rounded-xl border border-gold-600/35 bg-ink-900 p-5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,160,60,0.10),transparent_65%)]"
              />
              {promo.image_url ? (
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={promo.image_url} alt="" className="size-full object-cover" />
                </div>
              ) : null}

              <div className="relative min-w-0 flex-1">
                {promo.subtitle ? (
                  <p className="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase">
                    {promo.subtitle}
                  </p>
                ) : null}
                <h2 className="mt-1 text-lg leading-tight font-semibold text-white">
                  {promo.title}
                </h2>
                {promo.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{promo.description}</p>
                ) : null}
                {promo.button_text && promo.button_url ? (
                  <Link
                    href={promo.button_url}
                    className="mt-3 inline-block text-sm font-medium text-gold-400 hover:text-gold-300"
                  >
                    {promo.button_text} &rarr;
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </PageShell>
    </section>
  );
}
