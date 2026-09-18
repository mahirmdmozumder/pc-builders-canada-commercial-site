# PC Builders Canada

A custom PC configurator and e-commerce platform: pick parts, get them checked against each
other in real time, see what the machine will draw, and order it.

Built with Next.js 16, TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth) and Stripe.

> **Running it without any accounts.** Clone, `npm install`, `npm run dev`. With no environment
> variables set, the catalogue falls back to an in-repo sample dataset so the whole public site
> and configurator work. Accounts and checkout tell you they need a backend rather than
> pretending to work.

---

## What it does

**For a customer**

- Configure a PC part by part, or start from a saved configuration
- See ten compatibility checks re-run on every change, with the reasoning behind each result
- See estimated system power broken down per part, and whether the chosen supply covers it
- See a price estimate with parts, assembly, shipping and provincial tax listed separately
- Save builds to an account, request a quote, or pay by card through Stripe
- Follow an order through assembly and testing, and open support tickets against it

**For an operator**

- Dashboard showing what needs action: production queue, open quotes, open tickets, low stock
- Order management with status changes that notify the customer, plus internal notes that do not
- Component catalogue with soft deletion, cost price and margin
- Inventory counting with every adjustment logged with its delta and reason
- Quote review that reprices the customer's configuration against today's catalogue
- Support threads where internal notes are hidden from the customer by database policy
- An audit trail of every administrative change

---

## Architecture

A single Next.js application. No microservices, no separate API server: the surface area does not
justify the operational cost of either.

```
src/
  app/                    Routes (App Router)
    (public pages)        Home, build, gaming-pcs, workstations, services, portfolio, about,
                          contact, quote, legal
    account/              Customer area, gated by requireUser()
    admin/                Operator area, gated by requireAdmin()
    api/                  Route handlers; every write validates with Zod first
  components/             UI, grouped by feature
  lib/
    catalog/              Component model, repository, sample data, presets
    compatibility/        The rules engine
    power/                Power estimation
    pricing/              Pricing and Canadian tax
    cart/                 Cart store (client) and cart resolution (server)
    auth/                 Session and role checks
    supabase/             Three clients: public, session-scoped, service-role
    stripe/               Stripe client and test/live guards
    email/                Provider abstraction
    admin/                Audit logging
    validation/           Zod schemas, one per request shape
  types/                  Domain types and the database schema type
supabase/
  migrations/             SQL schema, RLS policies, order functions
  seed/                   Generated seed data (do not edit by hand)
docs/                     How each subsystem works and why
```

### The rule that shapes everything

**A client may say what it wants. It may never say what that costs, or who it is.**

Cart lines, build configurations and quote requests all travel as lists of component ids and
quantities. Every price is looked up from the catalogue and recalculated server-side. Every role
is read from the database on each request. Zod schemas have no price fields at all, so an injected
total is dropped before it reaches any logic. There are tests that assert this
([`schemas.test.ts`](src/lib/validation/schemas.test.ts)).

---

## The compatibility engine

The part of this project worth reading first: [`src/lib/compatibility/engine.ts`](src/lib/compatibility/engine.ts).

Ten deterministic checks, each a pure function of structured component fields:

| Check | Compares |
| --- | --- |
| CPU / Motherboard | Socket |
| Memory / Motherboard | DDR generation, module count vs DIMM slots, capacity vs board maximum |
| CPU Cooler / Socket | Bracket support, and cooling capacity vs processor power |
| Motherboard / Case | Board form factor vs what the case accepts |
| Graphics card / PCIe | Card generation vs slot generation |
| Graphics card / Case | Card length vs case clearance, with a tight-fit warning |
| Cooling / Case | Radiator size vs case mounts, or air cooler height vs clearance |
| Storage / Motherboard | M.2 drives vs M.2 slots, SATA drives vs SATA ports |
| Power supply / Case | PSU form factor |
| Power supply capacity | Estimated draw vs supply, against a headroom target |

Three design decisions:

