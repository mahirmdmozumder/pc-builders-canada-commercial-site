-- ===========================================================================
-- PC Builders Canada - catalogue additions
-- ===========================================================================
-- GENERATED FILE - do not edit by hand.
-- Source: src/lib/catalog/sample-catalog.ts
-- Regenerate with: SEED_ONLY_IDS=<ids> npm run db:seed:generate
--
-- ADDITIVE ONLY. This ends in `on conflict (id) do nothing`, so running it
-- against a database that already holds one of these ids changes NOTHING about
-- that row: its price, stock, status and uploaded product photo are left as
-- they are.
--
-- Use this rather than seed.sql to add parts to a catalogue that is already in
-- service. seed.sql overwrites image_url with null for every row it knows
-- about, which erases uploaded photography.
--
-- Rows: 5
-- ===========================================================================

insert into components (
  id,
  sku,
  slug,
  category,
  brand,
  model,
  description,
  price_cents,
  cost_cents,
  stock_quantity,
  low_stock_threshold,
  image_url,
  status,
  data_confidence,
  condition,
  condition_notes,
  socket,
  supported_sockets,
  chipset,
  memory_slots,
  max_memory_gb,
  m2_slots,
  sata_ports,
  form_factor,
  supported_form_factors,
  memory_type,
  memory_capacity_gb,
  memory_modules,
  memory_speed_mts,
  tdp_watts,
  recommended_psu_watts,
  psu_wattage,
  psu_efficiency,
  psu_form_factor,
  gpu_length_mm,
  max_gpu_length_mm,
  cooler_height_mm,
  max_cooler_height_mm,
  radiator_support_mm,
  radiator_size_mm,
  cooler_type,
  cooling_capacity_watts,
  storage_interface,
  storage_capacity_gb,
  pcie_version,
  specs
) values
  ('gpu-asus-prime-rtx-5070-oc', 'GPU-ASU-5070POC', 'gpu-asus-prime-rtx-5070-oc', 'gpu', 'ASUS', 'Prime GeForce RTX 5070 OC Edition 12GB', '1440p card with 12 GB of GDDR7. A 304 mm board, so check it against the case clearance before ordering.', 129999, null, 5, 3, null, 'published', 'sample', 'new', null, null, null, null, null, null, null, null, null, null, null, null, null, null, 250, null, null, null, null, 304, null, null, null, null, null, null, null, null, null, 5, '{"vram_gb":12,"memory":"GDDR7 192-bit, 28 Gbps","power_connectors":"1x 16-pin","source":"Canada Computers","unverified":"Board power is the NVIDIA reference figure for the RTX 5070, not an ASUS figure for this card. No recommended PSU wattage was stated by the retailer, so none is recorded.","price_checked":"2026-10-05"}'::jsonb),
  ('gpu-sapphire-pulse-rx-9060-xt-16gb', 'GPU-SAP-9060XT16', 'gpu-sapphire-pulse-rx-9060-xt-16gb', 'gpu', 'SAPPHIRE', 'PULSE Radeon RX 9060 XT Gaming OC 16GB', '1080p and 1440p card with 16 GB of memory, which ages better than raw speed in newer titles. 285 mm, so it fits more cases than the larger cards above it.', 84999, null, 5, 3, null, 'published', 'sample', 'new', null, null, null, null, null, null, null, null, null, null, null, null, null, null, 160, 650, null, null, null, 285, null, null, null, null, null, null, null, null, null, 5, '{"vram_gb":16,"memory":"GDDR6 128-bit","power_connectors":"1x 8-pin","source":"Canada Computers","unverified":"Board power is the AMD reference figure for the RX 9060 XT. The recommended 650 W is the retailer-stated figure for this card.","price_checked":"2026-10-05"}'::jsonb),
  ('gpu-gigabyte-rx-9070-xt-gaming-oc', 'GPU-GIG-9070XTG', 'gpu-gigabyte-rx-9070-xt-gaming-oc', 'gpu', 'Gigabyte', 'Radeon RX 9070 XT GAMING OC 16GB', '1440p and 4K card with 16 GB of memory. At 288 mm it is the shortest of the 9070 XT boards listed here, which matters in a compact case.', 149900, null, 5, 3, null, 'published', 'sample', 'new', null, null, null, null, null, null, null, null, null, null, null, null, null, null, 304, 850, null, null, null, 288, null, null, null, null, null, null, null, null, null, 5, '{"vram_gb":16,"memory":"GDDR6 256-bit","power_connectors":"2x 8-pin","source":"Canada Computers","sale_price_observed":"$1,049.00 on 2026-10-05","unverified":"Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not Gigabyte figures for this card.","price_checked":"2026-10-05"}'::jsonb),
  ('gpu-asus-prime-rx-9070-xt-oc', 'GPU-ASU-9070XTP', 'gpu-asus-prime-rx-9070-xt-oc', 'gpu', 'ASUS', 'Prime Radeon RX 9070 XT OC Edition 16GB', '1440p and 4K card with 16 GB of memory and a triple-fan cooler. 312 mm long.', 153999, null, 5, 3, null, 'published', 'sample', 'new', null, null, null, null, null, null, null, null, null, null, null, null, null, null, 304, 850, null, null, null, 312, null, null, null, null, null, null, null, null, null, 5, '{"vram_gb":16,"memory":"GDDR6 256-bit","power_connectors":"2x 8-pin","source":"Canada Computers","unverified":"Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not ASUS figures for this card.","price_checked":"2026-10-05"}'::jsonb),
  ('gpu-sapphire-pure-rx-9070-xt', 'GPU-SAP-9070XTPU', 'gpu-sapphire-pure-rx-9070-xt', 'gpu', 'SAPPHIRE', 'PURE Radeon RX 9070 XT 16GB', 'The white-shroud 9070 XT, for a build where the parts are meant to match. Same 16 GB and the same 320 mm length as the PULSE.', 144900, null, 5, 3, null, 'published', 'sample', 'new', null, null, null, null, null, null, null, null, null, null, null, null, null, null, 304, 850, null, null, null, 320, null, null, null, null, null, null, null, null, null, 5, '{"vram_gb":16,"memory":"GDDR6 256-bit","power_connectors":"2x 8-pin","colour":"White","source":"Canada Computers","unverified":"Board power and the recommended 850 W are the AMD reference figures for the RX 9070 XT, not SAPPHIRE figures for this card.","price_checked":"2026-10-05"}'::jsonb)
on conflict (id) do nothing;
