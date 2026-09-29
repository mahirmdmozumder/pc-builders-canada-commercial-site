'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isManagedUpload, storagePathFromUrl } from '@/lib/storage/paths';

/**
 * Image upload for the admin.
 *
 * Two things here are load-bearing rather than polish.
 *
 * RESIZING HAPPENS IN THE BROWSER, before anything is sent. A photo off a
 * phone is commonly 4000px wide and several megabytes; served to a visitor on
 * mobile data that is a genuinely bad experience, and it fills the storage
 * quota roughly thirty times faster than it needs to. Downscaling to 1600px
 * and re-encoding as WebP turns a 6 MB photo into about 200 KB, costs nothing,
 * and happens before the upload rather than after.
 *
 * THE FILE GOES STRAIGHT TO SUPABASE, not through our own API. A Vercel route
 * handler caps its request body at roughly 4.5 MB, so proxying the bytes would
 * fail on exactly the images worth uploading. The API only mints a signed URL,
 * after checking the admin role.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type UploadFolder =
  | 'components'
  | 'builds'
  | 'portfolio'
  | 'services'
  | 'promotions'
  | 'categories';

/** Downscales and re-encodes, falling back to the original if anything fails. */
async function prepare(file: File): Promise<{ blob: Blob; contentType: string }> {
  // Vector and already-small files are left alone.
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough and already a sensible format: send it untouched
    // rather than re-encoding and losing quality for no reason.
    if (scale === 1 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      bitmap.close();
      return { blob: file, contentType: file.type };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY),
    );
    if (!blob) throw new Error('encode failed');
    return { blob, contentType: 'image/webp' };
  } catch {
    // An old browser without createImageBitmap, or an image the canvas
    // refuses. Uploading the original is worse but still correct.
    return { blob: file, contentType: file.type };
  }
}

async function uploadOne(file: File, folder: UploadFolder): Promise<string> {
  const { blob, contentType } = await prepare(file);

  const signRes = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, contentType }),
  });
  const signed = await signRes.json();
  if (!signRes.ok) throw new Error(signed.error ?? 'Could not start the upload.');

  const putRes = await fetch(signed.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putRes.ok) throw new Error('The upload did not complete. Please try again.');

  return signed.publicUrl as string;
}

/** Deletes a file we own. Pasted external URLs are left alone. */
async function removeIfManaged(url: string | null) {
  const path = storagePathFromUrl(url);
  if (!path) return;
  try {
    await fetch('/api/admin/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  } catch {
    // An orphaned file costs a little storage. Failing the edit over it would
    // cost the admin their work.
  }
}

// ---------------------------------------------------------------------------
// Single image
// ---------------------------------------------------------------------------

export function ImageUpload({
  value,
  onChange,
  folder,
  label = 'Image',
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: UploadFolder;
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const previous = value;
      const url = await uploadOne(file, folder);
      onChange(url);
      await removeIfManaged(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink-100">{label}</span>

      <div className="flex items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-600 bg-ink-900">
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-ink-500">None</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-xs text-ink-300 file:mr-3 file:rounded-md file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-100 hover:file:bg-ink-600"
          />
          {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
          {busy ? <p className="text-xs text-gold-400">Resizing and uploading&hellip;</p> : null}
          {error ? (
            <p className="text-xs text-danger-400" role="alert">
              {error}
            </p>
          ) : null}
          {value ? (
            <button
              type="button"
              onClick={async () => {
                const previous = value;
                onChange(null);
                await removeIfManaged(previous);
              }}
              className="text-xs text-ink-400 hover:text-danger-400"
            >
              Remove image
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export function GalleryUpload({
  value,
  onChange,
  folder,
  label = 'Gallery images',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: UploadFolder;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      // Sequential rather than parallel: a phone on mobile data uploading six
      // images at once tends to stall them all.
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadOne(file, folder));
      }
      onChange([...value, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function move(index: number, delta: number) {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink-100">{label}</span>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {value.map((url, index) => (
            <li key={url} className="w-28">
              <div className="overflow-hidden rounded-md border border-ink-600 bg-ink-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className={cn('px-1 text-ink-400 hover:text-white', index === 0 && 'opacity-30')}
                    aria-label="Move left"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    className={cn(
                      'px-1 text-ink-400 hover:text-white',
                      index === value.length - 1 && 'opacity-30',
                    )}
                    aria-label="Move right"
                  >
                    &rarr;
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    onChange(value.filter((u) => u !== url));
                    await removeIfManaged(url);
                  }}
                  className="text-ink-400 hover:text-danger-400"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
        className="block w-full text-xs text-ink-300 file:mr-3 file:rounded-md file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-100 hover:file:bg-ink-600"
      />
      <p className="text-xs text-ink-400">
        Images are resized to {MAX_EDGE}px and converted to WebP before upload. Arrows reorder;
        the first image is used as the card thumbnail.
      </p>
      {busy ? <p className="text-xs text-gold-400">Uploading&hellip;</p> : null}
      {error ? (
        <p className="text-xs text-danger-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shown next to a pasted URL so it is obvious the file is not ours to delete. */
export function UploadOrigin({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <span className="text-xs text-ink-500">
      {isManagedUpload(url) ? 'Stored in your media library' : 'External link'}
    </span>
  );
}

export { uploadOne as uploadImage };
