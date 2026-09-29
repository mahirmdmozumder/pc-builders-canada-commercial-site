-- ===========================================================================
-- New component categories
-- ===========================================================================
-- Split into its own file for one reason: Postgres will not let a new enum
-- value be USED in the transaction that added it, and 0006 seeds the
-- component_categories table with a row per category — including these three.
--
--   Run this file, let it finish, THEN run 0006.
--
-- Re-running is harmless.
--
-- ---------------------------------------------------------------------------
-- Why these are enum values rather than rows in a table
-- ---------------------------------------------------------------------------
-- `component_category` is load-bearing. The compatibility engine,
-- CONFIGURATOR_CATEGORIES, REQUIRED_CATEGORIES and specChips() all switch on
-- it, and TypeScript checks those switches for exhaustiveness against this
-- exact list. A category the engine has no rules for is a category it cannot
-- reason about, so adding one is deliberately a migration and not a form
-- submission: the rules have to be written at the same time.
--
-- What IS editable from the admin is how a category PRESENTS — its label,
-- description, image, ordering and whether it appears at all. That lives in
-- the component_categories table created by 0006.
-- ===========================================================================

alter type component_category add value if not exists 'case-fan';
alter type component_category add value if not exists 'monitor';
alter type component_category add value if not exists 'other';
