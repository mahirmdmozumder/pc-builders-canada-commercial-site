import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/ui';
import { QuoteForm } from '@/components/quote/quote-form';
import { listComponents } from '@/lib/catalog/repository';

export const metadata: Metadata = {
  title: 'Request a Quote',
  description:
    'Send us a configuration or describe what you need, and we will put a parts list together with the reasoning behind each choice.',
  alternates: { canonical: '/quote' },
};

export const revalidate = 600;

export default async function QuotePage() {
  const catalogue = await listComponents();

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Request a quote"
        description="Attach a configuration from the builder, or just describe what the machine is for. Either way a person reads it and replies with a parts list."
      />
      <PageShell className="py-8 sm:py-10">
        <QuoteForm catalogue={catalogue} />
      </PageShell>
    </>
  );
}
