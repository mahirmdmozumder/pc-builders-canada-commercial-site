# Architecture decisions

Why the system is put together the way it is. Each section states the decision, the alternatives
considered, and what the decision costs.

---

## A single Next.js application

**Decision.** One deployable: pages, API routes, and the domain logic in a shared `lib/`.

**Alternatives.** A separate API service, or splitting the storefront from the admin.

**Why.** The whole system is one database, one payment provider and perhaps a few hundred orders a
month. A network boundary between the storefront and its own business logic would add deployment
coordination, a second set of auth plumbing, and a class of failure that does not currently exist,
in exchange for scaling independence nobody needs.

**Cost.** Admin and storefront scale together, and a bad deploy affects both. Acceptable at this
size; revisit if the admin grows into a genuinely separate product.

---

## Domain logic before UI

The compatibility, power and pricing engines were written and tested before any page existed. They
are pure functions over plain data with no framework imports, which is why they can run identically
in a server component, a route handler, and a client-side configurator with no round trip.

The first bug this caught: cooler `tdp_watts` was being used both as "power the fans draw" and
"heat the cooler can dissipate", which made a 360 mm liquid cooler look like a 12 W cooler and
threw a false warning on every high-power processor. A test on a known-good build failed
immediately. That fix became the `cooling_capacity_watts` field.

---

## Typed columns for compatibility data, JSON for the rest

**Decision.** Every field a rule compares (`socket`, `memory_type`, `max_gpu_length_mm`,
`radiator_support_mm`, ...) is a typed Postgres column. Display-only extras live in a `specs`
JSONB bag.

**Alternatives.** Everything in JSONB, which is flexible; or full normalisation into
per-category tables, which is pure.

**Why not all JSON.** The engine would be parsing and coercing untyped values at runtime, the
database could not constrain them, and a typo in a key would silently disable a safety check.

**Why not per-category tables.** Ten tables with near-identical columns, a union query or ten
queries to load a catalogue, and joins on every rule. The complexity buys nothing here: the
attributes are known and stable.

**Cost.** The `components` table is wide, and adding a new compatibility attribute means a
migration. That is the right friction for a field a safety rule depends on.

---

## Readable component ids

**Decision.** `cpu-amd-ryzen-7-9800x3d`, not a UUID.

**Why.** Build configurations are stored as JSON arrays of `{category, component_id, quantity}` in
saved builds, quotes and order snapshots. When a customer asks what is in order PCB-7K2M9Q, a
readable id answers it directly. With UUIDs, every inspection needs a join.

**Cost.** Ids are not opaque, and renaming a product does not rename its id. Both are fine: ids are
internal identifiers, not display names, and stability is a feature.

---

## Sample catalogue as a fallback data source

**Decision.** With no database configured, catalogue reads fall back to an in-repo dataset, and the
UI states that it is doing so.

**Why.** The repository is clonable and the site fully demonstrable without provisioning anything.
It also means the pricing and cart logic can be tested end to end without a live Postgres instance.

**The honesty constraint.** Every sample row carries `data_confidence: 'sample'`, the configurator
shows an "unverified spec" marker per part, and a banner explains the catalogue is not live
inventory. A fallback that silently pretended to be real data would be worse than no fallback.

---

## Three Supabase clients

| Client | Key | Sees | Used by |
| --- | --- | --- | --- |
| Public | anon, no cookies | Whatever RLS allows anonymously | Catalogue and portfolio reads |
| Session | anon, with cookies | The signed-in user's rows | Account and admin pages, most route handlers |
| Service role | service key, bypasses RLS | Everything | Stripe webhook, guest quote inserts, order writes |

The public client exists specifically so marketing pages stay statically renderable: reading
cookies in a page forces dynamic rendering, and the catalogue is identical for every visitor.

The service-role client is confined to two jobs: the webhook, which has no user session, and order
writes, which must not be creatable by a client under any circumstances.

---

## Authorization in two places, deliberately

1. `requireAdmin()` reads the role from `profiles` on the server on every request.
2. Row Level Security enforces the same boundary inside Postgres.

Neither is redundant. The application check produces good UX (a redirect rather than an empty
page); the database check is what holds if a query forgets a filter, or if a route is added without
its guard. The proxy layer does a third, weaker check — it only knows whether someone is signed in —
and is treated as convenience, not security.

Role escalation gets its own defence: a trigger rejects any `role` change attempted by a
non-admin, so the customer-facing profile update cannot promote an account even though it writes to
the same row.

---

## Payment state comes only from the webhook

The success page is a page. It can be opened directly, replayed, or linked to. So it reads order
state and never writes it.

The signed webhook is the only writer of `payment_status`. It verifies Stripe's signature before
touching anything, checks current state before writing (Stripe retries, and will deliver the same
event twice), and returns 500 on a transient database failure specifically so Stripe retries.

Stock decrement happens there too, through a Postgres function rather than read-modify-write in
application code. Two orders paid in the same second would otherwise both read `stock = 1` and both
write `stock = 0`.

---

## Money as integer cents

Every amount is an integer number of cents, everywhere: database columns, function arguments,
Stripe line items. Formatting to dollars happens once, at the edge, in `formatMoney`.

Floating-point dollars accumulate error across a subtotal, a tax line and a total, and the error
shows up as an invoice that is one cent off. Rounding happens exactly once, when tax is applied.

---

## Client state behind a hydration boundary

Carts and in-progress builds live in `localStorage`, which the server cannot read. The naive
approach — render empty, then patch state in an effect — causes a double render and a visible flash
of the wrong content.

Instead, components that depend on browser state are mounted only after hydration
(`useHydrated`, built on `useSyncExternalStore`) and seed their state directly from storage in a
`useState` initializer. Single render, no mismatch, no flash.

---

## What was deliberately not built

- **Charts on the dashboard.** With a young order book a trend line is noise. Counts and lists
  answer the actual morning questions: what needs action, what is running low, what changed.
- **Editable pricing settings.** Service rates are constants in version control. Changing what
  customers are charged should be a reviewable, revertible commit, not a form.
- **A recommendation engine.** The configurator already tells you what will not fit. Guessing what
  someone should buy is a different and much weaker claim.
- **Live chat, multi-vendor, subscriptions.** None serve the goal, all add permanent surface area.
