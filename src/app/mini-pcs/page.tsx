import type { Metadata } from 'next';
import { CollectionView } from '@/components/shop/collection-view';
import { collectionBySlug } from '@/lib/catalog/collections';

const collection = collectionBySlug('mini-pcs');

export const metadata: Metadata = {
  title: collection.metaTitle,
  description: collection.metaDescription,
  alternates: { canonical: '/mini-pcs' },
};

// See src/app/networking/page.tsx for why this window is short.
export const revalidate = 60;

export default function MiniPcsPage() {
  return <CollectionView collection={collection} />;
}
