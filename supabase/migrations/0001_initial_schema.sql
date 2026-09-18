-- ===========================================================================
-- PC Builders Canada — initial schema
-- ===========================================================================
-- Run against a Supabase project:
--   supabase db push          (CLI, recommended)
--   or paste into the SQL editor in the Supabase dashboard.
--
-- Conventions used throughout:
--   * Money is integer cents. Never float, never numeric-with-rounding-bugs.
--   * Compatibility-relevant hardware attributes are typed columns, not JSON,
--     because the compatibility engine compares them directly.
--   * Every table that holds customer data has Row Level Security enabled and
--     an explicit policy. RLS is the real access control; the application
--     layer is a convenience on top of it.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('customer', 'admin');

create type component_category as enum (
  'cpu', 'motherboard', 'cooler', 'ram', 'gpu',
  'storage', 'psu', 'case', 'os', 'accessory'
);

create type data_confidence as enum ('sample', 'verified');
create type form_factor as enum ('e-atx', 'atx', 'micro-atx', 'mini-itx');
create type memory_type as enum ('ddr4', 'ddr5');
create type cooler_type as enum ('air', 'aio');
create type storage_interface as enum ('nvme-m2', 'sata');
create type psu_form_factor as enum ('atx', 'sfx', 'sfx-l');

create type quote_status as enum (
  'new', 'reviewing', 'quoted', 'approved', 'declined', 'converted'
);

create type order_status as enum (
  'pending', 'confirmed', 'processing', 'building',
  'testing', 'ready', 'shipped', 'completed', 'cancelled'
);

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

create type ticket_status as enum (
  'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
);
create type ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type ticket_category as enum (
  'order', 'hardware', 'warranty', 'technical_support', 'billing', 'other'
);

create type order_item_kind as enum ('build', 'component', 'service');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per auth user. `role` lives here rather than in auth metadata
-- because auth metadata is writable by the client in some flows, and a role a
-- client can edit is not a role.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Role check used by every admin policy below.
-- SECURITY DEFINER so it can read profiles without triggering the very RLS
-- policies that call it — otherwise the admin policy on `profiles` recurses.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function is_admin() from anon;

-- Create the profile row whenever a user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- components
-- ---------------------------------------------------------------------------
-- Readable slug ids (e.g. 'cpu-amd-ryzen-7-9800x3d'). Build configurations are
-- stored as JSON snapshots that reference these ids; a readable id makes those
-- snapshots, support tickets and manual database work far easier to follow.
create table components (
  id text primary key,
  sku text not null unique,
  slug text not null unique,
  category component_category not null,
  brand text not null,
  model text not null,
  description text not null default '',

  price_cents integer not null check (price_cents >= 0),
  cost_cents integer check (cost_cents >= 0),

  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),

  image_url text,
  active boolean not null default true,
  data_confidence data_confidence not null default 'sample',

  -- socket matching
  socket text,
  supported_sockets text[],

  -- motherboard
  chipset text,
  memory_slots smallint check (memory_slots > 0),
  max_memory_gb integer check (max_memory_gb > 0),
  m2_slots smallint check (m2_slots >= 0),
  sata_ports smallint check (sata_ports >= 0),

  -- form factor
  form_factor form_factor,
  supported_form_factors form_factor[],

  -- memory
  memory_type memory_type,
  memory_capacity_gb integer check (memory_capacity_gb > 0),
  memory_modules smallint check (memory_modules > 0),
  memory_speed_mts integer check (memory_speed_mts > 0),

  -- power
  tdp_watts integer check (tdp_watts >= 0),
  recommended_psu_watts integer check (recommended_psu_watts >= 0),
  psu_wattage integer check (psu_wattage > 0),
  psu_efficiency text,
  psu_form_factor psu_form_factor,

  -- physical clearance
  gpu_length_mm integer check (gpu_length_mm > 0),
  max_gpu_length_mm integer check (max_gpu_length_mm > 0),
  cooler_height_mm integer check (cooler_height_mm > 0),
  max_cooler_height_mm integer check (max_cooler_height_mm > 0),
  radiator_support_mm integer[],
  radiator_size_mm integer[],
  cooler_type cooler_type,
  -- heat a cooler can dissipate; distinct from tdp_watts (its own draw)
  cooling_capacity_watts integer check (cooling_capacity_watts > 0),

  -- storage
  storage_interface storage_interface,
  storage_capacity_gb integer check (storage_capacity_gb > 0),

  pcie_version smallint check (pcie_version between 1 and 6),

  -- display-only extras; no compatibility rule reads from here
  specs jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index components_category_active_idx on components (category, active);
