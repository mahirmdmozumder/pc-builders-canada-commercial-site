-- ===========================================================================
-- Product detail pages: video, and customer reviews
-- ===========================================================================
-- Run this WHOLE FILE as one query in the Supabase SQL editor. It is safe in a
-- single transaction: it adds one column to `components`, creates one new
-- table, and rebuilds three views. It does not rename, delete or rewrite
-- anything that already exists.
--
-- ---------------------------------------------------------------------------
-- What this adds, and why each piece is necessary
-- ---------------------------------------------------------------------------
--   1. components.video_url  -- one optional video per product. A column
--      rather than a table because a product has at most one, and a
--      one-to-one table is a join for nothing.
--
--   2. product_reviews       -- genuine customer reviews. No existing table
--      can hold these: order_items records what was bought, not what the
--      buyer thought of it.
--
--   3. Two views over product_reviews, so the storefront never reads the
--      table directly. See the note above each one; this is the part that
--      keeps a reviewer's auth user id out of the browser.
--
-- Nothing here seeds a single review. The table starts empty and stays empty
-- until real customers write in it. A product with no reviews says it has
-- none.
-- ===========================================================================


-- ===========================================================================
-- 1. Product video
-- ===========================================================================
-- Deliberately a plain URL rather than an upload-only field. The two things an
-- operator actually has are a YouTube link and, occasionally, a phone video of
-- a finished machine. Accepting both means the field is usable on day one; the
-- storage bucket change below covers the second case.
alter table components add column if not exists video_url text;

-- A blank string is not a video. Normalising it to NULL here means the page
-- tests one thing (video_url is null) instead of two, and an admin form that
-- submits an empty input cannot produce a broken media tab.
alter table components drop constraint if exists components_video_url_not_blank;
alter table components
  add constraint components_video_url_not_blank
  check (video_url is null or char_length(btrim(video_url)) > 0);


-- ---------------------------------------------------------------------------
-- components_public, rebuilt for video_url
-- ---------------------------------------------------------------------------
-- Still an explicit column list, and cost_cents is still absent. Adding a
-- column here is a deliberate act of publishing it, which is exactly why the
-- list is not a star.
drop view if exists components_public;

create view components_public as
  select
    id, sku, slug, category, brand, model, description, short_description,
    price_cents,
    stock_quantity, low_stock_threshold,
    image_url, gallery_urls, video_url, active, status, featured, sort_order,
    seo_title, seo_description,
    data_confidence, condition, condition_notes,
    socket, supported_sockets,
    chipset, memory_slots, max_memory_gb, m2_slots, sata_ports,
    form_factor, supported_form_factors,
    memory_type, memory_capacity_gb, memory_modules, memory_speed_mts,
    tdp_watts, recommended_psu_watts, psu_wattage, psu_efficiency, psu_form_factor,
    gpu_length_mm, max_gpu_length_mm, cooler_height_mm, max_cooler_height_mm,
    radiator_support_mm, radiator_size_mm, cooler_type, cooling_capacity_watts,
    storage_interface, storage_capacity_gb,
    pcie_version, specs,
    created_at, updated_at
  from components
  where status = 'published';

grant select on components_public to anon, authenticated;


