import { redirect } from 'next/navigation';

/**
 * The product screen moved under Content when the CMS was added.
 *
 * Kept as a redirect rather than deleted: this path is in the admin nav
 * history, in bookmarks, and in the deployment notes. A 404 on a route that
 * worked yesterday is a bug report waiting to happen.
 */
export default function AdminComponentsRedirect() {
  redirect('/admin/content/products');
}
