-- LUMINA cognitive pilot schema for Neon Postgres.
-- Apply this file only after a human has reviewed the target branch and the
-- dedicated database role. The application uses DATABASE_URL (pooled) for
-- requests; migration execution must use DATABASE_URL_UNPOOLED.

begin;

create schema if not exists app;
create schema if not exists private_cognitive;

create or replace function app.current_subject_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_subject_id', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lumina_cognitive_app') then
    create role lumina_cognitive_app
      login
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      noreplication
      nobypassrls;
  end if;
end
$$;

create table if not exists public.cognitive_subjects (
  id uuid primary key,
  kind text not null check (kind in ('guest', 'auth')),
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.cognitive_subjects(id) on delete cascade,
  assessment_key text not null check (assessment_key = 'cognitive_v1'),
  status text not null check (status in ('active', 'paused', 'completed', 'invalid')),
  item_bank_version text not null,
  algorithm_version text not null,
  blueprint_version text not null,
  target_item_count integer not null check (target_item_count > 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_runs_owner_updated_idx
  on public.assessment_runs (owner_id, updated_at desc);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.assessment_runs(id) on delete cascade,
  owner_id uuid not null references public.cognitive_subjects(id) on delete cascade,
  status text not null check (status in ('pilot_withheld', 'standardized_scored', 'ineligible')),
  norm_version text,
  score_payload jsonb,
  created_at timestamptz not null default now(),
  check (
    (status = 'standardized_scored' and norm_version is not null and score_payload is not null)
    or (status <> 'standardized_scored' and norm_version is null and score_payload is null)
  )
);

create index if not exists assessment_results_owner_created_idx
  on public.assessment_results (owner_id, created_at desc);

create table if not exists public.research_consents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.cognitive_subjects(id) on delete cascade,
  consent_version text not null,
  operational_storage boolean not null check (operational_storage is true),
  research_participation boolean not null,
  created_at timestamptz not null default now()
);

create unique index if not exists research_consents_owner_version_idx
  on public.research_consents (owner_id, consent_version);

create table if not exists private_cognitive.item_versions (
  version_id text primary key,
  item_bank_version text not null,
  calibration_version text not null,
  domain text not null check (domain in ('gf', 'gc', 'gv', 'gwm', 'gs')),
  status text not null check (status in ('draft', 'pilot', 'active', 'retired')),
  presentation jsonb not null,
  parameters jsonb,
  exposure_rate double precision not null check (exposure_rate >= 0 and exposure_rate <= 1),
  created_at timestamptz not null default now()
);

create table if not exists private_cognitive.answer_keys (
  version_id text primary key references private_cognitive.item_versions(version_id) on delete cascade,
  correct_option_id text not null
);

create table if not exists private_cognitive.run_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  item_version_id text not null references private_cognitive.item_versions(version_id),
  ordinal integer not null check (ordinal > 0),
  state text not null check (state in ('current', 'answered', 'expired')),
  presented_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (run_id, ordinal)
);

create unique index if not exists run_assignments_current_idx
  on private_cognitive.run_assignments (run_id)
  where state = 'current';

create table if not exists private_cognitive.raw_responses (
  response_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  assignment_id uuid not null unique references private_cognitive.run_assignments(assignment_id) on delete cascade,
  option_id text not null,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  submitted_at timestamptz not null default now()
);

create table if not exists private_cognitive.scoring_state (
  run_id uuid primary key references public.assessment_runs(id) on delete cascade,
  server_seed text not null,
  theta double precision not null default 0,
  information double precision not null default 0,
  standard_error double precision,
  answered_count integer not null default 0,
  age_years integer check (age_years is null or age_years between 18 and 64),
  updated_at timestamptz not null default now()
);

