import type { Metadata } from 'next';
import { ServicesManager } from '@/components/admin/services-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listAllServices } from '@/lib/cms/repository';

export const metadata: Metadata = { title: 'Services' };
export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await listAllServices();
  return <ServicesManager services={services} />;
}
