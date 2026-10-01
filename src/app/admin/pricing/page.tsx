import type { Metadata } from 'next';
import { PricingTable } from '@/components/admin/pricing-table';
import { requireAdmin } from '@/lib/auth/session';
import { listComponentsWithCost } from '@/lib/catalog/repository';

export const metadata: Metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

/**
 * Repricing.
 *
 * Same shape as the inventory page next door: verify the admin role, read the
 * catalogue with cost prices, hand it to a table that edits one number per row.
 *
 * `listComponentsWithCost` includes `cost_cents`, which is admin-only and never
 * reaches a public client. The role is checked here before the query runs, and
 * the table's own RLS policy checks it again — so a caller who somehow got past
 * requireAdmin() would come back with nothing rather than with margins.
 *
 * `includeInactive` so drafts and archived rows appear. Setting a price before
 * publishing something is the normal order of work, and a pricing screen that
 * hid unpublished products would force that back into the product form.
 */
export default async function AdminPricingPage() {
  await requireAdmin();
  const components = await listComponentsWithCost({ includeInactive: true });
  return <PricingTable components={components} />;
}