create index components_stock_idx on components (stock_quantity) where active;
create index components_search_idx on components using gin (
  to_tsvector('english', brand || ' ' || model || ' ' || description)
);

create trigger components_set_updated_at
  before update on components
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- saved_builds
-- ---------------------------------------------------------------------------
create table saved_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text,
  -- [{ category, component_id, quantity }]
  items jsonb not null default '[]'::jsonb,
  estimated_total_cents integer not null default 0,
  is_compatible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_builds_user_idx on saved_builds (user_id, updated_at desc);

create trigger saved_builds_set_updated_at
  before update on saved_builds
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone')),
  province text,
  build_name text,
  items jsonb not null default '[]'::jsonb,
  estimated_total_cents integer not null default 0,
  customer_notes text,
  -- staff-only; excluded from every customer-facing select in the app layer
  internal_notes text,
  quoted_total_cents integer,
  status quote_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_status_idx on quotes (status, created_at desc);
create index quotes_user_idx on quotes (user_id, created_at desc);
create index quotes_email_idx on quotes (lower(customer_email));

create trigger quotes_set_updated_at
  before update on quotes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  customer_name text,
  shipping_address jsonb,
  province text not null default 'ON',

  subtotal_cents integer not null default 0,
  assembly_fee_cents integer not null default 0,
  shipping_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  tax_breakdown jsonb not null default '[]'::jsonb,

  status order_status not null default 'pending',
  payment_status payment_status not null default 'pending',

  -- No card data is ever stored. Only Stripe's own opaque identifiers.
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,

  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on orders (user_id, created_at desc);
