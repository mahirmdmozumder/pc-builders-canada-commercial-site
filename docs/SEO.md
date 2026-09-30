# SEO

How search sees this site, and which decisions are deliberate.

## Route map

| URL | Purpose | Primary intent | Index | Metadata source | Structured data |
| --- | --- | --- | --- | --- | --- |
| `/` | Homepage | brand, "custom PC builder Toronto" | ✅ | static + CMS prices | Organization, WebSite, LocalBusiness |
| `/shop` | Whole catalogue | "PC parts Toronto" | ✅ | static | Breadcrumb |
| `/build` | Configurator | "custom PC builder Toronto" | ✅ | static | — |
| `/gaming-pcs` | Pre-built listing | "pre-built gaming PC Toronto" | ✅ | static | ItemList, Breadcrumb |
| `/pre-built-gaming-pcs/[slug]` | One machine | "[model] gaming PC" | ✅ | **CMS preset** | Product, Breadcrumb |
| `/workstations` | Workstation listing | "workstation PC Toronto" | ✅ | static | ItemList, Breadcrumb |
| `/services` | Service hub | "IT services Toronto" | ✅ | static | Service, ItemList, Breadcrumb |
| `/services/[slug]` | One service | "NAS setup Toronto", "PC repair Toronto" | ✅ | **CMS service** | Service, FAQPage, Breadcrumb |
| `/networking` `/nas` `/mini-pcs` | Shop categories | product browsing | ✅ | CMS collection | — |
| `/refurbished` | Open-box listing | "refurbished PC parts Toronto" | ✅ | static | — |
| `/portfolio` | Completed builds | social proof | ✅ | static | — |
| `/quote` `/contact` `/about` | Conversion | brand | ✅ | static | — |
| `/refer` | Referral terms | — | ✅ | static | — |
| `/legal/[slug]` | Policies | — | ✅ | CMS-ish | — |
| `/scan` | QR landing | — | ❌ noindex, follow | static | — |
| `/cart` `/checkout` | Purchase flow | — | ❌ noindex | static | — |
| `/login` `/register` | Auth | — | ❌ noindex, follow | static | — |
| `/account/*` | Customer area | — | ❌ noindex | static | — |
| `/admin/*` | Admin | — | ❌ noindex, nocache | static | — |

## Search intent → page

| Query | Lands on |
| --- | --- |
| custom PC builder Toronto | `/build` |
| pre-built gaming PC Toronto | `/gaming-pcs` |
| PC repair Toronto | `/services/diagnostics`, `/services/troubleshooting` |
| computer technician Toronto | `/services/troubleshooting` |
| on-site IT support Toronto | `/services/onsite-it` |
| network setup Toronto | `/services/networking` |
| WiFi troubleshooting Toronto | `/services/networking` |
| NAS setup Toronto | `/services/nas-storage` |
| home server / home lab Toronto | `/services/server-infrastructure` |
| Raspberry Pi setup Toronto | `/services/mini-pc-setup` |
| PC upgrade Toronto | `/services/upgrades` |
| buy network switch Toronto | `/networking`, `/shop?c=networking` |

One page per intent. No page is asked to rank for everything.

## Rules that are deliberate

**No per-city landing pages.** `/pc-repair-markham/` and friends would be the
same page with a city swapped — a doorway page, which Google has treated as
spam for over a decade. Local relevance comes from `areaServed` in
LocalBusiness schema, genuine mentions in service copy, and (most importantly)
a verified Google Business Profile.

**No query-parameter URLs in the sitemap.** Presets used to be listed as
`/build?preset=slug`. Google largely ignores param URLs for indexing, and they
would now duplicate the real `/pre-built-gaming-pcs/[slug]` pages. Shop filter
and sort URLs are excluded for the same reason: same products, different
order, split signal.

**Structured data must match the visible page.** Every emitter takes the data
the page renders. `FaqJsonLd` receives the same array the page displays.
`ProductJsonLd` returns `null` when there is no price, because an offer
without a price is invalid. Condition maps honestly — open-box is `NewCondition`
(unused), but `tested` and `used` map to `UsedCondition` and refurbished to
`RefurbishedCondition`.

**No invented business facts.** `src/lib/seo/business.ts` omits `address`
(there is no storefront), `openingHours` (none published), `aggregateRating`
(no reviews) and `sameAs` (no social profiles configured). Each appears
automatically once the underlying fact becomes true in
`src/content/business.ts`.

**Unpublished content 404s.** A service or preset that is drafted or archived
is absent from the sitemap and its page returns a real 404 rather than an
empty shell. A soft 404 keeps a dead URL in the index pointing at nothing.

## Where metadata comes from

Every CMS record has `seo_title` and `seo_description` columns. Both are
**optional overrides**. When blank, the page builds its own from the content —
service name plus region, or preset name plus its actual CPU and GPU. Nobody
has to fill in SEO fields for a product to be indexed properly.

## Manual steps that code cannot do

1. **Google Search Console** — add `https://www.pcbuilderscanada.com`, verify
   (DNS TXT record via your registrar is the most durable method), submit
   `/sitemap.xml`.
2. **Google Business Profile** — create and verify it. For local searches this
   matters more than anything on this list. Category "Computer repair service",
   service area rather than a storefront address, real phone, link to the site.
3. **Bing Webmaster Tools** — free, imports from Search Console, takes minutes.

## Known gaps

- **No blog.** The system is not built. An empty blog helps nothing, and
  auto-generated articles would be worse than none.
- **Portfolio is empty**, so there are no portfolio detail pages yet. Those
  are strong pages when there is real work to show.
- **No reviews**, so no review schema. This is the single biggest local-SEO
  gap and it is fixed by asking customers, not by code.
