import Link from 'next/link';

/**
 * A photographed navigation card, used by both homepage card rows.
 *
 * ---------------------------------------------------------------------------
 * ONE COMPONENT FOR BOTH ROWS
 * ---------------------------------------------------------------------------
 * The two rows ("Custom PC builds / Pre-built / Shop / Repairs" and "Beyond the
 * desktop") were separately written markup that happened to look alike. They now
 * share this, because two near-identical card styles on one page is how a site
 * drifts into looking slightly homemade — one gets a hover state or a radius
 * tweak and the other does not.
 *
 * ---------------------------------------------------------------------------
 * HOW THE PHOTO IS TREATED
 * ---------------------------------------------------------------------------
 * COVER, NOT CONTAIN, and at a fixed 16:10. These are scene photographs rather
 * than cut-out product shots, so they fill their frame properly; letterboxing
 * them would look like a mistake. The ratio is fixed so all four cards in a row
 * are the same height before anything loads, and the row does not reflow as
 * images arrive.
 *
 * A DARK SCRIM over the bottom of the photo. Without it the title would sit on
 * whatever the photograph happens to be, and contrast would be a matter of luck
 * per image. The gradient guarantees the text is legible over all eight of them
 * without hand-tuning any.
 *
 * LAZY BY DEFAULT, EAGER FOR THE FIRST ROW. The top row is near the fold and is
 * part of what the page is measured on; the second row is a long scroll down and
 * has no business being fetched before somebody gets there.
 *
 * The photo is decorative: the card's own heading already names the destination,
 * so an alt text repeating it would be read out twice. Hence `alt=""`.
 */
export interface NavCardItem {
  href: string;
  title: string;
  body: string;
  cta: string;
  /** Published path under /public. */
  image: string;
}

export function NavCard({ item, priority = false }: { item: NavCardItem; priority?: boolean }) {
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-colors hover:border-gold-600/50"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-850">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {/* Grounds the photo against the card body so the join does not read as
            two separate blocks stacked on each other. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900 via-ink-900/55 to-transparent"
        />
      </div>

      {/* Gold wash on hover, opacity only so it composites on the GPU. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,60,0.10),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex flex-1 flex-col p-6">
        <h3 className="text-base font-semibold text-white">{item.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">{item.body}</p>
        <span className="mt-5 text-sm font-medium text-gold-400 group-hover:text-gold-300">
          {item.cta} &rarr;
        </span>
      </div>
    </Link>
  );
}
