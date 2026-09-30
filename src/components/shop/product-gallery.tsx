'use client';

import { useCallback, useEffect, useState } from 'react';
import { CategoryGlyph } from '@/components/configurator/component-thumb';
import { describeVideo, type ComponentCategory, type VideoSource } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';

/**
 * The product media gallery.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS HAND-WRITTEN AND NOT A CAROUSEL LIBRARY
 * ---------------------------------------------------------------------------
 * A gallery needs four behaviours: pick a thumbnail, step through, enlarge, and
 * work under a thumb. All four are a few lines of state and a CSS scroll-snap
 * rail. The smallest carousel packages that offer them ship 15-40 KB of
 * JavaScript, and they ship it to every visitor including the ones looking at a
 * product with one photo.
 *
 * ---------------------------------------------------------------------------
 * LOADING
 * ---------------------------------------------------------------------------
 * Only the first image is eager. Thumbnails and every other frame are lazy, and
 * the video is `preload="none"` — a product page must not download a 40 MB clip
 * because somebody landed on it from search. The frame reserves its aspect ratio
 * before anything arrives, so the page does not jump as images resolve.
 *
 * ---------------------------------------------------------------------------
 * WHEN THERE IS NOTHING
 * ---------------------------------------------------------------------------
 * A product with no photo gets the same honest placeholder the cards use: the
 * category glyph and the words "No photo available". It never borrows a stock
 * image of a part we do not have a picture of, which would be a small lie about
 * what is in the box.
 */

type MediaItem =
  | { kind: 'image'; src: string }
  | { kind: 'video'; video: VideoSource };