-- ---------------------------------------------------------------------------
-- Storage: the media bucket accepts video as well as images
-- ---------------------------------------------------------------------------
-- The size limit rises to 50 MB because a short product clip does not fit in
-- 10 MB and a browser cannot re-encode video the way it can resize a photo.
-- It stays a limit rather than becoming unlimited: this bucket is public-read,
-- so anything in it is served to anyone holding the URL, and a cap is what
-- stops it being used as general file hosting.
--
-- The admin-only write policies from 0006 are untouched and apply to video
-- exactly as they do to images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ===========================================================================
-- 2. Customer reviews
-- ===========================================================================
-- ---------------------------------------------------------------------------
-- Design decisions, each about not publishing a claim we cannot support
-- ---------------------------------------------------------------------------
-- ONE REVIEW PER CUSTOMER PER PRODUCT, as a unique constraint rather than a
-- convention the API enforces. The cheapest way to manufacture a rating is to
-- post the same opinion ten times.
--
-- display_name IS A SNAPSHOT, not a join to profiles. Two reasons: a reviewer
-- chooses what their review is signed with, and rendering a review must never
-- require reading the profiles table, which holds email addresses.
--
-- verified_purchase IS NEVER ACCEPTED FROM THE CLIENT. It is computed by the
-- trigger below from real order data and overwritten on every write. A badge a
-- request body can set is not a verification.
--
-- HIDING, NOT DELETING, AND NO EDITING BY THE OPERATOR. The business can hide a
-- review (abuse, spam, wrong product) and the reason is recorded. There is no
-- path anywhere in this schema or the API by which the seller can change what a
-- customer wrote. A review the seller can edit is marketing copy, and the whole
-- value of a review is that it is not.
-- ---------------------------------------------------------------------------

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),

  component_id text not null references components(id) on delete cascade,
  -- The author. Reviews require an account: an anonymous review is
  -- unattributable and unlimited, which makes it worthless as a signal.
  user_id uuid not null references auth.users(id) on delete cascade,

  rating smallint not null check (rating between 1 and 5),

  -- Optional. A headline helps a reader skim, and forcing one produces titles
  -- that just restate the rating.
  title text check (title is null or char_length(btrim(title)) between 3 and 120),

  -- 20 characters is roughly "Works great, no issues" -- short, but an actual
  -- statement. Below that a review carries a rating and no information.
  body text not null check (
    char_length(btrim(body)) >= 20 and char_length(body) <= 4000
  ),

  display_name text not null check (
    char_length(btrim(display_name)) between 2 and 60
  ),

  -- Written by the trigger, never by a client. See product_reviews_guard().
  verified_purchase boolean not null default false,

  -- Moderation. NULL means visible; a timestamp means an admin hid it, and
  -- hidden_reason says why. A timestamp rather than a boolean so the record
  -- says when, which matters if it is ever disputed.
  hidden_at timestamptz,
  hidden_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_reviews_one_per_customer unique (component_id, user_id),
  -- A hidden review without a reason is an unexplained removal.
  constraint product_reviews_hidden_needs_reason check (
    hidden_at is null
    or (hidden_reason is not null and char_length(btrim(hidden_reason)) >= 5)
  )
);

drop trigger if exists product_reviews_set_updated_at on product_reviews;
create trigger product_reviews_set_updated_at
  before update on product_reviews
  for each row execute function set_updated_at();

-- The read the product page performs every time: visible reviews for one
-- product, newest first. Partial, because hidden rows are never in that path.
create index if not exists product_reviews_component_idx
  on product_reviews (component_id, created_at desc)
  where hidden_at is null;

-- Supports the rating aggregate without touching the body text.
create index if not exists product_reviews_rating_idx
  on product_reviews (component_id, rating)
  where hidden_at is null;

