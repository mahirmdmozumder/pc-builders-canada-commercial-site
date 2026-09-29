import type { Metadata } from 'next';
import { RefurbishedManager } from '@/components/admin/refurbished-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listComponentsWithCost } from '@/lib/catalog/repository';

export const metadata: Metadata = { title: 'Refurbished' };
export const dynamic = 'force-dynamic';

export default async function AdminRefurbishedPage() {
  await requireAdmin();
  const components = await listComponentsWithCost({ includeInactive: true });
  return <RefurbishedManager components={components} />;
}
