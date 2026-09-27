-- Gives scheduled analytics rollups a dedicated, RLS-bound writer role.
-- The role password is configured separately and is never stored in this migration.

begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_jobs_worker') then
    create role lumina_jobs_worker
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

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_roles
     where rolname = 'lumina_jobs_worker'
       and rolcanlogin
       and not rolsuper
       and not rolcreatedb
       and not rolcreaterole
       and not rolreplication
       and not rolbypassrls
       and not rolinherit
  ) then
    raise exception 'lumina_jobs_worker must have restricted login attributes';
  end if;
end
$$;

-- Refuse to clean up a worker that delegated privileges or already holds
-- unrelated direct grants. A DBA must review those external effects first.
do $$
declare
  worker_oid oid := 'lumina_jobs_worker'::regrole;
  ops_owner oid;
begin
  select namespace.nspowner
    into ops_owner
    from pg_catalog.pg_namespace namespace
   where namespace.nspname = 'ops';

  if ops_owner is null or ops_owner <> (select oid from pg_catalog.pg_roles where rolname = current_user) then
    raise exception 'ops schema owner differs from the migration role; review ownership before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_roles role
     where role.oid <> ops_owner
       and not role.rolsuper
       and has_schema_privilege(role.oid, 'ops', 'CREATE')
  ) then
    raise exception 'non-owner roles can create objects in ops; review schema grants before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_auth_members
     where member = worker_oid and admin_option
  ) then
    raise exception 'lumina_jobs_worker has delegated role membership; review downstream grants before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_auth_members
     where roleid = worker_oid
       and (
         member <> (select oid from pg_catalog.pg_roles where rolname = current_user)
         or not admin_option
         or inherit_option
         or set_option
       )
  ) then
    raise exception 'lumina_jobs_worker has an unexpected role membership; review downstream access before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
      cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = 0
       and privilege.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC can execute routines in ops; review existing access before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_namespace namespace
      cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) privilege
     where namespace.nspname = 'ops' and privilege.grantee = 0
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
     where namespace.nspname = 'ops'
       and relation.relkind in ('r', 'p', 'v', 'm', 'f')
       and relation.relname not in ('daily_traffic_metrics', 'daily_solution_events', 'analytics_sync_runs')
       and privilege.grantee = 0
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid
      cross join lateral aclexplode(attribute.attacl) privilege
     where namespace.nspname = 'ops'
       and relation.relname not in ('daily_traffic_metrics', 'daily_solution_events', 'analytics_sync_runs')
       and attribute.attnum > 0 and not attribute.attisdropped
       and privilege.grantee = 0
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      cross join lateral aclexplode(coalesce(relation.relacl, acldefault('S', relation.relowner))) privilege
     where namespace.nspname = 'ops' and relation.relkind = 'S'
       and privilege.grantee = 0
  ) or exists (
    select 1
      from pg_catalog.pg_type pgtype
      join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
      cross join lateral aclexplode(pgtype.typacl) privilege
     where namespace.nspname = 'ops' and privilege.grantee = 0
  ) or exists (
     select 1
       from pg_catalog.pg_default_acl default_acl
       left join pg_catalog.pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
      cross join lateral aclexplode(default_acl.defaclacl) privilege
      where (default_acl.defaclnamespace = 0 or namespace.nspname = 'ops')
        and privilege.grantee = 0
   ) then
    raise exception 'PUBLIC has privileges on other ops objects; review existing access before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_namespace namespace
      cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = worker_oid
       and privilege.is_grantable
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = worker_oid
       and privilege.is_grantable
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid
      cross join lateral aclexplode(attribute.attacl) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = worker_oid
       and privilege.is_grantable
  ) or exists (
    select 1
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
      cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = worker_oid
       and privilege.is_grantable
  ) or exists (
    select 1
      from pg_catalog.pg_type pgtype
      join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
      cross join lateral aclexplode(pgtype.typacl) privilege
     where namespace.nspname = 'ops'
       and privilege.grantee = worker_oid
       and privilege.is_grantable
  ) then
    raise exception 'lumina_jobs_worker delegated ops privileges; review downstream grants before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_namespace namespace
      cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) privilege
     where namespace.nspname <> 'ops'
       and namespace.nspname <> 'information_schema'
       and namespace.nspname !~ '^pg_'
       and privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
     where namespace.nspname <> 'ops'
       and namespace.nspname <> 'information_schema'
       and namespace.nspname !~ '^pg_'
       and privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid
      cross join lateral aclexplode(attribute.attacl) privilege
     where namespace.nspname <> 'ops'
       and namespace.nspname <> 'information_schema'
       and namespace.nspname !~ '^pg_'
       and privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
      cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) privilege
     where namespace.nspname <> 'ops'
       and namespace.nspname <> 'information_schema'
       and namespace.nspname !~ '^pg_'
       and privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_type pgtype
      join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
      cross join lateral aclexplode(pgtype.typacl) privilege
     where namespace.nspname <> 'ops'
       and namespace.nspname <> 'information_schema'
       and namespace.nspname !~ '^pg_'
       and privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_largeobject_metadata large_object
      cross join lateral aclexplode(coalesce(large_object.lomacl, acldefault('L', large_object.lomowner))) privilege
     where privilege.grantee = worker_oid
  ) or exists (
    select 1
      from pg_catalog.pg_database db
      cross join lateral aclexplode(coalesce(db.datacl, acldefault('d', db.datdba))) privilege
     where privilege.grantee = worker_oid
       and (db.datname <> current_database() or privilege.privilege_type <> 'CONNECT' or privilege.is_grantable)
  ) or exists (
    select 1
      from pg_catalog.pg_default_acl default_acl
      left join lateral aclexplode(default_acl.defaclacl) privilege on true
     where default_acl.defaclrole = worker_oid or privilege.grantee = worker_oid
  ) then
    raise exception 'lumina_jobs_worker has direct grants outside its reviewed ops role; review before migration';
  end if;
