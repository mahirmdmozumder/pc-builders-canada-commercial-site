import type { Metadata } from 'next';
import { Alert, Badge, Card, CardHeader, DefinitionList } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/session';
import { getCatalogSource } from '@/lib/catalog/repository';
import {
  isEmailConfigured,
  isStripeConfigured,
  isStripeLiveMode,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  env,
} from '@/lib/env';
import { PRICING_CONFIG } from '@/lib/pricing/pricing';
import { PSU_HEADROOM_MULTIPLIER, SYSTEM_OVERHEAD_WATTS } from '@/lib/power/calculator';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

/**
 * Configuration status.
 *
 * Read-only on purpose. Pricing rates and service configuration live in
 * version control, not in a database an admin can edit at 2am: a change to
 * the assembly fee should go through a commit and a deploy, where it can be
 * reviewed and rolled back.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();

  const services = [
    {
      name: 'Database (Supabase)',
      ready: isSupabaseConfigured,
      detail: isSupabaseConfigured
        ? 'Connected. Catalogue, orders and accounts are live.'
        : 'Not configured. The site is serving the in-repo sample catalogue and accounts are disabled.',
    },
    {
      name: 'Service role key',
      ready: isSupabaseAdminConfigured,
      detail: isSupabaseAdminConfigured
        ? 'Present. Webhooks and order writes can run without a user session.'
        : 'Missing. Checkout and the Stripe webhook cannot write orders.',
    },
    {
      name: 'Payments (Stripe)',
      ready: isStripeConfigured,
      detail: isStripeConfigured
        ? `Connected in ${isStripeLiveMode ? 'LIVE' : 'test'} mode.`
        : 'Not configured. Checkout refuses to start and tells the customer so.',
    },
    {
      name: 'Webhook secret',
      ready: Boolean(env.stripeWebhookSecret),
      detail: env.stripeWebhookSecret
        ? 'Present. Payment confirmations are signature-verified.'
        : 'Missing. The webhook rejects every request, so no order will be marked paid.',
    },
    {
      name: 'Email',
      ready: isEmailConfigured,
      detail: isEmailConfigured
        ? `Sending from ${env.emailFrom}.`
        : 'Not configured. Notifications are logged, not sent, and the UI says so.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-ink-400">
          What this deployment has connected, and the rates the pricing and power engines use.
        </p>
      </div>

      {isStripeLiveMode ? (
        <Alert tone="danger" title="Live payments are enabled">
          This deployment is using live Stripe keys. Real cards will be charged.
        </Alert>
      ) : (
        <Alert tone="info" title="Test mode">
          Stripe is in test mode. No real money moves. Switch to live keys only on the production
          deployment.
        </Alert>
      )}

      <Card>
        <CardHeader title="Connected services" />
        <ul className="divide-y divide-ink-700">
          {services.map((service) => (
            <li key={service.name} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-medium text-white">{service.name}</p>
                <p className="mt-0.5 text-sm text-ink-400">{service.detail}</p>
              </div>
              {service.ready ? (
                <Badge tone="ok">Ready</Badge>
              ) : (
                <Badge tone="warn">Not set</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Pricing rates</h2>
          <DefinitionList
            className="mt-3"
            items={[
              { term: 'Assembly and testing', value: formatMoney(PRICING_CONFIG.assemblyFeeCents) },
              { term: 'OS installation', value: formatMoney(PRICING_CONFIG.osInstallFeeCents) },
              {
                term: 'Free shipping above',
                value: formatMoney(PRICING_CONFIG.freeShippingThresholdCents),
              },
              { term: 'System shipping', value: formatMoney(PRICING_CONFIG.systemShippingCents) },
              { term: 'Parts shipping', value: formatMoney(PRICING_CONFIG.partsShippingCents) },
            ]}
          />
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Set in src/lib/pricing/pricing.ts. Changing a rate is a code change, so it goes through
            review and can be rolled back.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Power estimation
          </h2>
          <DefinitionList
            className="mt-3"
            items={[
              { term: 'PSU headroom multiplier', value: `${PSU_HEADROOM_MULTIPLIER}x` },
              { term: 'Fixed system overhead', value: `${SYSTEM_OVERHEAD_WATTS} W` },
            ]}
          />
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Set in src/lib/power/calculator.ts, with the reasoning behind each figure documented
            alongside it.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Catalogue</h2>
        <DefinitionList
          className="mt-3"
          items={[
            {
              term: 'Source',
              value: getCatalogSource() === 'database' ? 'Database' : 'In-repo sample data',
            },
            { term: 'Site URL', value: env.siteUrl },
          ]}
        />
        {getCatalogSource() === 'sample' ? (
          <p className="mt-4 text-xs leading-relaxed text-warn-400">
            Sample data is in use. Part specifications have not been verified and stock levels are
            placeholders. The public site labels this.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
