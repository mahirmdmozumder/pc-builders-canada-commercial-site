import type { Metadata } from 'next';
import { PresetsManager } from '@/components/admin/presets-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listComponents } from '@/lib/catalog/repository';
import { listAllPresets } from '@/lib/cms/repository';

export const metadata: Metadata = { title: 'PC builds' };
export const dynamic = 'force-dynamic';

export default async function AdminBuildsContentPage() {
  await requireAdmin();
  // The picker needs the public catalogue shape, not the cost-bearing one:
  // nothing on this screen shows margin, so it should not load it.
  const [presets, catalogue] = await Promise.all([listAllPresets(), listComponents()]);
  return <PresetsManager presets={presets} catalogue={catalogue} />;
}
