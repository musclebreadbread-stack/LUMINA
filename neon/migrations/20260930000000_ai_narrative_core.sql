begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_ai_worker') then
    create role lumina_ai_worker
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_roles
     where rolname = 'lumina_ai_worker'
       and rolcanlogin
       and not rolsuper
       and not rolcreatedb
       and not rolcreaterole
       and not rolreplication
       and not rolbypassrls
       and not rolinherit
  ) then
    raise exception 'lumina_ai_worker must have restricted login attributes';
  end if;
end
$$;

do $$
declare
  migration_role oid := (select oid from pg_catalog.pg_roles where rolname = current_user);
  worker_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_ai_worker');
  member_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_member_app');
begin
  if exists (
    select 1 from pg_catalog.pg_auth_members
     where member = worker_role
        or (
          roleid = worker_role
          and (
            member <> migration_role
            or not admin_option
            or inherit_option
            or set_option
          )
        )
  ) then
    raise exception 'lumina_ai_worker has unexpected role memberships; review access before migration';
  end if;
  if exists (
    select 1 from pg_catalog.pg_namespace where nspowner = worker_role
    union all select 1 from pg_catalog.pg_class where relowner = worker_role
    union all select 1 from pg_catalog.pg_proc where proowner = worker_role
    union all select 1 from pg_catalog.pg_type where typowner = worker_role
    union all select 1 from pg_catalog.pg_database where datdba = worker_role
  ) then
    raise exception 'lumina_ai_worker owns database objects; review ownership before migration';
  end if;
  if exists (
    select 1 from pg_catalog.pg_namespace where nspname = 'ai' and nspowner <> migration_role
  ) then
    raise exception 'ai schema has a different owner; review ownership before migration';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ai'
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'ai'
  ) or exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'ai' and t.typtype <> 'p'
  ) then
    raise exception 'ai schema is not empty; review existing objects before migration';
  end if;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    cross join lateral pg_catalog.aclexplode(n.nspacl) acl
    where n.nspname = 'ai' and acl.grantee <> n.nspowner
  ) or exists (
    select 1 from pg_catalog.pg_default_acl d
    join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'ai'
  ) then
    raise exception 'ai schema has non-owner or default privileges; review access before migration';
  end if;
  if exists (
    select 1 from (
      select acl.grantee from pg_catalog.pg_class c cross join lateral pg_catalog.aclexplode(c.relacl) acl
      union all
      select acl.grantee from pg_catalog.pg_namespace n cross join lateral pg_catalog.aclexplode(n.nspacl) acl
      union all
      select acl.grantee from pg_catalog.pg_proc p cross join lateral pg_catalog.aclexplode(p.proacl) acl
      union all
      select acl.grantee from pg_catalog.pg_type t cross join lateral pg_catalog.aclexplode(t.typacl) acl
      union all
      select acl.grantee from pg_catalog.pg_database d cross join lateral pg_catalog.aclexplode(d.datacl) acl
      union all
      select acl.grantee from pg_catalog.pg_attribute a cross join lateral pg_catalog.aclexplode(a.attacl) acl
       where a.attnum > 0
      union all
      select acl.grantee from pg_catalog.pg_default_acl d cross join lateral pg_catalog.aclexplode(d.defaclacl) acl
    ) existing_grants
    where grantee = worker_role
  ) then
    raise exception 'lumina_ai_worker already has direct object privileges; review and revoke them before migration';
  end if;
  if exists (
    select 1 from (
      select acl.grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join lateral pg_catalog.aclexplode(c.relacl) acl
       where n.nspname = 'ai'
      union all
      select acl.grantee
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        cross join lateral pg_catalog.aclexplode(p.proacl) acl
       where n.nspname = 'ai'
      union all
      select acl.grantee
        from pg_catalog.pg_type t
        join pg_catalog.pg_namespace n on n.oid = t.typnamespace
        cross join lateral pg_catalog.aclexplode(t.typacl) acl
       where n.nspname = 'ai'
      union all
      select acl.grantee
        from pg_catalog.pg_default_acl d
        join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
        cross join lateral pg_catalog.aclexplode(d.defaclacl) acl
       where n.nspname = 'ai'
    ) ai_object_grants
    where grantee in (member_role, worker_role)
  ) then
    raise exception 'AI application roles already have privileges on ai objects; review access before migration';
  end if;
