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

-- Guard the shape. A malformed entry would reach the page as structured data,
-- and invalid markup is worse than none.
alter table services drop constraint if exists services_faqs_shape;

alter table services
  add constraint services_faqs_shape
  check (
    jsonb_typeof(faqs) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(faqs) as entry
      where jsonb_typeof(entry) <> 'object'
         or entry->>'question' is null
         or entry->>'answer' is null
         or char_length(entry->>'question') < 5
         or char_length(entry->>'answer') < 20
    )
  );
