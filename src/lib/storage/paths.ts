/**
 * Storage path helpers.
 *
 * Kept out of the route file because a Next.js route module may only export
 * HTTP handlers; anything else there is a build error.
 */

export const MEDIA_BUCKET = 'media';

const PUBLIC_MARKER = `/storage/v1/object/public/${MEDIA_BUCKET}/`;

/**
 * Turns a public storage URL back into the object path needed to delete it.
 *
 * Returns null for anything that is not one of our own storage URLs, which
 * includes images an admin pasted in from a manufacturer's site. Those must
 * never be passed to a delete call, and they cannot be removed from our
 * bucket anyway.
 */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const index = url.indexOf(PUBLIC_MARKER);
  return index === -1 ? null : url.slice(index + PUBLIC_MARKER.length);
}

/** True when this URL points at our own bucket rather than somewhere else. */
export function isManagedUpload(url: string | null | undefined): boolean {
  return storagePathFromUrl(url) !== null;
}
