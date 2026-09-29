import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, Card, PageHeader, PageShell, SectionHeading } from '@/components/ui';
import { REFERRAL } from '@/content/business';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Refer a Friend',
  description:
    'Refer someone to PC Builders Canada and you both get money off a service. The full terms, in plain language.',
  alternates: { canonical: '/refer' },
};

export const revalidate = 86400;

/**
 * Referral offer terms.
 *
 * This page exists because the offer gets PRINTED. A card in somebody's wallet
 * cannot be edited, so the terms it points at have to be unambiguous, findable
 * and dated, and they have to still say the same thing in six months when
 * somebody finally gets round to claiming.
 *
 * Written as plain sentences rather than legal boilerplate. The point is that a
 * customer can tell, before booking, whether their situation qualifies. Terms
 * nobody can parse produce the argument they were written to prevent.
 */
export default function ReferPage() {
  const amount = formatMoney(REFERRAL.amountCents, { whole: true });
  const minimum = formatMoney(REFERRAL.minimumSpendCents, { whole: true });

  if (!REFERRAL.active) {
    return (
      <>
        <PageHeader
          eyebrow="Refer a friend"
          title="The referral offer is not running"
          description="It is not open to new referrals at the moment. Any credit already earned will still be honoured — get in touch and we will apply it."
        />
        <PageShell className="py-12">
          <ButtonLink href="/contact">Contact us</ButtonLink>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Refer a friend"
        title={`${amount} for them, ${amount} for you`}
        description="Send someone our way. They get money off their first service, and once their job is done and paid, you get the same off your next one."
        actions={
          <>
            <ButtonLink href="/quote">Start a quote</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Ask a question
            </ButtonLink>
          </>
        }
      />

      <PageShell className="max-w-3xl py-12 sm:py-16">
        <section>
          <SectionHeading title="How it works" />
          <ol className="mt-8 space-y-5">
            {[
              {
                step: '1',
                title: 'Tell someone about us',
                body: 'No code, no link to share, nothing to print. Just your name.',
              },
              {
                step: '2',
                title: 'They name you when they book',
                body: `There is a "who referred you" box on the quote and contact forms. Mentioning you on the phone works just as well.`,
              },
              {
                step: '3',
                title: `They get ${amount} off`,
                body: `Applied to their first service with us, as long as the labour comes to ${minimum} or more.`,
              },
              {
                step: '4',
                title: `You get ${amount} off your next service`,
                body: 'Credited once their job is finished and paid for. We will let you know when it lands.',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="tnum flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600/50 bg-gold-600/10 font-mono text-sm text-gold-400">
                  {item.step}
                </span>
                <div className="pt-0.5">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Card className="mt-12 p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">The terms</h2>
          <p className="mt-2 text-sm text-ink-400">
            Version {REFERRAL.termsVersion}. These are the terms that apply to any referral made
            while they are published here.
          </p>

          <dl className="mt-6 space-y-5 text-sm">
            {[
              {
                term: 'It applies to labour, not hardware',
                value: `The ${amount} comes off the service charge. It does not come off the price of parts. Hardware is sold on a narrow margin, so a discount on parts would cost more than the job earns — and an offer that cannot be afforded is one that ends up being quietly refused at the counter.`,
              },
              {
                term: `The service has to be ${minimum} or more`,
                value: `Labour of ${minimum} or more, before tax. Smaller jobs are often a single quick fix, and there is not ${amount} of margin in one.`,
              },
              {
                term: 'The person you refer has to be new to us',
                value: 'It is for bringing somebody new in, so it does not apply to an existing customer, to another account in the same household, or to a second account made by someone who has bought from us before.',
              },
              {
                term: 'One discount per job',
                value: 'It cannot be stacked with another discount, a promotion, or a second referral on the same job. If more than one could apply, we will apply whichever leaves you paying less.',
              },
              {
                term: 'Your credit arrives after their job is paid',
                value: 'Not when they book, and not when the work starts. A booking that never happens should not cost anybody money, which is the only reason for the wait.',
              },
              {
                term: `Credit lasts ${REFERRAL.expiryMonths} months`,
                value: `${REFERRAL.expiryMonths} months from the day it is credited. We will tell you the date when it lands rather than leaving you to work it out.`,
              },
              {
                term: 'No limit on how many people you refer',
                value: 'Each one earns its own credit. They are used one per job, not all at once.',
              },
              {
                term: 'It is a discount, not cash',
                value: 'It has no cash value, cannot be paid out, and cannot be transferred to somebody else. If a job is refunded, any referral discount applied to it comes off the refund.',
              },
              {
                term: 'We can change or end the offer',
                value: 'With notice on this page. Any referral already made under the version above will still be honoured on those terms, including the ones printed on cards already handed out. That is the whole reason this page carries a version number.',
              },
            ].map((item) => (
              <div key={item.term} className="border-t border-ink-700 pt-5 first:border-0 first:pt-0">
                <dt className="font-medium text-ink-100">{item.term}</dt>
                <dd className="mt-1.5 leading-relaxed text-ink-300">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="mt-10 rounded-lg border border-ink-700 bg-ink-850 p-6">
          <h2 className="font-semibold text-white">Ready to send someone over?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Point them at{' '}
            <span className="font-mono text-ink-100">pcbuilderscanada.com</span> and tell them to
            put your name in the referral box. That is all it takes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/quote">Start a quote</ButtonLink>
            <Link
              href="/scan"
              className="inline-flex items-center px-1 text-sm font-medium text-gold-400 hover:text-gold-300"
            >
              See the short version &rarr;
            </Link>
          </div>
        </div>
      </PageShell>
    </>
  );
}
