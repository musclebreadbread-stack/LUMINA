begin;

select plan(11);

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
  'cognitive_v1', 'active', 'cognitive-pilot-v1', 'cat-v1', 'blueprint-v1', 20
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
     values ('22222222-2222-2222-222222222222', 'cognitive_v1', 'active', 'cognitive-pilot-v1', 'cat-v1', 'blueprint-v1', 20) $$,
  'new row violates row-level security policy for table "assessment_runs"',
  'authenticated user cannot insert another owner run'
);

select throws_ok(
  $$ select * from private_cognitive.item_versions $$,
  'permission denied for table item_versions',
  'authenticated role cannot read private item versions'
);
select ok(
  not has_table_privilege('authenticated', 'private_cognitive.item_versions', 'select'),
  'authenticated role has no private table grant'
);
select ok(
  has_schema_privilege('authenticated', 'private_cognitive', 'usage'),
  'authenticated role can resolve the submission RPC without table access'
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
select throws_ok($$ select id from public.assessment_runs $$, 'permission denied for table assessment_runs', 'anon cannot read runs');
select throws_ok($$ select id from public.assessment_results $$, 'permission denied for table assessment_results', 'anon cannot read results');
select throws_ok($$ select id from public.research_consents $$, 'permission denied for table research_consents', 'anon cannot read consents');

select * from finish();
rollback;
