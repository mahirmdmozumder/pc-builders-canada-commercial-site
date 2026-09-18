import Link from 'next/link';
import type { Metadata } from 'next';
import { Card, PageHeader, PageShell } from '@/components/ui';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with PC Builders Canada about a custom build, an upgrade, a diagnostic, or an existing order.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about a configuration, a machine that needs looking at, or an order already placed."
      />

      <PageShell className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <ContactForm />

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Faster routes
              </h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <p className="font-medium text-ink-100">Want a parts list priced?</p>
                  <p className="mt-1 text-ink-400">
                    A quote request carries your configuration with it, so the reply can be
                    specific.
                  </p>
                  <Link
                    href="/quote"
                    className="mt-1.5 inline-block font-medium text-maple-400 hover:text-maple-300"
                  >
                    Request a quote &rarr;
                  </Link>
                </li>
                <li>
                  <p className="font-medium text-ink-100">Existing order?</p>
                  <p className="mt-1 text-ink-400">
                    Open a support ticket from your account so the thread stays attached to the
                    order.
                  </p>
                  <Link
                    href="/account/support"
                    className="mt-1.5 inline-block font-medium text-maple-400 hover:text-maple-300"
                  >
                    Open a ticket &rarr;
                  </Link>
                </li>
                <li>
                  <p className="font-medium text-ink-100">Not sure what you need?</p>
                  <p className="mt-1 text-ink-400">
                    Describe the work you do and the budget. The parts follow from that.
                  </p>
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                Response times
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Messages are answered in the order they arrive, usually within one business day.
                Anything involving a machine that will not boot gets looked at first.
              </p>
              <p className="mt-4 border-t border-ink-700 pt-4 text-xs leading-relaxed text-ink-500">
                A published phone number and service hours are being finalised and will appear
                here.
              </p>
            </Card>
          </div>
        </div>
      </PageShell>
    </>
  );
}
