import type { Metadata } from 'next';
import { Badge, Card, EmptyState, TableWrap } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Profile, SavedBuild } from '@/types/domain';

export const metadata: Metadata = { title: 'Builds' };
export const dynamic = 'force-dynamic';

/**
 * Saved builds across all customers.
 *
 * Useful operationally: a customer who saved a build but did not order is the
 * most qualified lead the shop has, and a build flagged incompatible is
 * usually someone who got stuck and needs a hand.
 */
export default async function AdminBuildsPage() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const { data: buildData } = await supabase!
    .from('saved_builds')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  const builds = (buildData ?? []) as SavedBuild[];

  const userIds = [...new Set(builds.map((b) => b.user_id))];
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profileData } = await supabase!
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    for (const profile of (profileData ?? []) as Pick<Profile, 'id' | 'email'>[]) {
      emails.set(profile.id, profile.email);
    }
  }

  const needsHelp = builds.filter((b) => !b.is_compatible);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Saved builds</h1>
        <p className="mt-1 text-sm text-ink-400">
          {builds.length} saved. {needsHelp.length} have unresolved compatibility problems.
        </p>
      </div>

      {builds.length === 0 ? (
        <EmptyState
          title="No saved builds"
          description="Configurations customers save to their account appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Saved builds</caption>
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Build
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Parts
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Checks
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Estimate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {builds.map((build) => (
                  <tr key={build.id}>
                    <td className="px-4 py-3 font-medium text-white">{build.name}</td>
                    <td className="px-4 py-3 text-ink-300">
                      {emails.get(build.user_id) ?? 'Unknown account'}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-200">{build.items.length}</td>
                    <td className="px-4 py-3">
                      {build.is_compatible ? (
                        <Badge tone="ok">Passing</Badge>
                      ) : (
                        <Badge tone="warn">Problems</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">
                      {formatDate(build.updated_at)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-100">
                      {formatMoney(build.estimated_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