create table if not exists private_cognitive.audit_events (
  event_id uuid primary key default gen_random_uuid(),
  run_id uuid references public.assessment_runs(id) on delete set null,
  actor_id uuid references public.cognitive_subjects(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists private_cognitive.norm_releases (
  id text primary key,
  status text not null check (status in ('candidate', 'approved', 'retired')),
  target_population text not null check (target_population = 'ko-adults-18-64'),
  item_bank_version text not null,
  algorithm_version text not null,
  norm_payload jsonb not null,
  validation_manifest_hash text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

alter table public.cognitive_subjects enable row level security;
alter table public.cognitive_subjects force row level security;
alter table public.assessment_runs enable row level security;
alter table public.assessment_runs force row level security;
alter table public.assessment_results enable row level security;
alter table public.assessment_results force row level security;
alter table public.research_consents enable row level security;
alter table public.research_consents force row level security;
alter table private_cognitive.item_versions enable row level security;
alter table private_cognitive.item_versions force row level security;
alter table private_cognitive.answer_keys enable row level security;
alter table private_cognitive.answer_keys force row level security;
alter table private_cognitive.run_assignments enable row level security;
alter table private_cognitive.run_assignments force row level security;
alter table private_cognitive.raw_responses enable row level security;
alter table private_cognitive.raw_responses force row level security;
alter table private_cognitive.scoring_state enable row level security;
alter table private_cognitive.scoring_state force row level security;
alter table private_cognitive.audit_events enable row level security;
alter table private_cognitive.audit_events force row level security;
alter table private_cognitive.norm_releases enable row level security;
alter table private_cognitive.norm_releases force row level security;

drop policy if exists cognitive_subject_owner on public.cognitive_subjects;
create policy cognitive_subject_owner on public.cognitive_subjects
  for all to lumina_cognitive_app
  using (id = app.current_subject_id())
  with check (id = app.current_subject_id());

drop policy if exists cognitive_run_owner on public.assessment_runs;
create policy cognitive_run_owner on public.assessment_runs
  for all to lumina_cognitive_app
  using (owner_id = app.current_subject_id())
  with check (owner_id = app.current_subject_id());

drop policy if exists cognitive_result_owner on public.assessment_results;
create policy cognitive_result_owner on public.assessment_results
  for all to lumina_cognitive_app
  using (owner_id = app.current_subject_id())
  with check (owner_id = app.current_subject_id());

drop policy if exists cognitive_consent_owner on public.research_consents;
create policy cognitive_consent_owner on public.research_consents
  for all to lumina_cognitive_app
  using (owner_id = app.current_subject_id())
  with check (owner_id = app.current_subject_id());

drop policy if exists cognitive_item_bank_read on private_cognitive.item_versions;
create policy cognitive_item_bank_read on private_cognitive.item_versions
  for select to lumina_cognitive_app
  using (app.current_subject_id() is not null);

drop policy if exists cognitive_answer_key_read on private_cognitive.answer_keys;
create policy cognitive_answer_key_read on private_cognitive.answer_keys
  for select to lumina_cognitive_app
  using (app.current_subject_id() is not null);

drop policy if exists cognitive_assignment_owner on private_cognitive.run_assignments;
create policy cognitive_assignment_owner on private_cognitive.run_assignments
  for all to lumina_cognitive_app
  using (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = run_assignments.run_id
       and ar.owner_id = app.current_subject_id()
  ))
  with check (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = run_assignments.run_id
       and ar.owner_id = app.current_subject_id()
  ));

drop policy if exists cognitive_response_owner on private_cognitive.raw_responses;
create policy cognitive_response_owner on private_cognitive.raw_responses
  for all to lumina_cognitive_app
  using (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = raw_responses.run_id
       and ar.owner_id = app.current_subject_id()
  ))
  with check (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = raw_responses.run_id
       and ar.owner_id = app.current_subject_id()
  ));

drop policy if exists cognitive_scoring_owner on private_cognitive.scoring_state;
create policy cognitive_scoring_owner on private_cognitive.scoring_state
  for all to lumina_cognitive_app
  using (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = scoring_state.run_id
       and ar.owner_id = app.current_subject_id()
  ))
  with check (exists (
    select 1 from public.assessment_runs as ar
     where ar.id = scoring_state.run_id
       and ar.owner_id = app.current_subject_id()
  ));

