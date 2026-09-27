import { readdir, readFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment, sha256 } from "./lib/neonAdminEnv.mjs";

const BASELINE_MIGRATIONS = new Set([
  "20260828000000_cognitive_pilot.sql",
  "20260829000000_cognitive_item_bank_metadata.sql",
  "20260829000100_cognitive_pilot_demographics.sql",
  "20260830000000_ops_analytics.sql",
]);

const BASELINE_CHECKSUMS = new Map([
  ["20260828000000_cognitive_pilot.sql", "fd3040a617b40a8b8cf56dd78f09b936169815a8a7a774d16b82510f3842cdbb"],
  ["20260829000000_cognitive_item_bank_metadata.sql", "e200171b724b8ec0639b8683e39de00f8dbe4f96e8d4deeb8d1c535df6834cf1"],
  ["20260829000100_cognitive_pilot_demographics.sql", "2ad82971baa74f52741e13e28827825bb3a94327b109e6597c30c41cb9036db0"],
  ["20260830000000_ops_analytics.sql", "b09dbd46c749fcc591eb5d30eb7748c28c96c8d179564e1438a67551aaa287e6"],
]);

const LOCK_NAMESPACE = 1279871315;
const LOCK_KEY = 1280130631;

function migrationMode(argumentsList) {
  if (argumentsList.includes("--help")) {
    console.log("Usage: pnpm db:neon:migrate [--dry-run | --apply | --baseline]\nDefault: --dry-run");
    process.exit(0);
  }

  const modes = argumentsList.filter((argument) => ["--dry-run", "--apply", "--baseline"].includes(argument));
  const unknown = argumentsList.filter((argument) => !["--dry-run", "--apply", "--baseline"].includes(argument));
  if (unknown.length > 0) throw new Error(`Unknown migration argument: ${unknown[0]}`);
  if (modes.length > 1) throw new Error("Choose exactly one of --dry-run, --apply, or --baseline");
  return modes[0] ?? "--dry-run";
}

async function migrationFiles() {
  const migrationsDirectory = new URL("../neon/migrations/", import.meta.url);
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_[A-Za-z0-9_-]+\.sql$/u.test(file))
    .sort();
  if (files.length === 0) throw new Error("No Neon migrations found");

  return Promise.all(files.map(async (filename) => ({
    filename,
    sql: (await readFile(new URL(filename, migrationsDirectory), "utf8")).replace(/\r\n/gu, "\n"),
  })));
}

async function hasMigrationLedger(client) {
  const result = await client.query("select to_regclass('ops.schema_migrations') is not null as exists");
  return result.rows[0]?.exists === true;
}