1. **Compatibility-relevant specs are typed columns, not JSON.** `socket`, `max_gpu_length_mm`,
   `radiator_support_mm` and the rest are first-class fields the engine compares directly. The
   `specs` JSON bag holds display-only extras that no rule reads.
2. **Missing data returns `unknown`, never `pass`.** A rule with nothing to compare says so. A
   silent "compatible" on absent data is worse than no check.
3. **Nothing is decided by a model at runtime.** Results are reproducible, testable, and
   explainable to a customer.

The configurator also runs the engine once per candidate part in the open category, which is what
lets the picker say *this card is 6 mm too long for your case* before you select it.

---

## Power estimation

[`src/lib/power/calculator.ts`](src/lib/power/calculator.ts) sums per-part power figures, adds a
documented fixed allowance for fans, chipset and conversion losses, then applies a 1.35x headroom
multiplier to recommend a supply size, rounded up to a real retail capacity and floored by any
vendor-stated minimum.

It is an **estimate calculated from component data**, and the UI says exactly that. It is not a
measurement, and the code does not pretend otherwise. The breakdown is shown per part, including
which figures came from a category default rather than the part itself.

---

## Pricing

[`src/lib/pricing/pricing.ts`](src/lib/pricing/pricing.ts) and
[`tax.ts`](src/lib/pricing/tax.ts).

- All money is integer cents. Rounding happens once, at the tax step.
- Canadian provincial tax lives in one table: HST, GST+PST, GST+QST and GST-only provinces.
- Parts, services, shipping and tax are always presented as separate lines.
- Totals shown before checkout are labelled estimates, because catalogue prices move.

Service rates (assembly fee, OS installation, shipping thresholds) are constants in version
control rather than editable settings rows: changing what customers are charged should go through
review and be revertible.

---

## Data model

Full schema: [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).

| Table | Holds |
| --- | --- |
| `profiles` | One row per auth user, including `role` |
| `components` | The catalogue, with typed compatibility fields |
| `saved_builds` | Customer configurations |
| `quotes` | Quote requests, with staff-only `internal_notes` |
| `orders` / `order_items` | Orders, with an immutable configuration snapshot per item |
| `support_tickets` / `ticket_messages` | Support threads, with internal messages flagged |
| `activity_log` | Audit trail of administrative changes |
| `portfolio_builds` | Published build write-ups |
| `contact_messages` | Contact form submissions |

Two choices worth calling out:

- **Component ids are readable slugs** (`cpu-amd-ryzen-7-9800x3d`), not UUIDs. Build configurations
  are stored as JSON referencing these ids; readable ids make orders, support tickets and manual
  database work far easier to follow.
- **Order items store a configuration snapshot.** A component later repriced or deactivated must
  not change what a past order says was bought.

Stock is decremented by a Postgres function
([`0002_order_functions.sql`](supabase/migrations/0002_order_functions.sql)) rather than a
read-modify-write in application code, so two orders paid in the same second cannot both read the
last unit and both sell it.

---

## Security

| Concern | How it is handled |
| --- | --- |
| Admin access | `requireAdmin()` re-reads the role from `profiles` server-side on every request. Hiding the nav link is cosmetic. |
| Data isolation | Row Level Security on every customer-facing table. A customer reading orders without a filter still gets only their own. |
| Role escalation | A database trigger rejects any `role` change made by a non-admin, so a customer editing their own profile row cannot promote themselves. |
| Payment integrity | Only the signature-verified Stripe webhook may mark an order paid. The success page is read-only. |
| Card data | Never touches the application. Stripe Checkout collects it; we store only Stripe's opaque ids. |
| Price tampering | No schema accepts a price. Everything is recalculated server-side from the catalogue. |
| Internal notes | Filtered by RLS policy, not only by the query the application happens to write. |
| Live-key accidents | Checkout refuses to create a session with a live Stripe key outside production. |
| Error disclosure | Route handlers return short messages; stack traces stay in server logs. |
| Probing | Admin routes return 404, not 403, so they do not confirm what exists. |

