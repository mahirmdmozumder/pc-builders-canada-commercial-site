import { CategoryGlyph } from '@/components/configurator/component-thumb';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, type ComponentCategory } from '@/lib/catalog/types';

/**
 * The image frame on a product card.
 *
 * Four decisions here, each of them about product photography specifically
 * rather than images in general.
 *
 * OBJECT-CONTAIN, NOT COVER. Product photos arrive at every aspect ratio a
 * manufacturer felt like shooting at. `cover` fills the frame tidily and
 * crops — which on a graphics card means slicing the ends off the card, and on
 * a tower means cutting the top and bottom away. `contain` shows the whole
 * product every time, and the frame absorbs the difference.
 *
 * A LIGHT BACKDROP. Most product shots are cut out on white. Dropped straight
 * onto this site's near-black they glare, and anything with a white background
 * ends up as a bright rectangle rather than a product. A soft, slightly cool
 * panel sits between the two, so a cut-out photo reads as a lit display case
 * rather than as a mistake. It also means photos shot on white and photos shot
 * on grey sit next to each other without one looking broken.
 *
 * A FIXED ASPECT RATIO. Every card in a grid reserves the same space before
 * anything loads, so the row does not reflow as images arrive. That is what
 * stops a listing jumping under the cursor mid-click.
 *
 * AN HONEST EMPTY STATE, BUT NOT AN APOLOGETIC ONE. No photo means the frame
 * says so. It never borrows a stock photo of a part we do not have a picture
 * of, which would be a small lie about what is in the box.
 *
 * What changed, and why: the frame used to lead with the words "No photo
 * available". That is honest but it draws the eye to an absence, and a grid of
 * cards where some rows apologise reads as a half-finished shop rather than a
 * catalogue that is still being photographed. So the tile now leads with the
 * BRAND, set large, with the category underneath. Same information, same
 * honesty — nobody could mistake it for a photograph — but it presents as a
 * deliberate placeholder instead of a missing asset.
 *
 * The brand is optional. Without it the tile falls back to the category label,
 * which is what the old empty state effectively showed.
 */
export function ProductImage({
  src,
  alt,
  category,
  brand,
  galleryCount = 0,
  className,
  ratio = 'wide',
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  category: ComponentCategory;
  /** Drawn large on the placeholder tile when there is no photograph. */
  brand?: string | null;
  /** Extra images beyond the primary, shown as a count badge. */
  galleryCount?: number;
  className?: string;
  ratio?: 'wide' | 'square';
  /** The first image on a page can skip lazy loading. */
  priority?: boolean;
}) {
  const frame = cn(
    'group/image relative w-full overflow-hidden rounded-lg border border-ink-700',
    ratio === 'square' ? 'aspect-square' : 'aspect-[4/3]',
    className,
  );

  if (!src) {
    return (
      <div
        className={cn(frame, 'bg-ink-850')}
        role="img"
        aria-label={`${alt} — no photo available`}
      >
        {/* Faint grid, so an empty frame reads as a deliberate placeholder
            rather than a failed image. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,var(--color-ink-400)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ink-400)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="flex size-10 items-center justify-center rounded-full border border-ink-700 bg-ink-900">
            <CategoryGlyph category={category} className="size-5 text-ink-500" />
          </span>
          {brand ? (
            <span className="line-clamp-2 text-sm font-semibold tracking-wide text-ink-300 uppercase sm:text-base">
              {brand}
            </span>
          ) : null}
          <span className="text-[0.7rem] tracking-wide text-ink-500 uppercase">
            {CATEGORY_LABELS[category]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(frame, 'bg-gradient-to-b from-ink-100 to-ink-200')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 size-full object-contain p-3 transition-transform duration-300 group-hover/image:scale-[1.04]"
      />

      {galleryCount > 0 ? (
        <span className="absolute right-2 bottom-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[0.65rem] font-medium text-ink-100 backdrop-blur-sm">
          +{galleryCount} photo{galleryCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The same frame for a build rather than a single part.
 *
 * Builds are photographed in situ, not cut out on white, so these use `cover`
 * and a dark backdrop: a photo of a finished machine fills its frame properly
 * and looks worse letterboxed.
 */
export function BuildImage({
  src,
  alt,
  galleryCount = 0,
  className,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  galleryCount?: number;
  className?: string;
  priority?: boolean;
}) {
  const frame = cn(
    'group/image relative w-full overflow-hidden rounded-lg border border-ink-700 aspect-[16/10]',
    className,
  );

  if (!src) {
    return (
      <div className={cn(frame, 'bg-ink-850')} role="img" aria-label={`${alt} — no photo available`}>
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.12),transparent_70%)]"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-full border border-ink-700 bg-ink-900">
            <CategoryGlyph category="case" className="size-6 text-ink-500" />
          </span>
          <span className="text-[0.7rem] tracking-wide text-ink-500 uppercase">
            No photo available
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(frame, 'bg-ink-900')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover/image:scale-[1.03]"
      />
      {galleryCount > 0 ? (
        <span className="absolute right-2 bottom-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[0.65rem] font-medium text-ink-100 backdrop-blur-sm">
          +{galleryCount} photo{galleryCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}
