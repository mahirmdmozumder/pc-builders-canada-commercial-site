# Pricing, power, and the order lifecycle

## Power estimation

`src/lib/power/calculator.ts`.

```
estimated draw = Σ (part power x quantity) + fixed system overhead
recommended    = roundUpToRetailSize( max(estimate x 1.35, vendor minimum) )
```

**Per-part power** comes from `tdp_watts` on the catalogue row. Where a row has no figure, a
documented per-category default is used and the line is marked `estimated: true` in the breakdown,
so the customer can see which numbers are assumed.

**Fixed overhead** is 30 W: case fans, chipset and IO, USB peripherals, conversion losses. Things
that draw power but that nobody selects individually.

**The 1.35 multiplier** keeps a typical build in the 50–70% load band where ATX units are most
efficient, and leaves room for transient graphics card spikes that exceed sustained draw.

**Vendor minimums** are respected: a card that publishes "600 W system recommended" floors the
recommendation even when the calculation comes out lower.

**Retail rounding** maps to real capacities (450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200,
1300, 1500, 1600) so the recommendation is a unit that can actually be bought.

**Status** is `insufficient` above 100% load, `tight` above 85% or below a vendor minimum, and
`sufficient` otherwise.

The PSU, case and OS are excluded from the sum: a power supply does not consume its own output.

### Why it is called an estimate everywhere

It is arithmetic over published component figures, not a measurement with a meter. Real draw
depends on workload, silicon, ambient temperature and settings. The UI labels it an estimate, shows
the breakdown, and names the multiplier. Presenting a calculated figure as measured would be a
false claim, however small.

---

## Pricing

`src/lib/pricing/pricing.ts` and `tax.ts`.

```
subtotal = Σ (component price x quantity)          hardware only
services = assembly fee + OS install fee            per system, not per part
shipping = 0 above the free threshold, else flat
taxable  = subtotal + services + shipping
tax      = Σ (taxable x rate), each line rounded
total    = taxable + tax
```

**Integer cents throughout.** Rounding happens once, per tax line.

**Assembly is per system.** Two identical machines in one order carry two assembly fees, because
two machines get built. Loose components carry none.

**Tax is on everything.** Goods, labour and shipping are all taxable on a good shipped within
Canada.

### Provincial rates

One table in `tax.ts`, covering the four patterns: HST provinces, GST+PST, Quebec's GST+QST, and
GST-only territories. Rates are held in one place so a provincial change is a one-line edit.

The file says explicitly that the table needs verifying against current CRA guidance before
invoicing, and that registration obligations depend on where the business is established. Tax rates
are facts with an expiry date, not constants.

### Two entry points

- `priceBuild(build, options)` — one configuration, used by the configurator, presets and quotes.
- `priceCart(input)` — several lines, used by the cart and checkout.

Both produce the same `PriceBreakdown` shape, so the UI renders any of them identically.

---

## Order lifecycle

```
                 ┌──────────────── customer ────────────────┐
configure → cart → checkout → Stripe → success page (read-only)
                                 │
                                 ▼
                          webhook (signed)
                                 │
              ┌──────────────────┴───────────────────┐
              ▼                                      ▼
   payment_status: paid                     stock decremented
   status: confirmed                        activity logged
                                            email sent
                                 │
                                 ▼
        ┌─────────────── operator advances ───────────────┐
  processing → building → testing → ready → shipped → completed
```

### What happens at each step

**Checkout (`/api/checkout`)**

1. Re-resolve every cart line against the catalogue. The client's price snapshot is ignored.
2. Re-run compatibility and stock checks. Any problem returns 409 with the first problem: better to
   stop here than to take money for something that cannot be built.
3. Write a `pending` order plus its item snapshot **before** redirecting. If the customer pays and
   the browser dies on the way back, the webhook still has a row to mark paid.
4. Create a Stripe Checkout session whose line items mirror the breakdown the customer saw, so the
   Stripe receipt is itemised the same way.
5. Store the session id on the order.

Stock is **not** decremented here. An abandoned checkout must not hold inventory hostage.

**Webhook (`/api/stripe/webhook`)**

The only writer of payment state. Verifies the signature, then:

| Event | Effect |
| --- | --- |
| `checkout.session.completed` | If not already paid and the session really is paid: mark paid and confirmed, store the payment intent and shipping address, decrement stock atomically, log, email |
| `checkout.session.expired` | Cancel, but only if still `pending` |
| `payment_intent.payment_failed` | Mark failed, only if still `pending` |
| `charge.refunded` | Mark refunded, log it |

Every handler is idempotent because Stripe retries and re-delivers. A 500 is returned on transient
failure specifically to trigger a retry.

If stock adjustment fails after a successful payment, the webhook does **not** fail: the money is
already taken. It logs the failure to the activity log so an operator corrects it in
`/admin/inventory`.

**Operator status changes (`/api/admin/orders/[id]`)**

Each change is written, logged with actor and before/after, and emailed to the customer. Internal
notes are saved on the same request and never appear in the customer-facing order view or email.

### Order statuses

`pending → confirmed → processing → building → testing → ready → shipped → completed`, plus
`cancelled` as a terminal state off any point.

They are separate from payment status deliberately: an order can be paid and cancelled, or
confirmed and refunded. Collapsing them into one field loses that.

### Immutable snapshots

`order_items.configuration` stores the parts as purchased. If a component is repriced, renamed or
deactivated afterwards, the order still says what was actually bought. This is why components are
soft-deleted rather than removed.
