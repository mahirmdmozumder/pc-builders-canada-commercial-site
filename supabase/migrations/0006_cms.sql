-- ===========================================================================
-- Content management
-- ===========================================================================
-- Run 0005 first and let it finish. This file uses the enum values it adds.
-- Run this whole file as one statement; it is safe in a single transaction.
--
-- Everything here is ADDITIVE. No existing column is dropped and no existing
-- row is deleted, because this runs against a live storefront with real
-- orders behind it.
--
-- ---------------------------------------------------------------------------
-- The one idea worth understanding before reading the rest
-- ---------------------------------------------------------------------------
-- Inventory and content are kept apart deliberately.
--
--   stock_quantity / low_stock_threshold  -> how many units exist
--   status / featured / images / specs    -> what a customer is shown
--
-- They live on the same row because a product IS one thing, but nothing here
-- touches the stock columns and nothing here duplicates the inventory screen.
-- apply_order_stock() from 0002 remains the only writer of stock during
-- checkout.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Publication state
-- ---------------------------------------------------------------------------
-- Three states, replacing a boolean that could only say yes or no:
--
--   draft      - being written, never public
--   published  - live on the site
--   archived   - withdrawn, but kept because orders reference it
--
-- Archived rather than deleted is not a preference. order_items and
-- saved_builds store component ids, so deleting a row would rewrite what a
-- customer actually bought.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'published', 'archived');
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- components: publication, presentation and SEO
-- ---------------------------------------------------------------------------
alter table components add column if not exists status content_status not null default 'published';
alter table components add column if not exists short_description text;
alter table components add column if not exists gallery_urls text[] not null default '{}';
alter table components add column if not exists featured boolean not null default false;
alter table components add column if not exists sort_order integer not null default 0;
alter table components add column if not exists seo_title text;
alter table components add column if not exists seo_description text;
alter table components add column if not exists archived_at timestamptz;

-- Carry the existing boolean across. Anything currently inactive was archived
-- by an admin, so that is what it becomes.
update components
   set status = case when active then 'published'::content_status else 'archived'::content_status end
 where status = 'published' and not active;

-- ---------------------------------------------------------------------------
-- Keeping `active` correct without keeping it authoritative
-- ---------------------------------------------------------------------------
-- `active` is not dropped. It is read by the admin dashboard, the inventory
-- table and the low_stock_components view from 0002, and dropping it in the
-- same change that introduces `status` would mean a window where the live site
-- is broken if anything was missed.
--
-- Instead a trigger derives it. `status` is the only thing worth writing;
-- `active` follows and cannot drift. A later migration can drop it once every
-- reader has moved over.
create or replace function sync_component_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists components_sync_active on components;
create trigger components_sync_active
  before insert or update on components
  for each row execute function sync_component_active();

create index if not exists components_status_idx on components (status, category);
create index if not exists components_featured_idx on components (featured) where featured;


