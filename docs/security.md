# Authentication, authorization and data protection

## Authentication

Supabase Auth, email and password. The browser client signs in and receives a session; middleware
refreshes the token on each request and writes the rotated cookies back. Without that refresh a
signed-in user silently becomes signed-out on the next server render.

Server-side, sessions are read with `supabase.auth.getUser()`, never `getSession()`. `getUser()`
revalidates the token with Supabase; `getSession()` trusts a cookie the client could have edited.

`getSessionUser()` is wrapped in React's `cache()` so a layout and its page share one lookup per
request.

### Deliberate choices in the auth UI

- A failed sign-in never distinguishes "no such account" from "wrong password". The difference tells
  an attacker which addresses are registered.
- Password reset always reports success, for the same reason.
- Sign-out is POST only. A GET would let a third-party page sign a visitor out with an `<img>` tag.
- The auth callback restricts its `next` parameter to same-site paths, so a crafted link cannot
  bounce a freshly authenticated user to another site.
- Minimum password length is 10, with a hint suggesting a passphrase.

## Authorization

Three layers, each doing a different job:

| Layer | Checks | Why it is not sufficient alone |
| --- | --- | --- |
| Middleware | Is anyone signed in? | Knows nothing about roles; matcher config can be wrong |
| `requireAdmin()` | Is this user's `profiles.role` = admin? | Only runs where a developer remembered to call it |
| Row Level Security | Does the database allow this row? | Runs always, including on queries nobody reviewed |

The role is read from the `profiles` table server-side on every request. It is never taken from a
cookie, a client prop, or `user_metadata` (which is client-writable in some Supabase flows — a role
the client can edit is not a role).

Admin routes return **404**, not 403. A 403 confirms the resource exists; a 404 says nothing.

### Role escalation

The customer-facing profile form writes to the same row that holds `role`. A trigger
(`prevent_role_escalation`) rejects any `role` change made by a non-admin, so even a hand-crafted
request from a signed-in customer cannot promote the account. There is no UI anywhere that grants
admin — it is a deliberate SQL statement run by a human.

## Row Level Security

Enabled on every table holding customer data. Representative policies:

```sql
-- A customer reads only their own orders. No application filter required.
create policy "orders: owner read" on orders for select
  using (user_id = auth.uid() or is_admin());

-- No insert policy exists for customers at all. Orders are created only by
-- the server, via the service-role key, after prices are recalculated.

-- A customer sees their ticket thread minus internal notes, enforced here
-- rather than trusting every query to remember the filter.
create policy "ticket messages: owner read non-internal" on ticket_messages for select
  using (
    is_admin()
    or (is_internal = false and exists (
      select 1 from support_tickets t
      where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    ))
  );
```

`is_admin()` is `SECURITY DEFINER` so it can read `profiles` without triggering the policy that
calls it, which would otherwise recurse.

### Cost price is not readable by the public

Row Level Security operates on rows, not columns, so a policy allowing anyone
to read active `components` rows would have published `cost_cents` — the
margin on every part — to anyone holding the anon key.

The fix is structural rather than a filter in application code:

- `components` is **admin-only** for reads.
- Public traffic reads `components_public`, a view with an explicit column
  list that omits cost. Adding a column to the table does not add it to the
  view, so a future cost or supplier field cannot leak by being added.
- Admin cost reads use the **session** client, not the service-role client.
  If a page ever forgets its `requireAdmin()` call, the policy returns nothing
  instead of returning margin. Fail closed, not fail open.

## Payment security

- **No card data touches this application.** Stripe Checkout collects it on Stripe's domain. The
  database stores a session id and a payment intent id, both opaque.
- **Only the signed webhook marks an order paid.** The success page reads state and never writes it.
- **Test and live are separated.** `assertTestModeOutsideProduction()` throws if a live secret key
  is used outside production, and the admin shows which mode is active.
- **Amounts are server-computed.** Stripe line items are built from the server's own calculation.

## Input handling

Every request body is parsed with a Zod schema before anything else. The schemas have **no price
fields**, so an injected total is dropped rather than validated. Strings are length-capped, ids are
constrained to safe slugs (`/^[a-z0-9-]+$/`), and enums reject anything not in the domain.

Database access is through the Supabase client, which parameterises. The one place user text enters
a query string is search, where `%` and `,` are stripped before building the `or()` filter.

No user content is rendered as HTML anywhere. React escapes by default, and the only
`dangerouslySetInnerHTML` in the codebase serialises a hard-coded object literal for JSON-LD.

## Error handling and disclosure

Route handlers return short, actionable messages. Stack traces, database error text and internal
ids go to the server log. `handle()` wraps every handler so an unexpected throw becomes a clean 500
rather than a trace in a response body.

The client-side error boundary shows Next's `digest` reference and nothing else.

## Secrets

- `.env*` is gitignored, with `!.env.example` re-included.
- The service-role key is server-only and never prefixed `NEXT_PUBLIC_`.
- The anon key is public by design: RLS is what protects data, not key secrecy.
- No secret is committed. `.env.example` documents each variable and what happens without it.

## Known gaps

Stated rather than hidden:

- **No rate limiting** on the public quote and contact endpoints. Both write to the database from
  unauthenticated requests. Add Vercel rate limiting or an application-level limiter before any
  real traffic.
- **No CAPTCHA** on public forms.
- **Email enumeration via quote submission** is possible in the sense that anyone can submit any
  address; there is no confirmation loop.
- **Audit log is append-only by convention**, not by a database constraint.
- **No 2FA** for admin accounts. Supabase supports MFA; enabling it for admins is a sensible next
  step before handling real orders.
