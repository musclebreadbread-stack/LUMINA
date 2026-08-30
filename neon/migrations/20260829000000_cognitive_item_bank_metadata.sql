-- Metadata needed to audit pilot item provenance without exposing it to the client.
-- This migration adds no active items and does not approve a norm release.

begin;

alter table private_cognitive.item_versions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

commit;
