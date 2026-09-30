# Product pages and reviews

What `/products/[slug]` renders, and the rules the review system enforces.

## The route

| | |
| --- | --- |
| URL | `/products/[slug]`, built only by `productHref()` |
| Slug | `components.slug`, falling back to `components.id` (equal for every row the admin creates) |
| Data | one row of `components_public`, plus `product_reviews_public` and `product_review_stats` |
| Rendering | SSG for everything in the catalogue at build time, `revalidate = 60`, `dynamicParams` left true |
| 404 | `notFound()` when the row is absent from `components_public`, i.e. unpublished or archived |

Nothing on this page is authored. The specification sheet is derived from
whichever typed columns and `specs` keys the row holds, the price and stock are
live, and the rating is computed by Postgres. A field with no value produces no
row rather than an em dash.

### Why the session is not read here

The page read `getSessionUser()` in its first draft, to render "your review".
Reading a cookie anywhere in a server component opts the **whole route** out of
static rendering — the build marked it `ƒ`, so every visitor and every crawler
got a server render with a database round trip and `revalidate` did nothing.

The two per-visitor facts (are you signed in, have you reviewed this, did you
buy it) now come from `GET /api/reviews/mine` after paint. `generateStaticParams`
doubles as the regression test: a page that reads cookies cannot be prerendered,
so if a session read comes back the build stops producing `●` for this route.

## Media

`components.gallery_urls` already existed and was already uploadable in the
admin; nothing rendered it. The gallery shows the primary image, then the
gallery, then a video if there is one.

`components.video_url` (migration 0009) is a plain URL. `describeVideo()` decides
what it is:

| Input | Rendered as |
| --- | --- |
| YouTube or Vimeo page URL | poster the visitor clicks, which then mounts the iframe |
| `.mp4` / `.webm` URL | native `<video preload="none">` |
| anything else | nothing — no empty player |

An iframe mounted on page load pulls in several hundred kilobytes of third-party
script and sets cookies before anybody presses play, on a page most visitors are
reading for the price. YouTube embeds use `youtube-nocookie.com`.

The admin field shows, live, whether the pasted link will actually play — using
the same function the page uses, so it is the real answer rather than an
approximation. The `media` bucket accepts `video/mp4` and `video/webm` up to
50 MB, so an uploaded clip works too.

The gallery is hand-written. Pick a thumbnail, step through, enlarge, work under
a thumb: four behaviours, a few lines of state and a scroll-snap rail. The
smallest carousel packages that do the same ship 15–40 KB to every visitor,
including the ones looking at a product with one photo.

## Reviews

### What the system will not do

- **No seeded, sample or generated review.** `loadProductReviews` has no
  fallback content, unlike every other repository here — a fallback catalogue is
  sample data labelled as sample data, and a fallback review would be a
  fabricated customer opinion. When the database is unreachable a product has no
  reviews and says so.
- **No rating for an unreviewed product.** `product_review_stats` has no row for
  a product with no visible reviews, so stats are `null` rather than zeroed.
  "No reviews yet" and "rated 0 out of 5" are different claims.
- **No editing by the seller.** The trigger discards rating, title, body and
  display name on an admin update. Hiding is the only review write the business
  gets.

### Who can do what

| Actor | Can |
| --- | --- |
| Anyone | read visible reviews, via `product_reviews_public` (no `user_id`) |
| Signed-in customer | write one review per product; edit or delete their own |
| Author of a hidden review | see it, and the reason it was hidden |
| Admin | hide with a recorded reason, or restore |
| Nobody | edit somebody else's review, or set `verified_purchase` |

### Where each rule is enforced

| Rule | Enforced by |
| --- | --- |
| Reviews require an account | RLS insert policy: `auth.uid() is not null and user_id = auth.uid()` |
| You are the author of your review | the trigger sets `user_id := auth.uid()` on insert |
| One review per customer per product | `unique (component_id, user_id)` |
| Only your own review is editable | RLS update/delete policies scoped to `auth.uid()` |
| An edit cannot move products or unhide itself | the trigger pins `component_id`, `user_id`, `created_at`, `hidden_at` |
| `verified_purchase` reflects a paid order | `review_verified_purchase()`, recomputed on every write |
| A hidden review has a reason | CHECK constraint, and the Zod schema |
| Reviewer identity stays off the storefront | no public select policy on the table; the view omits `user_id` |

The API layer validates shape and produces readable messages. The database is
what enforces every row above, including against SQL run by hand.

### Verified purchase

`review_verified_purchase(user_id, component_id)` returns true when a **paid**
order from that user contains the product. A pending Stripe session is not a
purchase — treating one as a purchase would let anyone mint the badge by
starting a checkout and abandoning it.

It also credits a part bought **inside a build**. `order_items` stores a build as
a `configuration` snapshot rather than one row per part, so checking only
`order_items.component_id` would have called a customer who bought a machine
containing this drive unverified. That is the more common case on this site.

The badge is never accepted from a request body. `purchased` is sent to the form
only to set expectations in one sentence of copy; a client that lies about it
changes that sentence and nothing else.

### No approval queue

Reviews publish immediately. Holding every review until somebody clicks approve
means the honest ones sit invisible for days while the section looks dead, and in
practice it becomes a filter on reviews the seller dislikes. Spam is limited by
requiring an account and one review per product, and abuse is removed afterwards
with a reason on the record.

## Related and recently viewed

**Related** is ranked, not random: same category and brand, then same category,
then the companion categories in `COMPANION_CATEGORIES`. In-stock first within a
tier, so a suggestion is something that can be bought today. The current product
is excluded, and a test asserts it across four categories.

**Recently viewed** is `localStorage`, capped at eight. A server-side history
would mean a table, a write per product view, a privacy question about retaining
browsing histories of people who never bought anything, and an authenticated
read to render a decoration — and it would make the page dynamic. Prices there
are labelled as the ones shown when the product was viewed.

## Migration

`0009_product_pages_and_reviews.sql`, run as one query. Adds
`components.video_url`, rebuilds `components_public` to expose it, widens the
`media` bucket to video, and creates `product_reviews` with its trigger,
policies and two views.

**Before it is run**, product pages still work: `video_url` comes back undefined
and renders no video, and the review queries fail, are logged, and return empty —
so the section reads "No reviews yet". Nothing 500s.