create index orders_status_idx on orders (status, created_at desc);
create index orders_payment_status_idx on orders (payment_status);
create index orders_email_idx on orders (lower(customer_email));

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  kind order_item_kind not null default 'component',
  name text not null,
  -- Immutable snapshot of the configuration as purchased. Deliberately NOT a
  -- foreign key list: if a component is later deactivated or repriced, the
  -- historical order must not change.
  configuration jsonb,
  component_id text references components(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- support tickets
-- ---------------------------------------------------------------------------
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  customer_name text,
  subject text not null,
  category ticket_category not null default 'other',
  description text not null,
  priority ticket_priority not null default 'normal',
  status ticket_status not null default 'open',
  order_id uuid references orders(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_idx on support_tickets (status, created_at desc);
create index support_tickets_user_idx on support_tickets (user_id, created_at desc);

create trigger support_tickets_set_updated_at
  before update on support_tickets
  for each row execute function set_updated_at();

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_role user_role not null default 'customer',
  body text not null,
  -- Internal notes are filtered by RLS below, not just by the application.
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- activity log (admin audit trail)
-- ---------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_created_idx on activity_log (created_at desc);
create index activity_log_entity_idx on activity_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- portfolio
-- ---------------------------------------------------------------------------
create table portfolio_builds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  purpose text not null,
  summary text not null,
  body text,
  items jsonb not null default '[]'::jsonb,
  component_notes text[],
  image_urls text[] not null default '{}',
  -- Populated only when performance was actually measured on the machine.
  verified_performance_notes text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger portfolio_builds_set_updated_at
  before update on portfolio_builds
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contact messages
-- ---------------------------------------------------------------------------
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_idx on contact_messages (created_at desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table profiles          enable row level security;
alter table components        enable row level security;
alter table saved_builds      enable row level security;
alter table quotes            enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table support_tickets   enable row level security;
alter table ticket_messages   enable row level security;
alter table activity_log      enable row level security;
alter table portfolio_builds  enable row level security;
alter table contact_messages  enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: read own"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Note: role escalation is prevented by not granting customers UPDATE on the
-- role column path — a customer updating their own row cannot change `role`
-- because this trigger rejects it.
create or replace function prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an administrator may change a user role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on profiles
  for each row execute function prevent_role_escalation();

create policy "profiles: admin manage"
  on profiles for all
  using (is_admin())
  with check (is_admin());

-- components ----------------------------------------------------------------
create policy "components: public read active"
  on components for select
  using (active or is_admin());

create policy "components: admin write"
  on components for all
  using (is_admin())
  with check (is_admin());

-- saved_builds --------------------------------------------------------------
create policy "saved_builds: owner read"
  on saved_builds for select
  using (user_id = auth.uid() or is_admin());

create policy "saved_builds: owner insert"
  on saved_builds for insert
  with check (user_id = auth.uid());

create policy "saved_builds: owner update"
  on saved_builds for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "saved_builds: owner delete"
  on saved_builds for delete
  using (user_id = auth.uid());

-- quotes --------------------------------------------------------------------
-- Guests may request a quote without an account, so insert is open. Reads are
-- restricted to the owner (or staff): a guest cannot list other people's quotes.
create policy "quotes: submit"
  on quotes for insert
  with check (user_id is null or user_id = auth.uid());

create policy "quotes: owner read"
  on quotes for select
  using (user_id = auth.uid() or is_admin());

create policy "quotes: admin manage"
  on quotes for update
  using (is_admin())
  with check (is_admin());

-- orders --------------------------------------------------------------------
-- Orders are only ever created server-side (checkout route / Stripe webhook)
-- using the service-role key, which bypasses RLS. No insert policy is granted
-- to customers, so an order total can never be set by a client.
create policy "orders: owner read"
  on orders for select
  using (user_id = auth.uid() or is_admin());

create policy "orders: admin manage"
  on orders for update
  using (is_admin())
  with check (is_admin());

create policy "order_items: owner read"
  on order_items for select
  using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- support tickets -----------------------------------------------------------
create policy "tickets: owner read"
  on support_tickets for select
  using (user_id = auth.uid() or is_admin());

create policy "tickets: owner insert"
  on support_tickets for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "tickets: admin manage"
  on support_tickets for update
  using (is_admin())
  with check (is_admin());

-- A customer sees their thread minus internal notes. The filter is enforced
-- here, in the database, not only in the query the application happens to write.
create policy "ticket messages: owner read non-internal"
  on ticket_messages for select
  using (
    is_admin()
    or (
      is_internal = false
      and exists (
        select 1 from support_tickets t
        where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
      )
    )
  );

create policy "ticket messages: owner reply"
  on ticket_messages for insert
  with check (
    is_admin()
    or (
      is_internal = false
      and author_role = 'customer'
      and exists (
        select 1 from support_tickets t
        where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
      )
    )
  );

-- activity log --------------------------------------------------------------
create policy "activity log: admin read"
  on activity_log for select
  using (is_admin());

create policy "activity log: admin insert"
  on activity_log for insert
  with check (is_admin());

-- portfolio -----------------------------------------------------------------
create policy "portfolio: public read published"
  on portfolio_builds for select
  using (published or is_admin());

create policy "portfolio: admin write"
  on portfolio_builds for all
  using (is_admin())
  with check (is_admin());

-- contact -------------------------------------------------------------------
create policy "contact: anyone may submit"
  on contact_messages for insert
  with check (true);

create policy "contact: admin read"
  on contact_messages for select
  using (is_admin());

create policy "contact: admin update"
  on contact_messages for update
  using (is_admin())
  with check (is_admin());

-- ===========================================================================
-- Promoting the first administrator
-- ===========================================================================
-- There is no self-service path to `admin` by design. After signing up
-- through the site, run this once in the Supabase SQL editor:
--
--   update profiles set role = 'admin' where email = 'you@example.com';
--
-- ===========================================================================
