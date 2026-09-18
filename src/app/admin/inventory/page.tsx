import type { Metadata } from 'next';
import { InventoryTable } from '@/components/admin/inventory-table';
import { requireAdmin } from '@/lib/auth/session';
import { listComponentsWithCost } from '@/lib/catalog/repository';

export const metadata: Metadata = { title: 'Inventory' };
export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  await requireAdmin();
  const components = await listComponentsWithCost({ includeInactive: true });
  return <InventoryTable components={components} />;
}