end
$$;

create schema if not exists ai;
revoke all on schema ai from public;
grant usage on schema ai to lumina_member_app, lumina_ai_worker;

create table ai.narrative_cache (
  cache_key bytea primary key check (octet_length(cache_key) = 32),
  product_key text not null,
  fact_sheet_version text not null,
  locale text not null check (locale in ('ko', 'en')),
  prompt_version text not null,
  schema_version text not null,
  tier text not null check (tier in ('report', 'qa', 'repair')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (expires_at > created_at)
);

create table ai.user_narratives (
  id uuid primary key default gen_random_uuid(),
  user_id text references identity."user" (id) on delete set null,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  entitlement_id uuid references billing.entitlements (id) on delete set null,
  product_key text not null,
  cache_key bytea not null check (octet_length(cache_key) = 32),
  fact_sheet_version text not null,
  locale text not null check (locale in ('ko', 'en')),
  prompt_version text not null,
  schema_version text not null,
  tier text not null check (tier in ('report', 'qa', 'repair')),
  facts_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'fallback')),
  payload jsonb,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  processing_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitlement_id, cache_key),
  check ((status = 'succeeded') = (payload is not null)),
  check (status = 'processing' or processing_until is null)
);

create index ai_user_narratives_owner_idx
  on ai.user_narratives (user_id, created_at desc);
create index ai_user_narratives_queue_idx
  on ai.user_narratives (created_at asc)
  where status in ('queued', 'processing');

create table ai.quota_counters (
  user_id text not null references identity."user" (id) on delete cascade,
  period_kind text not null check (period_kind in ('day', 'month')),
  period_start date not null,
  generation_count integer not null default 0 check (generation_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_kind, period_start)
);

create table ai.daily_budgets (
  budget_date date primary key,
  budget_limit_microusd bigint not null check (budget_limit_microusd > 0),
  spent_microusd bigint not null default 0 check (spent_microusd >= 0),
  reserved_microusd bigint not null default 0 check (reserved_microusd >= 0),
  updated_at timestamptz not null default now()
);

create table ai.budget_reservations (
  id uuid primary key,
  narrative_id uuid not null references ai.user_narratives (id) on delete cascade,
  budget_date date not null references ai.daily_budgets (budget_date) on delete restrict,
  amount_microusd bigint not null check (amount_microusd > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index ai_budget_reservations_expiry_idx on ai.budget_reservations (expires_at);

create table ai.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  narrative_id uuid not null references ai.user_narratives (id) on delete restrict,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  tier text not null check (tier in ('report', 'qa', 'repair')),
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  cost_microusd bigint not null check (cost_microusd >= 0),
  cost_is_estimate boolean not null default false,
  created_at timestamptz not null default now()
);

alter table ai.narrative_cache enable row level security;
alter table ai.narrative_cache force row level security;
alter table ai.user_narratives enable row level security;
alter table ai.user_narratives force row level security;
alter table ai.quota_counters enable row level security;
alter table ai.quota_counters force row level security;
alter table ai.daily_budgets enable row level security;
alter table ai.daily_budgets force row level security;
alter table ai.budget_reservations enable row level security;
alter table ai.budget_reservations force row level security;
alter table ai.usage_ledger enable row level security;
alter table ai.usage_ledger force row level security;

create policy ai_narratives_owner_read on ai.user_narratives
  for select to lumina_member_app using (user_id = app.current_user_id());

create policy ai_worker_cache on ai.narrative_cache
  for all to lumina_ai_worker using (true) with check (true);
create policy ai_worker_user_narratives on ai.user_narratives
  for all to lumina_ai_worker using (true) with check (true);
create policy ai_worker_quota_counters on ai.quota_counters
  for all to lumina_ai_worker using (true) with check (true);
create policy ai_worker_daily_budgets on ai.daily_budgets
  for all to lumina_ai_worker using (true) with check (true);
create policy ai_worker_budget_reservations on ai.budget_reservations
  for all to lumina_ai_worker using (true) with check (true);
create policy ai_worker_usage_ledger on ai.usage_ledger
  for all to lumina_ai_worker using (true) with check (true);

revoke all on all tables in schema ai from public;
grant select on ai.user_narratives to lumina_member_app;
grant select, insert, update, delete on all tables in schema ai to lumina_ai_worker;

commit;