-- "Have I already reviewed this?", and the account-page listing.
create index if not exists product_reviews_user_idx
  on product_reviews (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- Verified purchase, computed from existing order data
-- ---------------------------------------------------------------------------
-- Only a PAID order counts. A pending Stripe session is not a purchase, and
-- treating one as a purchase would let anyone mint a verified badge by starting
-- a checkout and abandoning it.
--
-- A part bought INSIDE A BUILD counts too. order_items stores a build as a
-- `configuration` snapshot of {category, component_id, quantity} rather than one
-- row per part, so a customer who bought a machine containing this drive did
-- buy this drive. Checking only order_items.component_id would have called that
-- customer unverified -- both wrong, and the more common case on this site.
--
-- SECURITY DEFINER because it reads `orders`, whose RLS restricts a customer to
-- their own rows. It is called from the trigger with a user id the trigger
-- itself established, and it returns one boolean, so it cannot be used to read
-- anybody's orders.
create or replace function review_verified_purchase(p_user_id uuid, p_component_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.user_id = p_user_id
      and o.payment_status = 'paid'
      and (
        oi.component_id = p_component_id
        or exists (
          select 1
          from jsonb_array_elements(coalesce(oi.configuration, '[]'::jsonb)) as part
          where part ->> 'component_id' = p_component_id
        )
      )
  );
$$;

revoke execute on function review_verified_purchase(uuid, text) from anon, authenticated;


-- ---------------------------------------------------------------------------
-- The write guard
-- ---------------------------------------------------------------------------
-- Everything a client must not control is set here rather than trusted from the
-- request. The API validates shape; this decides facts.
create or replace function product_reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- The author is whoever is signed in, full stop. The RLS policy checks this
    -- too; doing it here as well means a body carrying somebody else's user_id
    -- is corrected rather than merely rejected.
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;

    new.verified_purchase := review_verified_purchase(new.user_id, new.component_id);

    -- A review cannot arrive pre-hidden. Moderation is an admin action taken
    -- afterwards, and allowing these on insert would let a client write an
    -- unexplained moderation record.
    new.hidden_at := null;
    new.hidden_reason := null;

  else
    if is_admin() then
      -- An admin may hide or unhide, and nothing else. The customer's words,
      -- their rating and their name are not the seller's to edit.
      new.rating            := old.rating;
      new.title             := old.title;
      new.body              := old.body;
      new.display_name      := old.display_name;
      new.component_id      := old.component_id;
      new.user_id           := old.user_id;
      new.created_at        := old.created_at;
      new.verified_purchase := old.verified_purchase;
    else
      -- The author may revise their own rating, title and text. Everything that
      -- establishes identity, subject or standing is pinned to the stored row,
      -- so an edit cannot move a review onto another product or quietly unhide
      -- it.
      new.component_id  := old.component_id;
      new.user_id       := old.user_id;
      new.created_at    := old.created_at;
      new.hidden_at     := old.hidden_at;
      new.hidden_reason := old.hidden_reason;
      -- Recomputed rather than carried over: if the order was refunded since,
      -- the badge should go.
      new.verified_purchase := review_verified_purchase(old.user_id, old.component_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists product_reviews_guard_trigger on product_reviews;
create trigger product_reviews_guard_trigger
  before insert or update on product_reviews
  for each row execute function product_reviews_guard();


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- There is deliberately NO public select policy on this table. Anonymous and
-- signed-in visitors read the view below instead, which does not contain
-- user_id. A table-level read policy grants every column, and linking a
-- published review to an auth user id is not something to publish.
alter table product_reviews enable row level security;

-- The author sees their own, including one an admin has hidden. Being told your
-- review was removed is part of removing it honestly.
drop policy if exists "reviews: author read" on product_reviews;
create policy "reviews: author read"
  on product_reviews for select
  using (user_id = auth.uid() or is_admin());

-- Signed-in only. The auth.uid() null test is redundant against the equality,
-- but it states the rule where somebody is reading the policy list.
drop policy if exists "reviews: author insert" on product_reviews;
create policy "reviews: author insert"
  on product_reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "reviews: author update" on product_reviews;
create policy "reviews: author update"
  on product_reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reviews: author delete" on product_reviews;
create policy "reviews: author delete"
  on product_reviews for delete
  using (user_id = auth.uid());

-- Admin moderation. The policy grants the write; the trigger above decides
-- which columns survive it, which is what limits this to hiding.
drop policy if exists "reviews: admin manage" on product_reviews;
create policy "reviews: admin manage"
  on product_reviews for all
  using (is_admin())
  with check (is_admin());


-- ---------------------------------------------------------------------------
-- product_reviews_public
-- ---------------------------------------------------------------------------
-- What the storefront reads. Two things are absent on purpose: user_id, and
-- anything about moderation. A visitor gets the review and who signed it.
drop view if exists product_reviews_public;

create view product_reviews_public as
  select
    id, component_id, rating, title, body, display_name,
    verified_purchase, created_at, updated_at
  from product_reviews
  where hidden_at is null;

grant select on product_reviews_public to anon, authenticated;


-- ---------------------------------------------------------------------------
-- product_review_stats
-- ---------------------------------------------------------------------------
-- The aggregate, computed by Postgres over every visible review.
--
-- Why a view rather than averaging in the application: the page would have to
-- fetch every review row to average them, which is fine at ten reviews and
-- wrong at five hundred -- the page would paginate, average whichever page it
-- happened to load, and publish that as the product's rating. A rating that
-- drifts with pagination is worse than no rating, and this number also goes
-- into Product structured data, where a wrong figure is a wrong claim.
--
-- A product with no visible reviews has NO ROW here rather than a row of
-- zeroes. "No reviews yet" and "rated 0" are different statements, and only one
-- of them is true.
drop view if exists product_review_stats;

create view product_review_stats as
  select
    component_id,
    count(*)::int                                  as review_count,
    round(avg(rating)::numeric, 2)                 as average_rating,
    count(*) filter (where rating = 5)::int        as count_5,
    count(*) filter (where rating = 4)::int        as count_4,
    count(*) filter (where rating = 3)::int        as count_3,
    count(*) filter (where rating = 2)::int        as count_2,
    count(*) filter (where rating = 1)::int        as count_1,
    count(*) filter (where verified_purchase)::int as verified_count,
    max(created_at)                                as latest_review_at
  from product_reviews
  where hidden_at is null
  group by component_id;

grant select on product_review_stats to anon, authenticated;
