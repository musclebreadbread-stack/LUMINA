begin;

select plan(10);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.assessment_runs (
  id, owner_id, assessment_key, status, item_bank_version, algorithm_version,
  blueprint_version, target_item_count
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'cognitive_v1', 'active', 'pilot-v1', 'cat-v1', 'blueprint-v1', 20
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select results_eq(
  $$ select id from public.assessment_runs order by id $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'owner reads own run'
);
select isnt_empty(
  $$ select * from public.assessment_runs where owner_id = auth.uid() $$,
  'owner predicate matches auth.uid()'
);

select throws_ok(
  $$ insert into public.assessment_runs (owner_id, assessment_key, status, item_bank_version, algorithm_version, blueprint_version, target_item_count)
     values ('22222222-2222-2222-2222-222222222222', 'cognitive_v1', 'active', 'pilot-v1', 'cat-v1', 'blueprint-v1', 20) $$,
  'new row violates row-level security policy for table "assessment_runs"',
  'authenticated user cannot insert another owner run'
);

select is_empty(
  $$ select * from private_cognitive.item_versions $$,
  'authenticated role cannot read private item versions'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is_empty(
  $$ select id from public.assessment_runs $$,
  'other user reads no owner run'
);

select throws_ok(
  $$ insert into public.research_consents (owner_id, consent_version, operational_storage, research_participation)
     values ('11111111-1111-1111-1111-111111111111', 'v1', true, true) $$,
  'new row violates row-level security policy for table "research_consents"',
  'other user cannot insert another owner consent'
);

set local role anon;
select is_empty($$ select id from public.assessment_runs $$, 'anon cannot read runs');
select is_empty($$ select id from public.assessment_results $$, 'anon cannot read results');
select is_empty($$ select id from public.research_consents $$, 'anon cannot read consents');

select * from finish();
rollback;
