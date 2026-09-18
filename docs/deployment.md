# Deployment

Target: Vercel for the app, Supabase for Postgres and auth, Stripe for payments, Cloudflare (or
the registrar's own DNS) for the domain.

The order below matters: the database exists before the app is deployed, and payments are the last
thing switched on.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Choose a region close to your
   customers — for Canada, `us-east-1` or `ca-central-1` if available.
2. In the SQL editor, run in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_order_functions.sql`
   - `supabase/seed/seed.sql` (optional: loads the sample catalogue)
3. From **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

   The anon key is safe in the browser: Row Level Security is what protects data. The service-role
   key bypasses RLS entirely and must only ever be set as a server-side environment variable.

4. Under **Authentication → URL Configuration**, set the site URL to your production domain and add
   `https://yourdomain.ca/auth/callback` as a redirect URL. Add the Vercel preview domain too if
   you want sign-in to work on previews.

### Verifying RLS is actually on

After migrating, confirm in **Database → Tables** that every table shows RLS enabled. A table with
RLS off is readable by anyone holding the anon key, which is everyone.

---

## 2. Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The framework is detected; no build
   setting changes are needed.
3. Add environment variables. Vercel keeps three environments — set them deliberately:

| Variable | Production | Preview / Development |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.ca` | the preview URL, or `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL | same, or a separate staging project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | same |
| `STRIPE_SECRET_KEY` | `sk_live_...` | **`sk_test_...`** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | **`pk_test_...`** |
| `STRIPE_WEBHOOK_SECRET` | production endpoint secret | test endpoint secret |
| `RESEND_API_KEY` | optional | optional |
| `EMAIL_FROM` | `PC Builders Canada <orders@yourdomain.ca>` | optional |
| `ADMIN_NOTIFICATION_EMAIL` | where operational alerts go | optional |

   The app refuses to create a Stripe session with a live secret key outside production. That guard
   exists because a preview deployment charging a real card is not a recoverable mistake.

4. Deploy. The build runs `tsc` as part of `next build`, so a type error fails the deploy rather
   than shipping.

---

## 3. Stripe

### Test mode first

1. In the Stripe dashboard with **test mode on**, copy the test keys into the Vercel Preview and
   Development environments.
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://your-preview-url.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `payment_intent.payment_failed`, `charge.refunded`
3. Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` for that environment.
4. Place a test order with card `4242 4242 4242 4242`. Confirm:
   - the order appears in `/admin/orders` as **Paid**
   - stock decremented on the parts in that build
   - an entry appeared in the activity log

If payment succeeds but the order stays **Pending**, the webhook is not reaching the app. Check the
delivery attempts in the Stripe dashboard: a 400 means the signing secret is wrong, a 503 means the
service-role key is missing.

### Live mode

Only once test mode works end to end:

1. Complete Stripe's account activation.
2. Create a **separate** webhook endpoint in live mode pointing at the production domain. Test and
   live endpoints have different signing secrets; using the test secret in production means no
   order is ever confirmed.
3. Put the live keys and the live signing secret into the Vercel **Production** environment only.
4. Redeploy, then place one real low-value order and refund it. Confirm the refund shows as
   **Refunded** in the admin.

---

## 4. Custom domain

1. In Vercel, **Project → Settings → Domains**, add `yourdomain.ca` and `www.yourdomain.ca`.
2. At your DNS provider:
   - apex `yourdomain.ca` → `A` record to the address Vercel shows
   - `www` → `CNAME` to `cname.vercel-dns.com`
3. If using Cloudflare, set those records to **DNS only** (grey cloud) rather than proxied while
   the certificate is issued. Proxying can be re-enabled afterwards; if you do, set the SSL mode to
   **Full (strict)**. "Flexible" would make Cloudflare talk to Vercel over plain HTTP, which
   defeats the point.
4. Wait for Vercel to issue the certificate, then confirm `https://` works and `http://` redirects.
5. Update `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy, so canonical URLs, the sitemap
   and Stripe return URLs all point at the right host.
6. Update the Supabase redirect URL and the Stripe webhook endpoint to the final domain.

---

## 5. Create the first administrator

There is no sign-up path to `admin` by design.

1. Register through the site as a normal customer.
2. In the Supabase SQL editor:
   ```sql
   update profiles set role = 'admin' where email = 'you@yourdomain.ca';
   ```
3. Sign out, sign back in, and `/admin` is available.

---

## Pre-launch checklist

Before taking a real payment:

- [ ] `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass
- [ ] RLS enabled on every table in Supabase
- [ ] Service-role key set **only** as a server-side variable, never `NEXT_PUBLIC_`
- [ ] Test-mode order confirmed end to end, including stock decrement
- [ ] Live webhook endpoint created separately from the test one
- [ ] `NEXT_PUBLIC_SITE_URL` matches the production domain
- [ ] Catalogue rows that are actually for sale flipped from `sample` to `verified`, with specs
      checked against manufacturer documentation
- [ ] Tax rates confirmed against current CRA guidance
- [ ] Policy pages reviewed and the draft notice removed
- [ ] Business contact details filled into the about and contact pages

---

## Operating notes

**Stock went wrong after a payment.** The webhook logs a failure to the activity log and does not
fail the payment. Correct the level in `/admin/inventory`; the adjustment is recorded with its
delta.

**A customer paid but has no order.** Look up the session in Stripe, check the webhook delivery
attempts, and re-send the event from the Stripe dashboard. The handler is idempotent, so a
re-delivery is safe.

**Prices need changing in bulk.** Edit `src/lib/catalog/sample-catalog.ts`, run
`npm run db:seed:generate`, and run the generated SQL. It upserts on id, so it updates existing
rows rather than duplicating them.