async function existingSchemaState(client) {
  const result = await client.query(`
    with required_tables(schema_name, table_name) as (
      values
        ('public', 'cognitive_subjects'),
        ('public', 'assessment_runs'),
        ('public', 'assessment_results'),
        ('public', 'research_consents'),
        ('private_cognitive', 'item_versions'),
        ('private_cognitive', 'answer_keys'),
        ('private_cognitive', 'run_assignments'),
        ('private_cognitive', 'raw_responses'),
        ('private_cognitive', 'scoring_state'),
        ('private_cognitive', 'audit_events'),
        ('private_cognitive', 'norm_releases'),
        ('ops', 'admin_members'),
        ('ops', 'daily_traffic_metrics'),
        ('ops', 'daily_solution_events'),
        ('ops', 'analytics_sync_runs'),
        ('ops', 'admin_audit_log')
    ), required_policies(
      schema_name, table_name, policy_name, command_name, role_name,
      qual_fragment_a, qual_fragment_b, check_fragment_a, check_fragment_b, check_fragment_c,
      expected_qual, expected_check
    ) as (
      values
        ('public', 'cognitive_subjects', 'cognitive_subject_owner', 'ALL', 'lumina_cognitive_app', 'app.current_subject_id()', 'id', 'app.current_subject_id()', 'id', null, null, null),
        ('public', 'assessment_runs', 'cognitive_run_owner', 'ALL', 'lumina_cognitive_app', 'app.current_subject_id()', 'owner_id', 'app.current_subject_id()', 'owner_id', null, null, null),
        ('public', 'assessment_results', 'cognitive_result_owner', 'ALL', 'lumina_cognitive_app', 'app.current_subject_id()', 'owner_id', 'app.current_subject_id()', 'owner_id', null, null, null),
        ('public', 'research_consents', 'cognitive_consent_owner', 'ALL', 'lumina_cognitive_app', 'app.current_subject_id()', 'owner_id', 'app.current_subject_id()', 'owner_id', null, null, null),
        ('private_cognitive', 'item_versions', 'cognitive_item_bank_read', 'SELECT', 'lumina_cognitive_app', 'app.current_subject_id()', 'is not null', null, null, null, null, null),
        ('private_cognitive', 'answer_keys', 'cognitive_answer_key_read', 'SELECT', 'lumina_cognitive_app', 'app.current_subject_id()', 'is not null', null, null, null, null, null),
        ('private_cognitive', 'run_assignments', 'cognitive_assignment_owner', 'ALL', 'lumina_cognitive_app', 'exists', 'ar.owner_id', 'exists', 'ar.owner_id', 'app.current_subject_id()', null, null),
        ('private_cognitive', 'raw_responses', 'cognitive_response_owner', 'ALL', 'lumina_cognitive_app', 'exists', 'ar.owner_id', 'exists', 'ar.owner_id', 'app.current_subject_id()', null, null),
        ('private_cognitive', 'scoring_state', 'cognitive_scoring_owner', 'ALL', 'lumina_cognitive_app', 'exists', 'ar.owner_id', 'exists', 'ar.owner_id', 'app.current_subject_id()', null, null),
        ('private_cognitive', 'audit_events', 'cognitive_audit_owner', 'ALL', 'lumina_cognitive_app', 'app.current_subject_id()', 'actor_id', null, null, null, null, null),
        ('private_cognitive', 'norm_releases', 'cognitive_norm_read', 'SELECT', 'lumina_cognitive_app', 'app.current_subject_id()', 'is not null', null, null, null, null, null),
        ('ops', 'admin_members', 'admin_member_self_read', 'SELECT', 'lumina_cognitive_app', 'app.current_auth_user_id()', 'user_id', null, null, null, null, null),
        ('ops', 'daily_traffic_metrics', 'traffic_admin_read', 'SELECT', 'lumina_cognitive_app', 'app.current_admin_role()', 'viewer', null, null, null, null, null),
        ('ops', 'daily_solution_events', 'solution_events_admin_read', 'SELECT', 'lumina_cognitive_app', 'app.current_admin_role()', 'viewer', null, null, null, null, null),
        ('ops', 'analytics_sync_runs', 'sync_runs_admin_read', 'SELECT', 'lumina_cognitive_app', 'app.current_admin_role()', 'viewer', null, null, null, null, null),
        ('ops', 'admin_audit_log', 'audit_log_admin_read', 'SELECT', 'lumina_cognitive_app', 'app.current_admin_role()', 'analyst', null, null, null, null, null),
        ('ops', 'admin_audit_log', 'audit_log_admin_insert', 'INSERT', 'lumina_cognitive_app', null, null, 'app.current_auth_user_id()', 'actor_user_id', 'app.current_admin_role()', null, null)
    ), optional_policies(
      schema_name, table_name, policy_name, command_name, role_name,
      qual_fragment_a, qual_fragment_b, check_fragment_a, check_fragment_b, check_fragment_c,
      expected_qual, expected_check
    ) as (
      values
        ('ops', 'daily_traffic_metrics', 'daily_traffic_jobs_write', 'ALL', 'lumina_jobs_worker', 'production', 'umami', 'production', 'umami', null, 'environment=''production''andsource=anyarray[''umami'',''vercel-web-analytics'',''manual-import'']', 'environment=''production''andsource=''umami'''),
        ('ops', 'daily_solution_events', 'solution_events_jobs_write', 'ALL', 'lumina_jobs_worker', 'production', 'umami', 'production', 'umami', null, 'environment=''production''andsource=anyarray[''umami'',''vercel-web-analytics'',''manual-import'']', 'environment=''production''andsource=''umami'''),
        ('ops', 'analytics_sync_runs', 'sync_runs_jobs_write', 'ALL', 'lumina_jobs_worker', 'umami', null, 'umami', null, null, 'source=''umami''', 'source=''umami''')
    ), allowed_policies as (
      select *, true as required from required_policies
      union all
      select *, false as required from optional_policies
    ), table_state as (
      select r.schema_name, r.table_name, c.oid, c.relrowsecurity, c.relforcerowsecurity
        from required_tables r
        left join pg_catalog.pg_namespace n on n.nspname = r.schema_name
        left join pg_catalog.pg_class c on c.relnamespace = n.oid and c.relname = r.table_name and c.relkind in ('r', 'p')
    ), policy_state as (
      select a.*,
        exists (
          select 1 from pg_catalog.pg_policies p
           where p.schemaname = a.schema_name
             and p.tablename = a.table_name
             and p.policyname = a.policy_name
             and p.cmd = a.command_name
             and p.roles = array[a.role_name]::name[]
             and (a.qual_fragment_a is null or position(a.qual_fragment_a in lower(coalesce(p.qual, ''))) > 0)
             and (a.qual_fragment_b is null or position(a.qual_fragment_b in lower(coalesce(p.qual, ''))) > 0)
             and (a.check_fragment_a is null or position(a.check_fragment_a in lower(coalesce(p.with_check, ''))) > 0)
             and (a.check_fragment_b is null or position(a.check_fragment_b in lower(coalesce(p.with_check, ''))) > 0)
             and (a.check_fragment_c is null or position(a.check_fragment_c in lower(coalesce(p.with_check, ''))) > 0)
             and (a.expected_qual is null or regexp_replace(regexp_replace(lower(coalesce(p.qual, '')), '[[:space:]()]', '', 'g'), '::text', '', 'g') = a.expected_qual)
             and (a.expected_check is null or regexp_replace(regexp_replace(lower(coalesce(p.with_check, '')), '[[:space:]()]', '', 'g'), '::text', '', 'g') = a.expected_check)
             and coalesce(p.qual, '') !~* '(^|[^[:alnum:]_])or([^[:alnum:]_]|$)'
             and coalesce(p.with_check, '') !~* '(^|[^[:alnum:]_])or([^[:alnum:]_]|$)'
             and position('true' in lower(coalesce(p.qual, '') || coalesce(p.with_check, ''))) = 0
        ) as matches
      from allowed_policies a
    ), worker_role as (
      select oid, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
        rolbypassrls, rolinherit
        from pg_catalog.pg_roles where rolname = 'lumina_jobs_worker'
    ), expected_worker_columns(schema_name, table_name, column_name, allow_select, allow_insert, allow_update) as (
      values
        ('ops', 'daily_traffic_metrics', 'metric_date', true, true, false),
        ('ops', 'daily_traffic_metrics', 'environment', true, true, false),
        ('ops', 'daily_traffic_metrics', 'pageviews', true, true, true),
        ('ops', 'daily_traffic_metrics', 'visitors', true, true, true),
        ('ops', 'daily_traffic_metrics', 'source', true, true, true),
        ('ops', 'daily_traffic_metrics', 'coverage_start', true, true, true),
        ('ops', 'daily_traffic_metrics', 'coverage_end', true, true, true),
        ('ops', 'daily_traffic_metrics', 'collected_at', true, true, true),
        ('ops', 'daily_solution_events', 'metric_date', true, true, false),
        ('ops', 'daily_solution_events', 'environment', true, true, false),
        ('ops', 'daily_solution_events', 'analysis_key', true, true, false),
        ('ops', 'daily_solution_events', 'event_name', true, true, false),
        ('ops', 'daily_solution_events', 'event_count', true, true, true),
        ('ops', 'daily_solution_events', 'visitors', true, true, true),
        ('ops', 'daily_solution_events', 'source', true, true, true),
        ('ops', 'daily_solution_events', 'collected_at', true, true, true),
        ('ops', 'analytics_sync_runs', 'id', true, false, false),
        ('ops', 'analytics_sync_runs', 'source', true, true, false),
        ('ops', 'analytics_sync_runs', 'requested_since', false, true, false),
        ('ops', 'analytics_sync_runs', 'requested_until', false, true, false),
        ('ops', 'analytics_sync_runs', 'status', false, true, true),
        ('ops', 'analytics_sync_runs', 'rows_written', false, false, true),
        ('ops', 'analytics_sync_runs', 'error_code', false, false, true),
        ('ops', 'analytics_sync_runs', 'finished_at', false, false, true)
    ), expected_schema_acl as (
      select 'ops'::text as schema_name, 'USAGE'::text as privilege_type, worker.oid as grantee, false as is_grantable
        from worker_role worker
    ), actual_schema_acl as (
      select namespace.nspname::text as schema_name, privilege.privilege_type::text as privilege_type,
        privilege.grantee, privilege.is_grantable
        from pg_catalog.pg_namespace namespace
        cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) privilege
        cross join worker_role worker
       where namespace.nspname = 'ops' and privilege.grantee in (worker.oid, 0)
    ), expected_table_acl(schema_name, table_name, privilege_type) as (
      values ('ops', 'daily_solution_events', 'DELETE')
    ), worker_expected_table_acl as (
      select expected.schema_name, expected.table_name, expected.privilege_type,
        worker.oid as grantee, false as is_grantable
        from expected_table_acl expected cross join worker_role worker
    ), actual_table_acl as (
      select namespace.nspname::text as schema_name, relation.relname::text as table_name,
        privilege.privilege_type::text as privilege_type, privilege.grantee, privilege.is_grantable
        from pg_catalog.pg_class relation
        join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
        cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
        cross join worker_role worker
       where namespace.nspname = 'ops'
         and relation.relkind in ('r', 'p', 'v', 'm', 'f')
         and privilege.grantee in (worker.oid, 0)
    ), expected_column_acl as (
      select expected.schema_name, expected.table_name, expected.column_name, permission.privilege_type,
        worker.oid as grantee, false as is_grantable
        from expected_worker_columns expected
        cross join worker_role worker
        cross join lateral (values
          ('SELECT'::text, expected.allow_select),
          ('INSERT'::text, expected.allow_insert),
          ('UPDATE'::text, expected.allow_update)
        ) permission(privilege_type, allowed)
       where permission.allowed
    ), actual_column_acl as (
      select namespace.nspname::text as schema_name, relation.relname::text as table_name,
        attribute.attname::text as column_name, privilege.privilege_type::text as privilege_type,
        privilege.grantee, privilege.is_grantable
        from pg_catalog.pg_class relation
        join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
        join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid
        cross join lateral aclexplode(attribute.attacl) privilege
        cross join worker_role worker
       where namespace.nspname = 'ops'
         and relation.relname in ('daily_traffic_metrics', 'daily_solution_events', 'analytics_sync_runs')
         and attribute.attnum > 0 and not attribute.attisdropped
         and privilege.grantee in (worker.oid, 0)
    ), foreign_worker_acl(object_name, privilege_type, is_grantable) as (
      select 'schema:' || namespace.nspname::text, privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_namespace namespace
        cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) privilege
        cross join worker_role worker
       where namespace.nspname <> 'ops' and namespace.nspname <> 'information_schema'
         and namespace.nspname !~ '^pg_' and privilege.grantee = worker.oid
      union all
      select 'relation:' || namespace.nspname::text || '.' || relation.relname::text,
        privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_class relation
        join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
        cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
        cross join worker_role worker
       where namespace.nspname <> 'ops' and namespace.nspname <> 'information_schema'
         and namespace.nspname !~ '^pg_' and privilege.grantee = worker.oid
      union all
      select 'column:' || namespace.nspname::text || '.' || relation.relname::text || '.' || attribute.attname::text,
        privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_class relation
        join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
        join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid
        cross join lateral aclexplode(attribute.attacl) privilege
        cross join worker_role worker
       where namespace.nspname <> 'ops' and namespace.nspname <> 'information_schema'
         and namespace.nspname !~ '^pg_' and attribute.attnum > 0
         and not attribute.attisdropped and privilege.grantee = worker.oid
      union all
      select 'function:' || namespace.nspname::text || '.' || proc.proname::text,
        privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_proc proc
        join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
        cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) privilege
        cross join worker_role worker
       where namespace.nspname <> 'ops' and namespace.nspname <> 'information_schema'
         and namespace.nspname !~ '^pg_' and privilege.grantee = worker.oid
      union all
      select 'type:' || namespace.nspname::text || '.' || pgtype.typname::text,
        privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_type pgtype
        join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
        cross join lateral aclexplode(pgtype.typacl) privilege
        cross join worker_role worker
       where namespace.nspname <> 'ops' and namespace.nspname <> 'information_schema'
         and namespace.nspname !~ '^pg_' and privilege.grantee = worker.oid
      union all
      select 'large-object:' || large_object.oid::text, privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_largeobject_metadata large_object
        cross join lateral aclexplode(coalesce(large_object.lomacl, acldefault('L', large_object.lomowner))) privilege
        cross join worker_role worker
       where privilege.grantee = worker.oid
      union all
      select 'database:' || db.datname::text, privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_database db
        cross join lateral aclexplode(coalesce(db.datacl, acldefault('d', db.datdba))) privilege
        cross join worker_role worker
       where privilege.grantee = worker.oid
         and (db.datname <> current_database() or privilege.privilege_type <> 'CONNECT' or privilege.is_grantable)
      union all
      select 'default-owner:' || default_acl.defaclobjtype::text || ':' || default_acl.defaclnamespace::text, 'DEFAULT', false
        from pg_catalog.pg_default_acl default_acl
        cross join worker_role worker
       where default_acl.defaclrole = worker.oid
      union all
      select 'default-grantee:' || default_acl.defaclobjtype::text || ':' || default_acl.defaclnamespace::text,
        privilege.privilege_type::text, privilege.is_grantable
        from pg_catalog.pg_default_acl default_acl
        cross join lateral aclexplode(default_acl.defaclacl) privilege
        cross join worker_role worker
       where privilege.grantee = worker.oid
    )
    select
      exists (select 1 from table_state where oid is not null) as has_existing_project_schema,
      not exists (select 1 from table_state where oid is null or not relrowsecurity or not relforcerowsecurity)
      and not exists (
        select 1 from policy_state where required and not matches
      )
      and not exists (
        select 1
          from pg_catalog.pg_policies p
          join required_tables r on r.schema_name = p.schemaname and r.table_name = p.tablename
         where not exists (
           select 1 from allowed_policies a
            where a.schema_name = p.schemaname
              and a.table_name = p.tablename
              and a.policy_name = p.policyname
         )
      )
      and exists (
        select 1 from information_schema.columns
         where table_schema = 'private_cognitive'
           and table_name = 'item_versions'
           and column_name = 'metadata'
      )
      and (
        select count(*) = 3 from information_schema.columns
         where table_schema = 'private_cognitive'
           and table_name = 'scoring_state'
           and column_name in ('gender_band', 'education_band', 'region_class')
      )
      and to_regclass('public.assessment_runs_owner_updated_idx') is not null
      and to_regclass('public.assessment_results_owner_created_idx') is not null
      and to_regclass('ops.analytics_sync_runs_started_idx') is not null
      and to_regprocedure('app.current_subject_id()') is not null
      and to_regprocedure('app.current_auth_user_id()') is not null
      and to_regprocedure('app.current_admin_role()') is not null
      and to_regprocedure('private_cognitive.submit_response(uuid,uuid,text,integer)') is not null
      and exists (
        select 1 from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private_cognitive'
          and p.proname = 'submit_response'
          and p.prosecdef = true
          and 'search_path=pg_catalog' = any(coalesce(p.proconfig, array[]::text[]))
          and not exists (
            select 1
              from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) privilege
             where privilege.grantee = 0 and privilege.privilege_type = 'EXECUTE'
          )
      ) as matches_baseline,
      not exists (select 1 from policy_state where not required and not matches)
        as matches_jobs_worker_policies,
      exists (
        select 1
          from pg_catalog.pg_policies p
          join optional_policies r on r.schema_name = p.schemaname
            and r.table_name = p.tablename
            and r.policy_name = p.policyname
      ) as has_any_jobs_worker_policies
      , exists (
        select 1 from worker_role worker
         where worker.rolcanlogin and not worker.rolsuper and not worker.rolcreatedb
           and not worker.rolcreaterole and not worker.rolreplication
            and not worker.rolbypassrls and not worker.rolinherit
            and not exists (select 1 from pg_catalog.pg_auth_members membership where membership.member = worker.oid)
            and not exists (
              select 1 from pg_catalog.pg_auth_members membership
               where membership.roleid = worker.oid
                 and (
                   membership.member <> (select oid from pg_catalog.pg_roles where rolname = current_user)
                   or not membership.admin_option
                   or membership.inherit_option
                   or membership.set_option
                 )
            )
            and not exists (select 1 from pg_catalog.pg_namespace where nspowner = worker.oid)
            and not exists (select 1 from pg_catalog.pg_class where relowner = worker.oid)
            and not exists (select 1 from pg_catalog.pg_proc where proowner = worker.oid)
            and not exists (select 1 from pg_catalog.pg_type where typowner = worker.oid)
            and not exists (select 1 from pg_catalog.pg_database where datdba = worker.oid)
            and exists (
              select 1 from pg_catalog.pg_namespace namespace
             where namespace.nspname = 'ops'
                 and namespace.nspowner = (select oid from pg_catalog.pg_roles where rolname = current_user)
            )
            and not exists (
              select 1
                from pg_catalog.pg_roles role
               where role.oid <> (select namespace.nspowner
                                    from pg_catalog.pg_namespace namespace
                                   where namespace.nspname = 'ops')
                 and not role.rolsuper
                 and has_schema_privilege(role.oid, 'ops', 'CREATE')
            )
            and exists (
              select 1
                from pg_catalog.pg_default_acl default_acl
               where default_acl.defaclrole = (select oid from pg_catalog.pg_roles where rolname = current_user)
                 and default_acl.defaclnamespace = 0
                 and default_acl.defaclobjtype = 'f'
            )
            and not exists (
              select 1
                from pg_catalog.pg_default_acl default_acl
                cross join lateral aclexplode(default_acl.defaclacl) privilege
               where default_acl.defaclrole = (select oid from pg_catalog.pg_roles where rolname = current_user)
                 and default_acl.defaclnamespace = 0
                 and default_acl.defaclobjtype = 'f'
                 and privilege.grantee = 0
                 and privilege.privilege_type = 'EXECUTE'
            )
            and not exists (select 1 from foreign_worker_acl)
            and not exists (
              select 1 from pg_catalog.pg_default_acl default_acl
              left join pg_catalog.pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
              cross join lateral aclexplode(default_acl.defaclacl) privilege
               where (default_acl.defaclnamespace = 0 or namespace.nspname = 'ops')
                 and privilege.grantee = 0
            )
            and has_schema_privilege(worker.oid, 'ops', 'USAGE')
           and not has_schema_privilege(worker.oid, 'ops', 'CREATE')
           and not exists (
             select 1 from pg_catalog.pg_class relation
             join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
             cross join lateral aclexplode(coalesce(relation.relacl, acldefault('S', relation.relowner))) privilege
              where namespace.nspname = 'ops' and relation.relkind = 'S'
                and privilege.grantee in (worker.oid, 0)
           )
           and not exists (
             select 1 from pg_catalog.pg_proc proc
             join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
             cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) privilege
               where namespace.nspname = 'ops' and privilege.grantee in (worker.oid, 0)
           )
           and not exists (
             select 1 from pg_catalog.pg_type pgtype
             join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
             cross join lateral aclexplode(pgtype.typacl) privilege
              where namespace.nspname = 'ops' and privilege.grantee in (worker.oid, 0)
           )
           and not exists (select schema_name, privilege_type, grantee, is_grantable from actual_schema_acl
                           except select schema_name, privilege_type, grantee, is_grantable from expected_schema_acl)
           and not exists (select schema_name, privilege_type, grantee, is_grantable from expected_schema_acl
                           except select schema_name, privilege_type, grantee, is_grantable from actual_schema_acl)
           and not exists (select schema_name, table_name, privilege_type, grantee, is_grantable from actual_table_acl
                           except select schema_name, table_name, privilege_type, grantee, is_grantable from worker_expected_table_acl)
           and not exists (select schema_name, table_name, privilege_type, grantee, is_grantable from worker_expected_table_acl
                           except select schema_name, table_name, privilege_type, grantee, is_grantable from actual_table_acl)
           and not exists (select schema_name, table_name, column_name, privilege_type, grantee, is_grantable from actual_column_acl
                           except select schema_name, table_name, column_name, privilege_type, grantee, is_grantable from expected_column_acl)
           and not exists (select schema_name, table_name, column_name, privilege_type, grantee, is_grantable from expected_column_acl
                           except select schema_name, table_name, column_name, privilege_type, grantee, is_grantable from actual_column_acl)
       ) as matches_jobs_worker_privileges
  `);
  const state = result.rows[0] ?? {};
  return {
    hasExistingProjectSchema: state.has_existing_project_schema === true,
    matchesBaseline: state.matches_baseline === true,
    matchesJobsWorkerPolicies: state.matches_jobs_worker_policies === true,
    hasAnyJobsWorkerPolicies: state.has_any_jobs_worker_policies === true,
    matchesJobsWorkerPrivileges: state.matches_jobs_worker_privileges === true,
  };
}