---

## Local development

```bash
npm install
cp .env.example .env.local     # optional; the app runs without it
npm run dev
```

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (93 tests) |
| `npm run db:seed:generate` | Regenerates `supabase/seed/seed.sql` from the TypeScript catalogue |

### Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_initial_schema.sql`, then `0002_order_functions.sql`, in the SQL
   editor (or `supabase db push` with the CLI).
3. Run `supabase/seed/seed.sql` to load the sample catalogue.
4. Copy the project URL and anon key into `.env.local`, plus the service-role key.
5. Register through the site, then promote yourself:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
   There is deliberately no self-service path to `admin`.

### Connecting Stripe (test mode)

1. Copy the **test** secret and publishable keys into `.env.local`.
2. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Put the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
4. Pay with `4242 4242 4242 4242`, any future expiry, any CVC.

Without the webhook secret the endpoint rejects every request, which is the correct failure mode:
an unverified request must never mark an order paid.

---

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for the full walkthrough: Vercel setup, environment
variables per environment, Stripe webhook registration, custom domain and DNS, and the checks to
run before switching to live payments.

---

## Testing

```bash
npm test
```

93 tests covering the logic where a mistake costs money or misleads a customer:

- **Compatibility engine** — every rule, in both the passing and failing direction, plus the
  "missing data reports unknown" property
- **Power estimation** — summation, category defaults, vendor minimums, PSU sizing thresholds
- **Pricing and tax** — per-province rates, rounding to the cent, assembly and shipping rules,
  totals equal to the sum of their parts
- **Cart resolution** — server-side pricing, stock and compatibility blocking, order snapshots
- **Validation** — that injected prices are dropped, quantities are bounded, and provinces,
  component ids and emails are checked

UI rendering is deliberately not unit tested. The valuable assertions here are about money,
hardware rules and trust boundaries.

---

## Known limitations

Stated plainly rather than left for a reader to discover:

- **The catalogue was checked against Canadian retail on 18 September 2026.** Prices and the
  compatibility-critical specifications on each row were read from a retailer or manufacturer
  listing on that date, and each row records the date in `specs.price_checked`. Rows where a single
  figure could not be confirmed stay marked `data_confidence: 'sample'`, name the unconfirmed field
  in `specs.unverified`, and are labelled as unverified in the storefront.
- **Prices go stale.** Memory and storage moved sharply through 2026 and graphics card
  availability churns monthly, so re-check before quoting. Several models had already been
  discontinued between revisions.
- **Stock levels are nominal.** Every row opens at five units so the storefront is usable. Set them
  from `/admin/inventory` against what is actually on the shelf before trading.
- **`cost_cents` is null on every row.** There is no distributor pricing yet, and inventing a cost
  would produce a fake margin column in the admin.
- **Tax rates need confirming** against current CRA guidance before invoicing anyone.
- **Windows licence prices are placeholders.** OEM licence cost depends on a Microsoft reseller
  account, not on retail pricing.
- **Policy pages are drafts** and carry a visible notice saying so.
- **The portfolio is empty** because no builds have been documented yet. It shows an empty state
  rather than invented work.
- **Email is not configured** by default. Notifications are logged, and the UI tells the customer
  when a confirmation was not actually sent.
- **No images on catalogue rows.** A category glyph is drawn instead of a stock photo of a part we
  do not have a picture of. `image_url` is supported per component.

## Possible next steps

- Per-part verification workflow to move the catalogue from sample to verified
- Order-status emails as HTML templates rather than plain text
- Build comparison view (two configurations side by side)
- Customer-facing build photos attached to an order during assembly
- Rate limiting on the public quote and contact endpoints
- End-to-end tests with Playwright covering configure → cart → checkout

---

## Licence

Copyright (c) 2026 Arnob Sarfraj. All rights reserved. See [LICENSE](LICENSE).
This is proprietary software for PC Builders Canada, published here as a
portfolio reference rather than as an open-source project.
