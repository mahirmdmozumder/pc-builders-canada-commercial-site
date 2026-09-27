-- ===========================================================================
-- Networking / NAS / mini-PC categories, and refurbished stock
-- ===========================================================================
-- Two additions, both storefront-facing:
--
--   1. Three whole-unit categories. A managed switch, a NAS enclosure and a
--      Raspberry Pi are sold complete, so they carry none of the tower-build
--      attributes (socket, form factor, radiator clearance) and the
--      compatibility engine is not asked to reason about them. They are
--      catalogue rows with their own storefront pages. Their details live in
--      `specs`, which no compatibility rule is permitted to read.
--
--   2. A `condition` column, so refurbished and open-box units can be listed
--      alongside new ones. This is a separate axis from category: a
--      refurbished graphics card is still a graphics card. Modelling it as a
--      category would have meant a part could not be both.
--
-- `condition` defaults to 'new', so every existing row keeps its current
-- meaning and no backfill is needed.
--
-- ---------------------------------------------------------------------------
-- Running this
-- ---------------------------------------------------------------------------
-- `alter type ... add value` cannot run in the same transaction that later
-- USES the new value, and older Postgres refuses it inside a transaction
-- altogether. The Supabase SQL editor wraps a multi-statement run in one
-- transaction, so:
--
--   Run PART 1 on its own and let it finish.
--   Then run PART 2.
--
-- Nothing in PART 1 depends on PART 2, and re-running either is harmless.
-- ===========================================================================


-- ===========================================================================
-- PART 1 - new enum values (run alone)
-- ===========================================================================

alter type component_category add value if not exists 'networking';
alter type component_category add value if not exists 'nas';
alter type component_category add value if not exists 'mini-pc';


-- ===========================================================================
-- PART 2 - condition column, and the public view rebuilt to expose it
-- ===========================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'component_condition') then
    create type component_condition as enum ('new', 'refurbished', 'open-box');
  end if;
end
$$;

alter table components
  add column if not exists condition component_condition not null default 'new';

alter table components
  add column if not exists condition_notes text;

-- Anything not sold as new must say what was done to it. Enforced in the
-- database rather than only in the admin form, because an honest label is not
-- something a future API route should be able to skip.
alter table components
  drop constraint if exists components_condition_notes_required;

alter table components
  add constraint components_condition_notes_required
  check (
    condition = 'new'
    or (condition_notes is not null and char_length(btrim(condition_notes)) >= 10)
  );

-- Refurbished listings are browsed as a group, so the filter gets an index.
create index if not exists components_condition_idx
  on components (condition)
  where condition <> 'new';

-- Storefront pages filter by category constantly.
create index if not exists components_category_active_idx
  on components (category, active);

-- ---------------------------------------------------------------------------
-- components_public
-- ---------------------------------------------------------------------------
-- Recreated with the two new columns. cost_cents stays absent: this view is
-- the reason margin is not merely stripped in application code but never
-- selected in the first place. Adding a column here is a deliberate act of
-- publishing it, so the list stays explicit rather than becoming `select *`.
drop view if exists components_public;

create view components_public as
  select
    id, sku, slug, category, brand, model, description,
    price_cents,
    stock_quantity, low_stock_threshold,
    image_url, active, data_confidence,
    condition, condition_notes,
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
  where active;

grant select on components_public to anon, authenticated;
