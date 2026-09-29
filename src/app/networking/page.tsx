import type { Metadata } from 'next';
import { CollectionView } from '@/components/shop/collection-view';
import { collectionBySlug } from '@/lib/catalog/collections';

const collection = collectionBySlug('networking');

export const metadata: Metadata = {
  title: collection.metaTitle,
  description: collection.metaDescription,
  alternates: { canonical: '/networking' },
};

/**
 * Short window on purpose.
 *
 * Admin edits clear this cache immediately through revalidateStorefront(), so
 * this is only the safety net for catalogue changes made outside the
 * application — a seed file or a correction run in the SQL editor, where no
 * application code executes and nothing can call for a rebuild.
 *
 * It was an hour. Loading the catalogue by SQL then left every storefront page
 * showing an empty category for that hour, with no way to tell from the site
 * that the data had actually arrived.
 */
export const revalidate = 60;

export default function NetworkingPage() {
  return <CollectionView collection={collection} />;
}
