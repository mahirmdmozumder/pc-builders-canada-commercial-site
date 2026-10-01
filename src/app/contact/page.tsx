import Link from 'next/link';
import type { Metadata } from 'next';
import { Card, PageHeader, PageShell } from '@/components/ui';
import { ContactForm } from '@/components/contact/contact-form';
import {
  CHANNELS,
  hasDirectContact,
  HOURS_PUBLISHED,
  IN_PERSON,
  summariseHours,
  TIMEZONE_LABEL,
} from '@/content/business';

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
            {/* Reach us first, because it is what somebody opening a contact
                page is looking for. Every entry renders only when it is
                configured in src/content/business.ts, so there is never a Call
                button that dials nothing. */}
            {hasDirectContact ? (
              <Card className="p-6">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Reach us directly
                </h2>
                <dl className="mt-4 space-y-4 text-sm">
                  {CHANNELS.phone ? (
                    <div>
                      <dt className="text-ink-400">Phone</dt>
                      <dd className="mt-0.5">
                        <a
                          href={`tel:${CHANNELS.phone}`}
                          className="tnum font-medium text-gold-400 hover:text-gold-300"
                        >
                          {CHANNELS.phoneDisplay ?? CHANNELS.phone}
                        </a>
                        {CHANNELS.phoneAcceptsSms ? (
                          <span className="mt-0.5 block text-xs text-ink-500">
                            Calls and text messages
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  {CHANNELS.email ? (
                    <div>
                      <dt className="text-ink-400">Email</dt>
                      <dd className="mt-0.5">
                        <a
                          href={`mailto:${CHANNELS.email}`}
                          className="font-medium break-all text-gold-400 hover:text-gold-300"
                        >
                          {CHANNELS.email}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Card>
            ) : null}

            {HOURS_PUBLISHED ? (
              <Card className="p-6">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Hours</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  {summariseHours().map((group) => (
                    <div key={group.label} className="flex justify-between gap-4">
                      <dt className="text-ink-400">{group.label}</dt>
                      <dd
                        className={
                          group.hours === 'Closed' ? 'text-ink-500' : 'tnum text-ink-100'
                        }
                      >
                        {group.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
                {/* The zone is stated rather than assumed. "10 to 8" read from
                    Vancouver is three hours wrong without it. */}
                <p className="mt-4 border-t border-ink-700 pt-4 text-xs leading-relaxed text-ink-500">
                  All times are {TIMEZONE_LABEL}. Messages sent outside these hours are answered the
                  next working day.
                </p>
              </Card>
            ) : null}

            {IN_PERSON.pickup || IN_PERSON.dropOff || IN_PERSON.onSite ? (
              <Card className="p-6">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  In person
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">
                  {IN_PERSON.pickup && IN_PERSON.dropOff
                    ? 'You can collect a finished machine or drop one off for work, arranged in advance.'
                    : IN_PERSON.pickup
                      ? 'You can collect a finished machine, arranged in advance.'
                      : 'You can drop a machine off for work, arranged in advance.'}
                  {IN_PERSON.onSite
                    ? ' For on-site work we come to you, across Toronto and the GTA.'
                    : ''}
                </p>
                {/* No address, and no field to put one in. This is a workspace,
                    not a shop with a counter, and publishing an address would
                    invite people to turn up to something that is not one. */}
                {!IN_PERSON.walkIn ? (
                  <p className="mt-3 text-xs leading-relaxed text-ink-500">
                    We work from a workspace rather than a storefront, so there is no counter to walk
                    up to. Message or call first and we will agree a time.
                  </p>
                ) : null}
              </Card>
            ) : null}

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
                    className="mt-1.5 inline-block font-medium text-gold-400 hover:text-gold-300"
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
                    className="mt-1.5 inline-block font-medium text-gold-400 hover:text-gold-300"
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

            </Card>
          </div>
        </div>
      </PageShell>
    </>
  );
}