export function ProductGallery({
  imageUrl,
  galleryUrls,
  videoUrl,
  alt,
  category,
}: {
  imageUrl: string | null;
  galleryUrls: string[];
  videoUrl: string | null;
  alt: string;
  category: ComponentCategory;
}) {
  const video = describeVideo(videoUrl);

  // The primary image first, then the gallery, de-duplicated — an admin who
  // uploads the same file as both the primary and the first gallery slot should
  // not get two identical thumbnails.
  const images = Array.from(new Set([imageUrl, ...(galleryUrls ?? [])].filter(Boolean) as string[]));

  const media: MediaItem[] = [
    ...images.map((src): MediaItem => ({ kind: 'image', src })),
    ...(video ? [{ kind: 'video' as const, video }] : []),
  ];

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const current = media[Math.min(index, media.length - 1)];
  const imageCount = images.length;

  const step = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        if (media.length === 0) return 0;
        return (prev + delta + media.length) % media.length;
      });
    },
    [media.length],
  );

  // Keyboard control while the lightbox is open. Bound to the document rather
  // than to the overlay so it works before the overlay has taken focus, which
  // is the case immediately after a click.
  useEffect(() => {
    if (!lightbox) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    }
    document.addEventListener('keydown', onKey);
    // The page behind a full-screen overlay must not scroll under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, step]);

  if (media.length === 0) {
    return <EmptyFrame alt={alt} category={category} />;
  }

  return (
    <div className="space-y-3">
      <div className="group/frame relative">
        {current.kind === 'video' ? (
          <VideoFrame video={current.video} />
        ) : (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            // A single photo is still worth enlarging, so this is always a
            // button rather than only when there are several.
            aria-label={`Enlarge photo ${index + 1} of ${imageCount}`}
            className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-ink-700 bg-gradient-to-b from-ink-100 to-ink-200 aspect-[4/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={`${alt} — photo ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="absolute inset-0 size-full object-contain p-4 transition-transform duration-300 group-hover/frame:scale-[1.03]"
            />
          </button>
        )}

        {media.length > 1 ? (
          <>
            <ArrowButton side="left" onClick={() => step(-1)} />
            <ArrowButton side="right" onClick={() => step(1)} />
            <span className="tnum pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-1 text-xs text-ink-100 backdrop-blur-sm">
              {index + 1} / {media.length}
            </span>
          </>
        ) : null}
      </div>

      {media.length > 1 ? (
        /* A scroll rail, not a wrapping grid. Ten thumbnails wrapping onto three
           rows on a phone pushes the price below the fold, which is the one
           thing on this page that must not move. */
        <ul
          className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label="Product media"
        >
          {media.map((item, itemIndex) => (
            <li key={item.kind === 'image' ? item.src : 'video'} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-current={itemIndex === index ? 'true' : undefined}
                aria-label={
                  item.kind === 'video' ? 'Product video' : `Photo ${itemIndex + 1}`
                }
                className={cn(
                  'relative size-16 overflow-hidden rounded-md border transition-colors sm:size-18',
                  itemIndex === index
                    ? 'border-gold-500'
                    : 'border-ink-700 hover:border-gold-600/50',
                )}
              >
                {item.kind === 'video' ? (
                  <span className="flex size-full items-center justify-center bg-ink-850">
                    {item.video.poster ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.video.poster}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover opacity-70"
                        />
                        <PlayGlyph className="relative size-6 text-white" />
                      </>
                    ) : (
                      <PlayGlyph className="size-6 text-ink-300" />
                    )}
                  </span>
                ) : (
                  <span className="block size-full bg-gradient-to-b from-ink-100 to-ink-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-contain p-1.5"
                    />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox && current.kind === 'image' ? (
        <Lightbox
          src={current.src}
          alt={`${alt} — photo ${index + 1} of ${imageCount}`}
          position={`${index + 1} / ${media.length}`}
          onClose={() => setLightbox(false)}
          onPrev={media.length > 1 ? () => step(-1) : undefined}
          onNext={media.length > 1 ? () => step(1) : undefined}
        />
      ) : null}
    </div>
  );
}

/**
 * The video frame.
 *
 * A YouTube or Vimeo embed is NOT mounted until the visitor asks for it. An
 * iframe on page load pulls in several hundred kilobytes of third-party
 * JavaScript and sets cookies before anybody has pressed play, on a page most
 * visitors are reading for the price.
 */
function VideoFrame({ video }: { video: VideoSource }) {
  const [playing, setPlaying] = useState(false);

  if (video.kind === 'file') {
    return (
      <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-950 aspect-[4/3]">
        <video
          src={video.src}
          controls
          preload="none"
          playsInline
          className="size-full object-contain"
        />
      </div>
    );
  }

  if (playing) {
    return (
      <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-950 aspect-[4/3]">
        <iframe
          src={`${video.src}&autoplay=1`}
          title={video.label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group/play relative block w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-950 aspect-[4/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
    >
      {video.poster ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={video.poster}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover opacity-60 transition-opacity group-hover/play:opacity-75"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18),transparent_70%)]"
        />
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full border border-white/25 bg-ink-950/70 backdrop-blur-sm transition-transform group-hover/play:scale-105">
          <PlayGlyph className="size-6 text-white" />
        </span>
        <span className="text-xs tracking-wide text-ink-200 uppercase">{video.label}</span>
      </span>
    </button>
  );
}

function Lightbox({
  src,
  alt,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  alt: string;
  position: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      // Clicking the backdrop closes. The image itself stops propagation below,
      // so clicking the thing you came to look at does not dismiss it.
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border border-ink-600 bg-ink-900/80 text-ink-200 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      {onPrev ? <ArrowButton side="left" onClick={onPrev} inLightbox /> : null}
      {onNext ? <ArrowButton side="right" onClick={onNext} inLightbox /> : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-lg bg-ink-100 object-contain p-2"
      />

      <span className="tnum absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/80 px-3 py-1 text-xs text-ink-200">
        {position}
      </span>
    </div>
  );
}

function ArrowButton({
  side,
  onClick,
  inLightbox = false,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  inLightbox?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={cn(
        'absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border transition-colors',
        side === 'left' ? 'left-2 sm:left-3' : 'right-2 sm:right-3',
        inLightbox
          ? 'border-ink-600 bg-ink-900/80 text-ink-200 hover:text-white'
          : // Visible on touch, where there is no hover to reveal them.
            'border-ink-700/60 bg-ink-950/70 text-ink-100 backdrop-blur-sm hover:border-gold-600/60 hover:text-white',
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
        <path
          d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

function EmptyFrame({ alt, category }: { alt: string; category: ComponentCategory }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-850 aspect-[4/3]"
      role="img"
      aria-label={`${alt} — no photo available`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,var(--color-ink-400)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ink-400)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="flex size-16 items-center justify-center rounded-full border border-ink-700 bg-ink-900">
          <CategoryGlyph category={category} className="size-8 text-ink-500" />
        </span>
        <span className="text-xs tracking-wide text-ink-500 uppercase">No photo available</span>
        <span className="max-w-[16rem] text-center text-xs leading-relaxed text-ink-500">
          We photograph stock as it arrives rather than using manufacturer renders.
        </span>
      </div>
    </div>
  );
}