end
$$;

do $$
declare
  granted_role record;
begin
  for granted_role in
    select granted.rolname
      from pg_catalog.pg_auth_members membership
      join pg_catalog.pg_roles granted on granted.oid = membership.roleid
      join pg_catalog.pg_roles member on member.oid = membership.member
     where member.rolname = 'lumina_jobs_worker'
  loop
    execute format('revoke %I from lumina_jobs_worker', granted_role.rolname);
  end loop;

  if exists (
      select 1 from pg_catalog.pg_namespace where nspowner = 'lumina_jobs_worker'::regrole
    )
    or exists (
      select 1 from pg_catalog.pg_class where relowner = 'lumina_jobs_worker'::regrole
    )
    or exists (
      select 1 from pg_catalog.pg_proc where proowner = 'lumina_jobs_worker'::regrole
    )
    or exists (
      select 1 from pg_catalog.pg_type where typowner = 'lumina_jobs_worker'::regrole
    )
    or exists (
      select 1 from pg_catalog.pg_database where datdba = 'lumina_jobs_worker'::regrole
    ) then
    raise exception 'lumina_jobs_worker must not own database objects';
  end if;
end
$$;

do $$
declare
  type_to_clean record;
begin
  for type_to_clean in
    select namespace.nspname, pgtype.typname
      from pg_catalog.pg_type pgtype
      join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
     where namespace.nspname = 'ops'
       and pgtype.typelem = 0
  loop
    execute format('revoke all on type %I.%I from lumina_jobs_worker', type_to_clean.nspname, type_to_clean.typname);
  end loop;
end
$$;

alter table ops.daily_traffic_metrics enable row level security;
alter table ops.daily_traffic_metrics force row level security;
alter table ops.daily_solution_events enable row level security;
alter table ops.daily_solution_events force row level security;
alter table ops.analytics_sync_runs enable row level security;
alter table ops.analytics_sync_runs force row level security;

-- Scheduled rollups are authoritative for their requested production window:
-- they may replace overlapping manual-import rows, but may write only Vercel rows.
drop policy if exists daily_traffic_jobs_write on ops.daily_traffic_metrics;
create policy daily_traffic_jobs_write on ops.daily_traffic_metrics
  for all to lumina_jobs_worker
  using (environment = 'production' and source in ('vercel-web-analytics', 'manual-import'))
  with check (environment = 'production' and source = 'vercel-web-analytics');

drop policy if exists solution_events_jobs_write on ops.daily_solution_events;
create policy solution_events_jobs_write on ops.daily_solution_events
  for all to lumina_jobs_worker
  using (environment = 'production' and source in ('vercel-web-analytics', 'manual-import'))
  with check (environment = 'production' and source = 'vercel-web-analytics');

drop policy if exists sync_runs_jobs_write on ops.analytics_sync_runs;
create policy sync_runs_jobs_write on ops.analytics_sync_runs
  for all to lumina_jobs_worker
  using (source = 'vercel-web-analytics')
  with check (source = 'vercel-web-analytics');

alter table ops.daily_solution_events
  drop constraint if exists daily_solution_events_event_name_check;
alter table ops.daily_solution_events
  add constraint daily_solution_events_event_name_check
  check (event_name in (
    'solution_entry', 'test_start', 'test_complete', 'result_view',
    'share_open', 'share_image_saved', 'compatibility_compare',
    'integrated_report_view', 'share_landing_view', 'share_landing_cta',
    'related_test_click'
  ));

-- Clear pre-existing grants from the worker throughout ops before applying
-- this migration's narrowly scoped permissions.
revoke all privileges on schema ops from lumina_jobs_worker;
revoke all privileges on all tables in schema ops from lumina_jobs_worker;
revoke all privileges on all sequences in schema ops from lumina_jobs_worker;
revoke execute on all routines in schema ops from lumina_jobs_worker;
-- PostgreSQL grants PUBLIC EXECUTE to new routines by default. PostgreSQL has
-- no schema-local way to revoke that built-in grant, so this affects every new
-- routine created by the migration role in any schema. Future public-callable
-- routines created by that role must receive an explicit EXECUTE grant.
alter default privileges revoke execute on routines from public;
revoke all on ops.daily_traffic_metrics, ops.daily_solution_events, ops.analytics_sync_runs from public;
grant usage on schema ops to lumina_jobs_worker;
grant insert (metric_date, environment, pageviews, visitors, source, coverage_start, coverage_end, collected_at),
  update (pageviews, visitors, source, coverage_start, coverage_end, collected_at)
  on ops.daily_traffic_metrics to lumina_jobs_worker;
grant select (metric_date, environment, pageviews, visitors, source, coverage_start, coverage_end, collected_at)
  on ops.daily_traffic_metrics to lumina_jobs_worker;
grant delete on ops.daily_solution_events to lumina_jobs_worker;
grant insert (metric_date, environment, analysis_key, event_name, event_count, visitors, source, collected_at),
  update (event_count, visitors, source, collected_at)
  on ops.daily_solution_events to lumina_jobs_worker;
grant select (metric_date, environment, analysis_key, event_name, event_count, visitors, source, collected_at)
  on ops.daily_solution_events to lumina_jobs_worker;
grant insert (source, requested_since, requested_until, status),
  update (status, rows_written, error_code, finished_at)
  on ops.analytics_sync_runs to lumina_jobs_worker;
grant select (id, source) on ops.analytics_sync_runs to lumina_jobs_worker;

commit;
