import type { Metadata } from 'next';
import { PromotionsManager } from '@/components/admin/promotions-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listAllPromotions } from '@/lib/cms/repository';

export const metadata: Metadata = { title: 'Promotions' };
export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  await requireAdmin();
  const promotions = await listAllPromotions();
  return <PromotionsManager promotions={promotions} />;
}
