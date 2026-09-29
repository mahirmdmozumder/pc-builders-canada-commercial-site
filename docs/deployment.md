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
   - `supabase/migrations/0003_fix_admin_bootstrap.sql`
   - `supabase/migrations/0004_whole_unit_categories_and_condition.sql`
   - `supabase/migrations/0005_cms_category_values.sql` — run alone, then:
   - `supabase/migrations/0006_cms.sql`
   - `supabase/seed/seed.sql` (optional: loads the catalogue)

   If you set a project up before 0003 existed, run it now. Without it the
   promote-to-admin statement in step 5 fails with "Only an administrator may
   change a user role", because the guard could not tell the SQL editor apart
   from a customer trying to promote themselves.

   0004 adds the networking, NAS and mini-PC categories and the `condition`
   column that refurbished and open-box listings need. Run the whole file in one
   go; it is safe in a single transaction.

   The seed has to be a SEPARATE query, run after 0004 has finished. Postgres
   will not let a new enum value be used in the same transaction that added it,
   and the seed inserts rows with `category = 'networking'`. Nothing inside 0004
   itself uses those values, so only that boundary matters.

   Until both have run, the networking, NAS and mini-PC pages load but serve the
   in-repo sample catalogue, say so in a banner, and disable their Add to cart
   buttons — those rows have ids the database does not have, so an order could
   not be fulfilled.

   0005 and 0006 add the content management system. 0005 is three `alter type`
   lines and has to run on its own, for the same reason as 0004: Postgres will
   not let a new enum value be used in the transaction that added it, and 0006
   seeds a row per category. 0006 itself runs in one go.

   0006 also creates the `media` storage bucket, public to read and admin-only
   to write. Nothing else needs setting up for image upload — Supabase Storage
   is part of the same project.

   Re-run the seed afterwards. It now loads the services and build presets that
   used to be hardcoded, so until it runs those pages fall back to the in-repo
   copy and look exactly as they did before.
3. From **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

   The anon key is safe in the browser: Row Level Security is what protects data. The service-role
   key bypasses RLS entirely and must only ever be set as a server-side environment variable.

