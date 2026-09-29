import type { Metadata } from 'next';
import { CollectionView } from '@/components/shop/collection-view';
import { collectionBySlug } from '@/lib/catalog/collections';

const collection = collectionBySlug('nas');

export const metadata: Metadata = {
  title: collection.metaTitle,
  description: collection.metaDescription,
  alternates: { canonical: '/nas' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

export default function NasPage() {
  return <CollectionView collection={collection} />;
}
