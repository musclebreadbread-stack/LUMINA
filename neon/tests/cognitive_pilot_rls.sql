-- Execute on a disposable Neon branch after the cognitive migration.
-- The connection must use lumina_cognitive_app (NOBYPASSRLS), never
-- neondb_owner, so these checks exercise the real row-level security boundary.

begin;
set local role lumina_cognitive_app;

select set_config('app.current_subject_id', '11111111-1111-4111-8111-111111111111', true);

insert into public.cognitive_subjects (id, kind)
values ('11111111-1111-4111-8111-111111111111', 'guest');

select set_config('app.current_subject_id', '22222222-2222-4222-8222-222222222222', true);

insert into public.cognitive_subjects (id, kind)
values ('22222222-2222-4222-8222-222222222222', 'guest');

select set_config('app.current_subject_id', '11111111-1111-4111-8111-111111111111', true);

insert into public.research_consents
  (owner_id, consent_version, operational_storage, research_participation)
values
  ('11111111-1111-4111-8111-111111111111', 'cognitive-pilot-consent-v1', true, true);

insert into public.assessment_runs
  (id, owner_id, assessment_key, status, item_bank_version, algorithm_version,
   blueprint_version, target_item_count)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'cognitive_v1', 'active', 'cognitive-pilot-v1', 'cat-v1', 'blueprint-v1', 20);

do $$
declare
  visible_runs integer;
begin
  select count(*) into visible_runs from public.assessment_runs;
  if visible_runs <> 1 then
    raise exception 'owner should see exactly one run, got %', visible_runs;
  end if;
end
$$;

select set_config('app.current_subject_id', '22222222-2222-4222-8222-222222222222', true);

do $$
declare
  visible_runs integer;
begin
  select count(*) into visible_runs from public.assessment_runs;
  if visible_runs <> 0 then
    raise exception 'cross-owner read should be empty, got %', visible_runs;
  end if;
end
$$;

select set_config('app.current_subject_id', '11111111-1111-4111-8111-111111111111', true);
select 1 from private_cognitive.item_versions limit 1;

rollback;