4. Under **Authentication → URL Configuration**, set the site URL to your production domain and add
   `https://pcbuilderscanada.com/auth/callback` as a redirect URL. Add the Vercel preview domain too if
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
| `NEXT_PUBLIC_SITE_URL` | `https://pcbuilderscanada.com` | the preview URL, or `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL | same, or a separate staging project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | same |
| `STRIPE_SECRET_KEY` | `sk_live_...` | **`sk_test_...`** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | **`pk_test_...`** |
| `STRIPE_WEBHOOK_SECRET` | production endpoint secret | test endpoint secret |
| `RESEND_API_KEY` | optional | optional |
| `EMAIL_FROM` | `PC Builders Canada <orders@pcbuilderscanada.com>` | optional |
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

Vercel terminates TLS and serves from its own edge network, so the registrar's
only job is to point the name at Vercel. Nothing else needs to change there.

### Add the domain in Vercel first

1. **Project → Settings → Domains**, add the apex (`pcbuilderscanada.com`) and `www.pcbuilderscanada.com`.
2. Vercel then shows the exact records to create. **Use the values Vercel
   displays**, not values copied from a guide including this one: Vercel has
   changed its apex address before, and a stale IP produces a domain that
   resolves nowhere.
3. The apex `A` record is Vercel's shared address, `76.76.21.21` at the time of
   writing. The `www` `CNAME` is **unique to each project** and looks like
   `d1d4fc829fe7bc7c.vercel-dns-017.com`. There is no universal www value any
   more, so that one has to be read off the dashboard. Confirm both there.

### Where this domain's DNS actually lives

`pcbuilderscanada.com` answers from `ns95.worldnic.com` and `ns96.worldnic.com`.
Those are **Network Solutions** nameservers, so the records are edited in the
Network Solutions account, not in a Domain.com panel, regardless of which brand
the domain was purchased through. Editing the wrong panel changes nothing,
because the nameservers listed above are what the internet asks.

Confirm at any time with:

```bash
nslookup -type=NS pcbuilderscanada.com
```

### Records that were already on the domain

Before the Vercel records go on, the domain pointed at Netlify:

| Host | Type | Value | Serving |
| --- | --- | --- | --- |
| `@` | `A` | `75.2.60.5`, `99.83.190.102` | Netlify 404 |
| `www` | `CNAME` | `pcbuilderscanada.netlify.app` | Netlify 404 |

Nothing was published behind either, so replacing them loses nothing. They do
have to be **removed rather than added to**: a leftover apex `A` record splits
traffic between Netlify and Vercel at random.

### Editing the records

Network Solutions and Domain.com are both Newfold Digital brands with similarly
laid out panels. Labels shift between account types, so look for the equivalent
wording if yours differs.

1. Sign in and open the domain from your domain list.
2. Scroll to the **Advanced Tools** section at the bottom of the overview page.
   This is where DNS lives; there is no "Manage DNS" button higher up.
3. Check **Nameservers (DNS)** first. For this domain they read
   `NS95.WORLDNIC.COM` and `NS96.WORLDNIC.COM`, both marked default, which is
   correct. If they point at a web-hosting product instead, the records panel
   below is not the one answering queries and nothing you change will take
   effect.
4. Open **Advanced DNS Records**. The link shows a summary of what already
   exists, such as "Edits on A(2), CNAME(1)". A newly registered domain ships
   with parking
   records: an `A` record on `@` pointing at a "coming soon" page, and often a
   `www` `CNAME` or a URL-forwarding rule. **Delete those first.** Two `A`
   records on the apex means traffic lands on the parking page roughly half the
   time, which is a confusing failure to diagnose later.
5. Add the apex record:

   | Field | Value |
   | --- | --- |
   | Type | `A` |
   | Name / Host | `@` |
   | Value / Points to | the address Vercel shows |
   | TTL | `600` |

6. Add the www record:

   | Field | Value |
   | --- | --- |
   | Type | `CNAME` |
   | Name / Host | `www` |
   | Value / Points to | the per-project target from the Vercel www card |
   | TTL | `600` |

7. Save. A low TTL during setup means a mistake costs minutes rather than a day.
   Raise it to `3600` once the site is confirmed working.

### Watch for these two registrar behaviours

- **URL forwarding is not hosting.** Registrars offer domain forwarding, which
  answers with an HTTP redirect rather than pointing DNS at a server. If
  forwarding is enabled, turn it off. It breaks TLS certificate issuance and
  produces a redirect loop.
- **Do not enable the registrar's own website builder or hosting** on the
  domain. The **Domain Connections** panel offering Connect Website, Connect
  Email and Connect Hosting attaches their products and rewrites the DNS
  records. "Not connected to any services" is the correct state when traffic is
  routed by DNS records instead.

### Confirm it resolves

Propagation is usually minutes on a fresh domain with no cached records, but can
take up to 48 hours. Check from the command line rather than the browser, which
caches aggressively:

```bash
nslookup pcbuilderscanada.com
nslookup www.pcbuilderscanada.com
```

The apex should return the Vercel address; `www` should resolve through the
per-project `*.vercel-dns-*.com` target. Vercel's Domains page shows a green
check on each once it agrees.

### After the certificate is issued

1. Confirm `https://pcbuilderscanada.com` loads and `http://` redirects to it.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://pcbuilderscanada.com` in the Vercel **Production**
   environment and redeploy. Canonical URLs, the sitemap, Open Graph tags and the
   Stripe return URLs all read from this, and they will keep pointing at the
   `.vercel.app` host until it changes.
3. In Supabase, update **Authentication → URL Configuration**: site URL to the
   domain, and `https://pcbuilderscanada.com/auth/callback` as a redirect URL. Password
   reset and email confirmation links break without this.
4. In Stripe, edit the webhook endpoint to `https://pcbuilderscanada.com/api/stripe/webhook`.
   Its signing secret does not change.

### Cloudflare is optional here

Vercel already provides the CDN and the certificate, so putting Cloudflare in
front adds a hop and a class of misconfiguration for little gain. If you do move
nameservers to Cloudflare later, set SSL mode to **Full (strict)**. "Flexible"
makes Cloudflare talk to Vercel over plain HTTP, which is worse than not using
it at all.

---

## 5. Create the first administrator

There is no sign-up path to `admin` by design.

1. Register through the site as a normal customer.
2. In the Supabase SQL editor:
   ```sql
   update profiles set role = 'admin' where email = 'you@pcbuilderscanada.com';
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
