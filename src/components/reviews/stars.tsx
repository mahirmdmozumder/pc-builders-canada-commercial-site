import { cn } from '@/lib/utils';

/**
 * A star rating, as an image with a text label rather than five decorative
 * glyphs.
 *
 * A screen reader reading "star star star star star" tells a listener nothing
 * about the rating, and five separate characters is what most implementations
 * produce. So the whole row is one `img` role with the rating spelled out, and
 * the shapes themselves are hidden.
 *
 * Half-stars are supported because a genuine average is 4.3, not 4. Rounding an
 * average to the nearest whole star overstates or understates every product that
 * is not exactly on a boundary.
 */
export function Stars({
  rating,
  size = 'md',
  className,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const dimension = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-6' : 'size-4';

  return (
    <span
      role="img"
      aria-label={`${clamped} out of 5 stars`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {[1, 2, 3, 4, 5].map((position) => {
        // Portion of THIS star that should be filled, 0 to 1.
        const fill = Math.max(0, Math.min(1, clamped - (position - 1)));
        return <Star key={position} fill={fill} className={dimension} />;
      })}
    </span>
  );
}

function Star({ fill, className }: { fill: number; className: string }) {
  const path =
    'M12 2.5l2.9 6.05 6.6.83-4.85 4.55 1.22 6.57L12 17.3l-5.87 3.2 1.22-6.57L2.5 9.38l6.6-.83L12 2.5z';

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      {/* The empty shape underneath, so a partial star reads as partial rather
          than as a smaller star. */}
      <path d={path} className="fill-ink-700" />
      {fill > 0 ? (
        /* A CSS inset clip rather than an SVG <clipPath> with an id. Ids have to
           be unique per document, and this component renders several times on a
           product page — an id derived from the fill percentage would collide
           between the summary and each individual review. `inset` needs no id at
           all.
           A hard clip rather than a gradient, too: a gradient stop renders as a
           soft edge, which at 14px reads as a rendering fault. */
        <path
          d={path}
          className="fill-gold-500"
          style={{ clipPath: `inset(0 ${((1 - fill) * 100).toFixed(2)}% 0 0)` }}
        />
      ) : null}
    </svg>
  );
}

/** The interactive version, for the review form. */
export function StarInput({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (rating: number) => void;
  name: string;
}) {
  return (
    // A radio group, not five buttons. Radios give keyboard arrow navigation,
    // a single tab stop and correct announcement of "3 of 5 selected" for free.
    <fieldset className="border-0 p-0">
      <legend className="sr-only">Rating out of 5</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((position) => (
          <label
            key={position}
            className="cursor-pointer p-0.5"
            title={`${position} star${position === 1 ? '' : 's'}`}
          >
            <input
              type="radio"
              name={name}
              value={position}
              checked={value === position}
              onChange={() => onChange(position)}
              className="peer sr-only"
              required
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className={cn(
                'size-7 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500',
                position <= value ? 'fill-gold-500' : 'fill-ink-700 hover:fill-ink-600',
              )}
            >
              <path d="M12 2.5l2.9 6.05 6.6.83-4.85 4.55 1.22 6.57L12 17.3l-5.87 3.2 1.22-6.57L2.5 9.38l6.6-.83L12 2.5z" />
            </svg>
            <span className="sr-only">
              {position} star{position === 1 ? '' : 's'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