-- ---------------------------------------------------------------------------
-- component_categories - how a category PRESENTS
-- ---------------------------------------------------------------------------
-- Keyed by the enum, so a row cannot exist for a category the engine does not
-- know about, and a category cannot be deleted out from under an order.
-- Everything here is display metadata; none of it is read by the
-- compatibility engine.
create table if not exists component_categories (
  category component_category primary key,
  label text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists component_categories_set_updated_at on component_categories;
create trigger component_categories_set_updated_at
  before update on component_categories
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
-- Replaces a hardcoded array in src/app/services/page.tsx. The seed inserts
-- the eight services that were already on the page, so the public site is
-- unchanged the moment this runs.
create table if not exists services (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text,
  /* The "what's included" bullets the services page already renders. */
  includes text[] not null default '{}',
  note text,
  /* Free text, not a number: most of this work is quoted after diagnosis, and
     a price column would invite a figure that cannot be honoured. */
  price_text text,
  image_url text,
  icon text,
  featured boolean not null default false,
  status content_status not null default 'draft',
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists services_set_updated_at on services;
create trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();

create index if not exists services_status_idx on services (status, sort_order);


-- ---------------------------------------------------------------------------
-- build_presets
-- ---------------------------------------------------------------------------
-- Replaces BUILD_PRESETS in src/lib/catalog/presets.ts. These are spec
-- templates, not a record of past work — a customer loads one into the
-- configurator and changes it. Completed machines belong in portfolio_builds.
--
-- `items` holds catalogue component ids, so a preset's price is computed live
-- from the catalogue and can never drift from what the parts cost. No price
-- column here, deliberately.
create table if not exists build_presets (
  id text primary key,
  slug text not null unique,
  name text not null,
  audience text not null default 'gaming'
    check (audience in ('gaming', 'workstation')),
  tagline text not null default '',
  rationale text not null default '',
  highlights text[] not null default '{}',
  /* [{ category, component_id, quantity }] — same shape as saved_builds.items */
  items jsonb not null default '[]'::jsonb,
  hero_image_url text,
  gallery_urls text[] not null default '{}',
  featured boolean not null default false,
  status content_status not null default 'draft',
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists build_presets_set_updated_at on build_presets;
create trigger build_presets_set_updated_at
  before update on build_presets
  for each row execute function set_updated_at();

create index if not exists build_presets_status_idx on build_presets (status, audience, sort_order);


-- ---------------------------------------------------------------------------
-- portfolio_builds - bring it up to the same shape as the rest
-- ---------------------------------------------------------------------------
alter table portfolio_builds add column if not exists status content_status not null default 'draft';
alter table portfolio_builds add column if not exists short_description text;
alter table portfolio_builds add column if not exists featured boolean not null default false;
alter table portfolio_builds add column if not exists sort_order integer not null default 0;
alter table portfolio_builds add column if not exists customer_type text;
alter table portfolio_builds add column if not exists completed_on date;
alter table portfolio_builds add column if not exists hero_image_url text;
alter table portfolio_builds add column if not exists seo_title text;
alter table portfolio_builds add column if not exists seo_description text;

-- No benchmark column is added. `verified_performance_notes` already exists
-- for exactly that, and its comment in 0001 says it is populated only when
-- performance was actually measured on the machine. A second, looser field
-- would be a way around that rule.

update portfolio_builds
   set status = case when published then 'published'::content_status else 'draft'::content_status end;

-- Same arrangement as components: `published` is derived from `status` so the
-- existing RLS policy and the public page keep working untouched.
create or replace function sync_portfolio_published()
returns trigger
language plpgsql
as $$
begin
  new.published := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists portfolio_sync_published on portfolio_builds;
create trigger portfolio_sync_published
  before insert or update on portfolio_builds
  for each row execute function sync_portfolio_published();

create index if not exists portfolio_status_idx on portfolio_builds (status, sort_order);


-- ---------------------------------------------------------------------------
-- promotions
-- ---------------------------------------------------------------------------
-- Scheduled promotional content. `placement` names where a promotion is
-- allowed to appear, so adding a new slot on the site does not mean every
-- existing promotion suddenly shows up in it.
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  image_url text,
  button_text text,
  button_url text,
  /* Both optional: an open-ended promotion is a normal thing to want. */
  starts_at timestamptz,
  ends_at timestamptz,
  placement text not null default 'home-hero',
  status content_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_dates_ordered check (ends_at is null or starts_at is null or ends_at > starts_at)
);

drop trigger if exists promotions_set_updated_at on promotions;
create trigger promotions_set_updated_at
  before update on promotions
  for each row execute function set_updated_at();

create index if not exists promotions_live_idx on promotions (placement, status, sort_order);

-- A promotion is live when it is published AND inside its window. Putting the
-- rule here means the storefront and the admin preview cannot disagree about
-- what "live" means.
create or replace view promotions_public as
  select id, title, subtitle, description, image_url, button_text, button_url,
         placement, sort_order, starts_at, ends_at
    from promotions
   where status = 'published'
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now());


-- ---------------------------------------------------------------------------
-- components_public - rebuilt for the new columns
-- ---------------------------------------------------------------------------
-- Still an explicit column list, and cost_cents is still absent. Adding a
-- column here is a deliberate act of publishing it.
drop view if exists components_public;

create view components_public as
  select
    id, sku, slug, category, brand, model, description, short_description,
    price_cents,
    stock_quantity, low_stock_threshold,
    image_url, gallery_urls, active, status, featured, sort_order,
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
grant select on promotions_public to anon, authenticated;


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Same shape as every existing policy: the public reads published rows, and
-- is_admin() is the only thing that can write. The admin UI checks the role
-- too, but this is what actually enforces it.
alter table component_categories enable row level security;
alter table services enable row level security;
alter table build_presets enable row level security;
alter table promotions enable row level security;

drop policy if exists "categories: public read active" on component_categories;
create policy "categories: public read active"
  on component_categories for select
  using (active or is_admin());

drop policy if exists "categories: admin write" on component_categories;
create policy "categories: admin write"
  on component_categories for all
  using (is_admin()) with check (is_admin());

drop policy if exists "services: public read published" on services;
create policy "services: public read published"
  on services for select
  using (status = 'published' or is_admin());

drop policy if exists "services: admin write" on services;
create policy "services: admin write"
  on services for all
  using (is_admin()) with check (is_admin());

drop policy if exists "presets: public read published" on build_presets;
create policy "presets: public read published"
  on build_presets for select
  using (status = 'published' or is_admin());

drop policy if exists "presets: admin write" on build_presets;
create policy "presets: admin write"
  on build_presets for all
  using (is_admin()) with check (is_admin());

-- Promotions are read through promotions_public, which already applies the
-- schedule. The table itself is admin-only so an unpublished or expired
-- promotion cannot be read early by querying the table directly.
drop policy if exists "promotions: admin only" on promotions;
create policy "promotions: admin only"
  on promotions for all
  using (is_admin()) with check (is_admin());


-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- One bucket for everything the CMS uploads.
--
-- Public READ, because these are product photos that the storefront has to
-- render without a signed-URL round trip on every image. That also means the
-- bucket holds product imagery and nothing else, ever — anything with a URL
-- is readable by anyone who has the URL.
--
-- Writes are admin-only, enforced here rather than only in the upload route,
-- so a leaked anon key still cannot put files in it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,   -- 10 MB; the browser resizes before upload, so this is a backstop
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: public read" on storage.objects;
create policy "media: public read"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media: admin insert" on storage.objects;
create policy "media: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and is_admin());

drop policy if exists "media: admin update" on storage.objects;
create policy "media: admin update"
  on storage.objects for update
  using (bucket_id = 'media' and is_admin())
  with check (bucket_id = 'media' and is_admin());

drop policy if exists "media: admin delete" on storage.objects;
create policy "media: admin delete"
  on storage.objects for delete
  using (bucket_id = 'media' and is_admin());