async function migrationRecords(client, ledgerExists) {
  if (!ledgerExists) return new Map();
  const result = await client.query("select filename, checksum from ops.schema_migrations order by filename");
  return new Map(result.rows.map((row) => [String(row.filename), String(row.checksum)]));
}

function validateRecordedMigrations(migrations, records) {
  const fileChecksums = new Map(migrations.map((migration) => [migration.filename, sha256(migration.sql)]));
  for (const [filename, checksum] of records) {
    const currentChecksum = fileChecksums.get(filename);
    if (currentChecksum === undefined) {
      throw new Error(`Migration ledger contains an unknown file: ${filename}`);
    }
    if (currentChecksum !== checksum) {
      throw new Error(`Migration checksum changed for ${filename}; create a forward migration instead`);
    }
  }
  return fileChecksums;
}

function hasCompleteBaseline(records, fileChecksums) {
  return Array.from(BASELINE_MIGRATIONS).every((filename) => (
    fileChecksums.get(filename) === BASELINE_CHECKSUMS.get(filename)
    && records.get(filename) === BASELINE_CHECKSUMS.get(filename)
  ));
}

function migrationBody(sql, filename) {
  const withoutBegin = sql.replace(/(^|\r?\n)begin\s*;\s*/iu, "$1");
  const withoutCommit = withoutBegin.replace(/(^|\r?\n)commit\s*;\s*$/iu, "$1");
  if (withoutBegin === sql || withoutCommit === withoutBegin) {
    throw new Error(`Migration must have one outer BEGIN/COMMIT pair: ${filename}`);
  }
  return withoutCommit.trim();
}