drop policy if exists cognitive_audit_owner on private_cognitive.audit_events;
create policy cognitive_audit_owner on private_cognitive.audit_events
  for all to lumina_cognitive_app
  using (actor_id = app.current_subject_id());

drop policy if exists cognitive_norm_read on private_cognitive.norm_releases;
create policy cognitive_norm_read on private_cognitive.norm_releases
  for select to lumina_cognitive_app
  using (app.current_subject_id() is not null);

create or replace function private_cognitive.submit_response(
  p_run_id uuid,
  p_assignment_id uuid,
  p_option_id text,
  p_elapsed_ms integer default null
)
returns table (
  returned_run_id uuid,
  returned_status text,
  next_assignment_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  assignment_row private_cognitive.run_assignments%rowtype;
  run_owner uuid;
  current_answered_count integer;
  target_count integer;
  next_id uuid;
  next_status text;
begin
  select ar.owner_id, ar.answered_count, ar.target_item_count
    into run_owner, current_answered_count, target_count
    from public.assessment_runs as ar
   where ar.id = p_run_id;

  if run_owner is null or run_owner <> app.current_subject_id() then
    raise exception 'invalid cognitive run owner';
  end if;

  select ra.*
    into assignment_row
    from private_cognitive.run_assignments as ra
   where ra.assignment_id = p_assignment_id
     and ra.run_id = p_run_id
     and ra.state = 'current'
   for update;

  if not found then
    raise exception 'stale cognitive assignment';
  end if;

  if exists (
    select 1 from private_cognitive.raw_responses as rr
     where rr.assignment_id = p_assignment_id
  ) then
    raise exception 'assignment already answered';
  end if;

  if not exists (
    select 1
      from private_cognitive.item_versions as iv,
           jsonb_array_elements(iv.presentation -> 'options') as option_row
     where iv.version_id = assignment_row.item_version_id
       and option_row ->> 'id' = p_option_id
  ) then
    raise exception 'invalid cognitive option';
  end if;

  insert into private_cognitive.raw_responses (run_id, assignment_id, option_id, elapsed_ms)
  values (p_run_id, p_assignment_id, p_option_id, p_elapsed_ms);

  update private_cognitive.run_assignments
     set state = 'answered', answered_at = now()
   where assignment_id = p_assignment_id;

  select ra.assignment_id
    into next_id
    from private_cognitive.run_assignments as ra
   where ra.run_id = p_run_id
     and ra.state = 'current'
   order by ra.ordinal
   limit 1;

  next_status := case when current_answered_count + 1 >= target_count then 'completed' else 'active' end;
  update public.assessment_runs
     set status = next_status,
         answered_count = answered_count + 1,
         updated_at = now()
   where id = p_run_id;

  return query select p_run_id, next_status, next_id;
end;
$$;

revoke all on schema app from public;
revoke all on schema private_cognitive from public;
revoke all on all tables in schema private_cognitive from public;
revoke all on all sequences in schema private_cognitive from public;
revoke all on function private_cognitive.submit_response(uuid, uuid, text, integer) from public;

grant usage on schema app, private_cognitive to lumina_cognitive_app;
grant select, insert on public.cognitive_subjects to lumina_cognitive_app;
grant select, insert, update on public.assessment_runs to lumina_cognitive_app;
grant select, insert, update on public.assessment_results to lumina_cognitive_app;
grant select, insert on public.research_consents to lumina_cognitive_app;
grant select on private_cognitive.item_versions, private_cognitive.answer_keys, private_cognitive.norm_releases to lumina_cognitive_app;
grant select, insert, update on private_cognitive.run_assignments, private_cognitive.raw_responses, private_cognitive.scoring_state, private_cognitive.audit_events to lumina_cognitive_app;
grant execute on function app.current_subject_id() to lumina_cognitive_app;
grant execute on function private_cognitive.submit_response(uuid, uuid, text, integer) to lumina_cognitive_app;

commit;
