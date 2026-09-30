import Link from 'next/link';
import { BreadcrumbJsonLd, type Crumb } from '@/components/seo/structured-data';

/**
 * Visible breadcrumbs, with the matching structured data.
 *
 * Both together on purpose. Google will render a breadcrumb trail in place of
 * a raw URL under a search result, but only when the markup reflects a path
 * the visitor can actually see and click. Emitting the schema without the
 * visible trail is the kind of mismatch that gets markup ignored.
 *
 * The current page is the last crumb and is not a link, because linking a page
 * to itself is noise for a screen reader and a wasted tap.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length < 2) return null;

  return (
    <>
      <BreadcrumbJsonLd crumbs={crumbs} />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className="text-ink-200">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link href={crumb.href} className="hover:text-white">
                      {crumb.name}
                    </Link>
                    <span aria-hidden className="text-ink-600">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