async function bootstrapMigrationLedger(client) {
  await client.query("begin");
  try {
    await client.query("create schema if not exists ops");
    await client.query(`
      create table if not exists ops.schema_migrations (
        filename text primary key,
        checksum text not null check (length(checksum) = 64),
        applied_at timestamptz not null default now()
      )
    `);
    await client.query("alter table ops.schema_migrations enable row level security");
    await client.query("alter table ops.schema_migrations force row level security");
    await client.query("drop policy if exists schema_migrations_owner on ops.schema_migrations");
    await client.query(`
      create policy schema_migrations_owner on ops.schema_migrations
        for all to neondb_owner
        using (true)
        with check (true)
    `);
    await client.query("revoke all on ops.schema_migrations from public");
    await client.query("grant usage on schema ops to neondb_owner");
    await client.query("grant select, insert, update, delete on ops.schema_migrations to neondb_owner");
    await client.query("commit");
  } catch {
    try { await client.query("rollback"); } catch { /* Preserve a sanitized error. */ }
    throw new Error("Could not initialize the migration ledger");
  }
}

async function acquireMigrationLock(client) {
  await client.query("select pg_advisory_lock($1::integer, $2::integer)", [LOCK_NAMESPACE, LOCK_KEY]);
}

async function releaseMigrationLock(client) {
  await client.query("select pg_advisory_unlock($1::integer, $2::integer)", [LOCK_NAMESPACE, LOCK_KEY]);
}

