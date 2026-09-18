import type { ComponentCategory } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';

/**
 * Component imagery.
 *
 * When a catalogue row has no image we draw a category glyph rather than
 * shipping a stock photo of a part we do not have a picture of. Admin can
 * attach a real image_url per component; this is the honest fallback.
 */
export function ComponentThumb({
  category,
  imageUrl,
  alt,
  className,
}: {
  category: ComponentCategory;
  imageUrl?: string | null;
  alt: string;
  className?: string;
}) {
  if (imageUrl) {
    // Catalogue images are arbitrary remote URLs set by an operator.
    // next/image would require every host to be allow-listed in next.config
    // before an admin could add a part, so a plain img is the right call here.
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn('size-full rounded-md object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex size-full items-center justify-center rounded-md border border-ink-700 bg-ink-800',
        className,
      )}
      role="img"
      aria-label={`${alt} (no product photo on file)`}
    >
      <CategoryGlyph category={category} />
    </div>
  );
}

export function CategoryGlyph({
  category,
  className,
}: {
  category: ComponentCategory;
  className?: string;
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cn('size-6 text-ink-400', className),
    'aria-hidden': true,
  };

  switch (category) {
    case 'cpu':
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <rect x="10" y="10" width="4" height="4" rx="0.5" />
          <path d="M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3" />
        </svg>
      );
    case 'motherboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="6" y="6" width="6" height="6" rx="1" />
          <path d="M15 6h3M15 9h3M6 15h12M6 18h8" />
        </svg>
      );
    case 'cooler':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 4c2.5 2 2.5 4.5 0 6M20 12c-2 2.5-4.5 2.5-6 0M12 20c-2.5-2-2.5-4.5 0-6M4 12c2-2.5 4.5-2.5 6 0" />
        </svg>
      );
    case 'ram':
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="9" rx="1" />
          <path d="M6 16v2M10 16v2M14 16v2M18 16v2M5 10h3M10 10h3M15 10h4" />
        </svg>
      );
    case 'gpu':
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="10" rx="1.5" />
          <circle cx="8" cy="12" r="2.5" />
          <circle cx="15" cy="12" r="2.5" />
          <path d="M5 17v3" />
        </svg>
      );
    case 'storage':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="8" rx="1" />
          <path d="M6 12h6M17 12h1" />
          <path d="M3 16v2h4v-2" />
        </svg>
      );
    case 'psu':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <circle cx="9" cy="12" r="3" />
          <path d="M15 10h3M15 13h3M15 16h2" />
        </svg>
      );
    case 'case':
      return (
        <svg {...common}>
          <rect x="5" y="2.5" width="14" height="19" rx="1.5" />
          <path d="M8 6h8M8 9h5" />
          <circle cx="12" cy="15" r="3" />
        </svg>
      );
    case 'os':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="1.5" />
          <path d="M9 21h6M12 17v4M3 13h18" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 7h16v10H4z" />
          <path d="M8 7V5h8v2M8 17v2h8v-2" />
        </svg>
      );
  }
}
