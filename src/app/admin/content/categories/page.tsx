import type { Metadata } from 'next';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listCategories } from '@/lib/cms/repository';

export const metadata: Metadata = { title: 'Categories' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await listCategories();
  return <CategoriesManager categories={categories} />;
}
