import type { Metadata } from 'next';
import { ComponentManager } from '@/components/admin/component-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listComponentsWithCost } from '@/lib/catalog/repository';

export const metadata: Metadata = { title: 'Components' };
export const dynamic = 'force-dynamic';

export default async function AdminComponentsPage() {
  // Cost price is included here and nowhere public: the admin role is
  // verified before the query runs.
  await requireAdmin();
  const components = await listComponentsWithCost({ includeInactive: true });
  return <ComponentManager components={components} />;
}