function printDryRun({ env, migrations, records, fileChecksums, schemaState, ledgerExists }) {
  const baselineRequired = schemaState.hasExistingProjectSchema
    && !hasCompleteBaseline(records, fileChecksums);
  const plan = migrations.map(({ filename }) => {
    const isBaseline = BASELINE_MIGRATIONS.has(filename);
    const applied = records.has(filename);
    return {
      filename,
      status: applied ? "applied" : baselineRequired && isBaseline ? "baseline-required" : "pending",
      checksum: fileChecksums.get(filename),
    };
  });

  console.log(JSON.stringify({
    mode: "dry-run",
    envFile: env.fileName,
    productionEndpoint: env.isProduction,
    migrationLedgerPresent: ledgerExists,
    existingSchema: schemaState.hasExistingProjectSchema,
    baselineRequired,
    pendingCount: plan.filter((entry) => entry.status === "pending").length,
    migrations: plan,
  }, null, 2));
}

const mode = migrationMode(process.argv.slice(2));
const env = await loadNeonAdminEnvironment({ requireProductionOptIn: mode !== "--dry-run" });
const migrations = await migrationFiles();
const client = new Client(env.databaseUrl);
let lockAcquired = false;

try {
  try {
    await client.connect();
  } catch {
    throw new Error("Could not connect to the selected Neon endpoint; verify the local admin env file");
  }

  if (mode === "--dry-run") {
    const ledgerExists = await hasMigrationLedger(client);
    const records = await migrationRecords(client, ledgerExists);
    const fileChecksums = validateRecordedMigrations(migrations, records);
    const schemaState = await existingSchemaState(client);
    printDryRun({ env, migrations, records, fileChecksums, schemaState, ledgerExists });
  } else {
    await acquireMigrationLock(client);
    lockAcquired = true;

    const ledgerExists = await hasMigrationLedger(client);
    const schemaState = await existingSchemaState(client);
    const records = await migrationRecords(client, ledgerExists);
    const fileChecksums = validateRecordedMigrations(migrations, records);

    if (mode === "--baseline") {
      if (!schemaState.matchesBaseline) {
        throw new Error("The current database does not match all four reviewed baseline migrations");
      }
      if (schemaState.hasAnyJobsWorkerPolicies) {
        throw new Error("The jobs-worker migration is already present without a ledger record; review the target manually");
      }
      const baselineFiles = migrations.filter((migration) => BASELINE_MIGRATIONS.has(migration.filename));
      if (baselineFiles.length !== BASELINE_MIGRATIONS.size) {
        throw new Error("One or more reviewed baseline migration files are missing");
      }
      for (const migration of baselineFiles) {
        if (fileChecksums.get(migration.filename) !== BASELINE_CHECKSUMS.get(migration.filename)) {
          throw new Error(`Reviewed baseline checksum changed for ${migration.filename}`);
        }
      }
      await bootstrapMigrationLedger(client);
      await client.query("begin");
      try {
        for (const migration of baselineFiles) {
          await client.query(
            `insert into ops.schema_migrations (filename, checksum)
             values ($1, $2)
             on conflict (filename) do nothing`,
            [migration.filename, fileChecksums.get(migration.filename)],
          );
        }
        await client.query("commit");
      } catch {
        try { await client.query("rollback"); } catch { /* Preserve a sanitized error. */ }
        throw new Error("Could not record the reviewed baseline atomically");
      }
      console.log(JSON.stringify({ mode: "baseline", recorded: baselineFiles.map(({ filename }) => filename) }, null, 2));
    } else {
      if (!ledgerExists && schemaState.hasExistingProjectSchema) {
        throw new Error("Existing project schema detected without a ledger; review the target and run --baseline first");
      }
      if (records.size === 0 && schemaState.hasExistingProjectSchema) {
        throw new Error("Existing project schema detected with an empty ledger; review the target and run --baseline first");
      }
      if (schemaState.hasExistingProjectSchema && !hasCompleteBaseline(records, fileChecksums)) {
        throw new Error("Existing project schema requires a complete reviewed baseline before applying migrations");
      }
      if (schemaState.hasExistingProjectSchema && !schemaState.matchesBaseline) {
        throw new Error("Existing database objects no longer match the reviewed baseline invariants");
      }
      const workerMigration = "20260926000000_ops_job_worker_and_related_click.sql";
      if (records.has(workerMigration) && (!schemaState.matchesJobsWorkerPolicies || !schemaState.matchesJobsWorkerPrivileges)) {
        throw new Error("The recorded jobs-worker migration no longer matches its required RLS policies and grants");
      }
      if (!records.has(workerMigration) && schemaState.hasAnyJobsWorkerPolicies) {
        throw new Error("Jobs-worker policies exist without a migration ledger record; review the target manually");
      }

      if (!ledgerExists) await bootstrapMigrationLedger(client);
      let appliedCount = 0;
      for (const migration of migrations) {
        const checksum = fileChecksums.get(migration.filename);
        if (records.has(migration.filename)) continue;

        try {
          await client.query("begin");
          await client.query(migrationBody(migration.sql, migration.filename));
          await client.query(
            "insert into ops.schema_migrations (filename, checksum) values ($1, $2)",
            [migration.filename, checksum],
          );
          await client.query("commit");
        } catch {
          try { await client.query("rollback"); } catch { /* Preserve a sanitized error. */ }
          throw new Error(`Migration failed for ${migration.filename}; inspect database diagnostics without logging credentials`);
        }
        appliedCount += 1;
      }
      console.log(JSON.stringify({ mode: "apply", appliedCount, migrations: migrations.map(({ filename }) => filename) }, null, 2));
    }
  }
} finally {
  if (lockAcquired) {
    try { await releaseMigrationLock(client); } catch { /* Connection close also releases the lock. */ }
  }
  await client.end();
}
