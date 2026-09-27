import type { Metadata } from 'next';
import { CollectionView } from '@/components/shop/collection-view';
import { collectionBySlug } from '@/lib/catalog/collections';

const collection = collectionBySlug('networking');

export const metadata: Metadata = {
  title: collection.metaTitle,
  description: collection.metaDescription,
  alternates: { canonical: '/networking' },
};

// Catalogue prices change when an admin edits them, so an hour is a reasonable
// staleness window for a page a crawler also reads.
export const revalidate = 3600;

export default function NetworkingPage() {
  return <CollectionView collection={collection} />;
}
