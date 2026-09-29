import type { Metadata } from 'next';
import { PortfolioManager } from '@/components/admin/portfolio-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listComponents } from '@/lib/catalog/repository';
import { listAllPortfolio } from '@/lib/cms/repository';

export const metadata: Metadata = { title: 'Portfolio' };
export const dynamic = 'force-dynamic';

export default async function AdminPortfolioPage() {
  await requireAdmin();
  const [builds, catalogue] = await Promise.all([listAllPortfolio(), listComponents()]);
  return <PortfolioManager builds={builds} catalogue={catalogue} />;
}
