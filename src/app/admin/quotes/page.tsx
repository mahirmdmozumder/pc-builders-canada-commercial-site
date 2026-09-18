import Link from 'next/link';
import type { Metadata } from 'next';
import { Card, EmptyState, TableWrap } from '@/components/ui';
import { QuoteStatusBadge } from '@/components/account/status-badge';
import { requireAdmin } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatMoney, truncate } from '@/lib/utils';
import type { Quote } from '@/types/domain';

export const metadata: Metadata = { title: 'Quotes' };
export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase!
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const quotes = (data ?? []) as Quote[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Quotes</h1>

      {quotes.length === 0 ? (
        <EmptyState
          title="No quote requests yet"
          description="Requests submitted from the site appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Quote requests</caption>
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Requested
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Notes
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Estimate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="transition-colors hover:bg-ink-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="font-medium text-white hover:text-maple-400"
                      >
                        {quote.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-200">{quote.customer_name}</p>
                      <p className="text-xs text-ink-500">{quote.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-4 py-3 text-ink-400">
                      {quote.customer_notes ? truncate(quote.customer_notes, 60) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-100">
                      {formatMoney(quote.quoted_total_cents ?? quote.estimated_total_cents)}
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
