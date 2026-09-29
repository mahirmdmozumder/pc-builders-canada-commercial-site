import { randomUUID } from 'node:crypto';
import { getAdminOrNull } from '@/lib/auth/session';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { env, isSupabaseAdminConfigured } from '@/lib/env';
import { badRequest, handle, notFound, ok, serviceUnavailable } from '@/lib/api/respond';

/**
 * Issues a signed URL the browser uploads an image directly to.
 *
 * The file never passes through this route, and that is the point. Vercel
 * caps a route handler's request body at roughly 4.5 MB, and a photo straight
 * off a phone is routinely larger than that — so proxying the bytes would fail
 * on exactly the images worth uploading. The browser resizes first and then
 * sends the result straight to Supabase Storage.
 *
 * Authorization still happens here: this route checks the admin role before
 * minting a URL, and the storage RLS policy from migration 0006 checks it
 * again when the upload lands. Neither alone would be enough — the signed URL
 * is a bearer token once issued, and the policy is what stops a leaked anon
 * key writing to the bucket.
 */

const BUCKET = 'media';

/** Folders, so the bucket does not become one flat list of UUIDs. */
const FOLDERS = ['components', 'builds', 'portfolio', 'services', 'promotions', 'categories'] as const;
type Folder = (typeof FOLDERS)[number];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export async function POST(request: Request) {
  return handle('POST /api/admin/upload', async () => {
    if (!isSupabaseAdminConfigured) {
      return serviceUnavailable('Image upload needs a database connection.');
    }

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const body = (await request.json()) as { folder?: string; contentType?: string };

    const folder = FOLDERS.includes(body.folder as Folder) ? (body.folder as Folder) : null;
    if (!folder) {
      return badRequest(`Unknown upload folder. Expected one of: ${FOLDERS.join(', ')}.`);
    }

    // The declared type decides the extension, and the bucket's own
    // allowed_mime_types (set in 0006) rejects anything else at write time.
    // A browser can claim any content type, so this is a routing decision
    // rather than a security one.
    const extension = EXTENSIONS[body.contentType ?? ''];
    if (!extension) {
      return badRequest('Images must be JPEG, PNG, WebP or AVIF.');
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return serviceUnavailable('Image upload is unavailable right now.');

    // A random name, not the original filename. Two admins uploading
    // "gpu.jpg" must not overwrite each other, and a filename from a
    // downloaded image is not something to put in a public URL.
    const path = `${folder}/${new Date().getFullYear()}/${randomUUID()}.${extension}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('[upload] could not sign', error?.message);
      return serviceUnavailable('Could not start the upload. Please try again.');
    }

    const publicUrl = `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

    return ok({
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl,
      bucket: BUCKET,
    });
  });
}

/**
 * Removes an uploaded file.
 *
 * Only ever called for an image the admin is replacing or clearing. Images
 * still referenced by a row are left alone; the caller clears the reference
 * first, which is why this takes a path rather than a record id.
 */
export async function DELETE(request: Request) {
  return handle('DELETE /api/admin/upload', async () => {
    if (!isSupabaseAdminConfigured) {
      return serviceUnavailable('Image upload needs a database connection.');
    }

    const admin = await getAdminOrNull();
    if (!admin) return notFound();

    const { path } = (await request.json()) as { path?: string };
    if (!path || path.includes('..')) return badRequest('A storage path is required.');

    const supabase = getSupabaseAdminClient();
    if (!supabase) return serviceUnavailable('Image upload is unavailable right now.');

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      // A missing file is the desired end state, so this is not worth failing
      // an otherwise successful edit over.
      console.error('[upload] could not remove', path, error.message);
    }

    return ok({ removed: true });
  });
}

