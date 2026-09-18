# Testing guide

Three stages, each usable on its own. Stage one needs no accounts at all.

---

## Stage 1: locally, with no external services

```bash
cd "Desktop/Ai Claud/pc-builders-canada"
npm install      # only needed the first time
npm run dev
```

Open <http://localhost:3000>. The catalogue falls back to the in-repo dataset,
so everything except accounts and payment works.

### Automated checks

```bash
npm test           # 93 tests: compatibility, power, pricing, cart, validation
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run build      # production build
```

All four should pass with no output beyond success. If `npm run build`
succeeds, the app is deployable.

### Click-through script

Work down this list. Each item states what correct behaviour looks like, so a
wrong result is obvious.

**Configurator** (`/build`)

1. Pick a processor. The summary panel shows it, and the compatibility panel
   says other checks are waiting on more parts.
2. Pick a motherboard with a different socket — an Intel board under an AMD
   processor. **Expect:** a red "Socket mismatch" failure naming both sockets,
   and the add-to-cart button disabled.
3. Fix the socket by choosing an AM5 board, then pick the ROG STRIX B850-I,
   which is the mini-ITX board with only two memory slots. Add a memory kit and
   set its quantity to two. **Expect:** a failure reading "4 memory modules
   selected but the board has 2 slots".
4. With that same board still selected, add three NVMe drives. **Expect:** a
   failure saying the drives outnumber the M.2 slots.
5. Build something complete and valid. **Expect:** "Compatible", ten checks
   listed, and an estimated draw with a breakdown when you expand it.
6. Change the province dropdown from Ontario to Alberta. **Expect:** the tax
   line changes from HST to GST and the total drops.
7. Reload the page. **Expect:** your build is still there, restored from
   browser storage.

**Power and pricing**

6b. Select the Ryzen 9 9950X with the RTX 5080 and the 650 W supply.
    **Expect:** the power panel turns amber and says the supply is tight, with
    the estimated draw and the recommended capacity both shown.

**Presets and pricing**

8. Visit `/gaming-pcs`. **Expect:** cards with prices computed from the
   catalogue, not hard-coded. The 1440p configuration should total roughly
   $5,000 including assembly, shipping and Ontario tax.
9. Open one in the configurator. **Expect:** the parts load and the checks pass.

**Cart** (`/cart`)

10. Add a build to the cart. **Expect:** parts, assembly, shipping and tax
    listed separately, and the assembly fee charged once.
11. Set the quantity to two. **Expect:** two assembly fees.
12. Add any single component and set its quantity to nine. **Expect:** an
    out-of-stock warning, because every row opens at five units, and the
    checkout button blocked.

**Honest failure modes**

13. Go to `/checkout`. **Expect:** a notice that payment is not configured,
    with a link to request a quote instead. It must not pretend to take money.
14. Go to `/login`. **Expect:** a notice that accounts need a backend.
15. Go to `/admin`. **Expect:** a redirect to the sign-in page.
16. Go to `/portfolio`. **Expect:** an empty state, not invented past builds.

**Responsive and keyboard**

17. Narrow the window to phone width. **Expect:** the configurator stacks, the
    summary moves below the parts list, and tables scroll sideways rather than
    overflowing the page.
18. Press Tab from the top of any page. **Expect:** a "Skip to main content"
    link appears first, and every focused control shows a visible red outline.

---

## Stage 2: with the database connected

This turns on accounts, saved builds, quotes, support tickets and the admin.

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run, in order, pasting the contents of each file:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_order_functions.sql`
   - `supabase/seed/seed.sql`
3. In **Project Settings → API**, copy the project URL, the `anon` key and the
   `service_role` key.
4. Create `.env.local` in the project root:

   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. Restart `npm run dev` (environment variables are read at boot).

### What to check

1. The "sample catalogue" banner on `/build` is gone. The catalogue now comes
   from Postgres.
2. Register at `/register`, then sign in. **Expect:** the header shows
   "Account".
3. Save a build. **Expect:** it appears under `/account/builds` with its
   estimate and a "checks passed" badge.
4. Submit a quote from `/quote` with a build attached. **Expect:** a reference
   like `Q-7K2M9Q`, plus a note that no confirmation email was sent, because
   email is not configured. That honesty is intentional.
5. Try `/admin`. **Expect:** redirected away. You are a customer.
6. In the Supabase SQL editor:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
   Sign out, sign back in, and `/admin` now works.
7. In `/admin/inventory`, change a stock level. **Expect:** the change saves and
   appears in the dashboard activity feed with the delta.

### The security check worth doing yourself

Open `/admin/components` and confirm cost and margin columns are visible.
Then sign out and load the catalogue as an anonymous visitor. Cost must not
appear anywhere, including in the network response. The public site reads a
database view that does not contain that column.

---

## Stage 3: payments

Card payments need a webhook, and a webhook needs a public URL. Testing this
against a deployed preview is simpler than installing the Stripe CLI, so this
stage comes after the first deploy. See [`deployment.md`](deployment.md).

Once deployed with Stripe test keys and a webhook pointing at
`/api/stripe/webhook`:

1. Check out with card `4242 4242 4242 4242`, any future expiry, any CVC.
2. **Expect:** the confirmation page shows an order number and a paid status.
3. In `/admin/orders`, the order shows **Paid** and **Confirmed**.
4. The parts in that build have had their stock decremented.
5. The activity log has an entry for the payment.

If payment succeeds but the order stays **Pending**, the webhook is not
arriving. Open the endpoint in the Stripe dashboard and read the delivery
attempts: `400` means the signing secret does not match, `503` means the
service-role key is missing from the deployment.

To test a failure path, use card `4000 0000 0000 0002`, which Stripe declines.
No order should be marked paid.
