-- ===========================================================================
-- FAQs on services
-- ===========================================================================
-- Run this whole file in one go. It adds a column and touches nothing else.
--
-- ---------------------------------------------------------------------------
-- Why a column rather than hardcoded copy
-- ---------------------------------------------------------------------------
-- Each service page carries a short set of questions with real answers, and
-- those answers are also emitted as FAQPage structured data.
--
-- Google requires marked-up questions and answers to be VISIBLE on the page.
-- Keeping them in the database, rendered by the same component that feeds the
-- schema, is what guarantees the two cannot drift apart — which is the usual
-- way FAQ markup ends up being ignored or penalised.
--
-- It is jsonb rather than a separate table because a FAQ has no identity of
-- its own: it belongs to exactly one service, is never queried across
-- services, and is always read and written as a whole list.
--
-- Shape: [{ "question": "...", "answer": "..." }]
-- ===========================================================================

alter table services add column if not exists faqs jsonb not null default '[]'::jsonb;


-- ---------------------------------------------------------------------------
-- Shape validation
-- ---------------------------------------------------------------------------
-- A malformed entry would reach the page as structured data, and invalid
-- markup is worse than none. So the shape is checked at the database, not only
-- in the API schema — the seed and any hand-run SQL bypass the application
-- entirely.
--
-- The check lives in a FUNCTION rather than inline. Postgres rejects a
-- subquery inside a CHECK constraint outright:
--
--     ERROR: 0A000: cannot use subquery in check constraint
--
-- and walking a jsonb array requires one. Wrapping it in an IMMUTABLE function
-- that reads nothing but its own argument is the supported way round that, and
-- keeps the constraint honest: it depends on this row's value and nothing else.
-- ---------------------------------------------------------------------------

create or replace function services_faqs_valid(faqs jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(faqs) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(faqs) as entry
      where jsonb_typeof(entry) <> 'object'
         or entry->>'question' is null
         or entry->>'answer' is null
         or char_length(entry->>'question') < 5
         -- A one-line answer is not an answer, and it would be published to
         -- Google as though it were.
         or char_length(entry->>'answer') < 20
    );
$$;

alter table services drop constraint if exists services_faqs_shape;

alter table services
  add constraint services_faqs_shape
  check (services_faqs_valid(faqs));
