-- Privacy-safe operations analytics for the LUMINA admin console.
-- This migration stores only aggregate traffic/event rollups; it does not store
-- raw URLs, query strings, survey responses, birth data, share codes, or subject IDs.
-- Apply with the reviewed unpooled admin connection only after staging validation.

begin;

create schema if not exists ops;

create or replace function app.current_auth_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.current_auth_user_id', true), '')
$$;

create table if not exists ops.admin_members (
  user_id text primary key check (length(user_id) between 1 and 128),
  role text not null check (role in ('viewer', 'analyst', 'owner')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ops.daily_traffic_metrics (
  metric_date date not null,
  environment text not null default 'production' check (length(environment) between 1 and 32),
  pageviews bigint not null check (pageviews >= 0),
  visitors bigint not null check (visitors >= 0),
  source text not null check (source in ('vercel-web-analytics', 'manual-import')),
  coverage_start timestamptz not null,
  coverage_end timestamptz not null,
  collected_at timestamptz not null default now(),
  primary key (metric_date, environment),
  check (coverage_end >= coverage_start)
);

create table if not exists ops.daily_solution_events (
  metric_date date not null,
  environment text not null default 'production' check (length(environment) between 1 and 32),
  analysis_key text not null check (analysis_key in (
    'saju', 'astro', 'tarot', 'numerology', 'psychometrics', 'jungian',
    'darktriad', 'attachment', 'eq', 'cognitive', 'horoscope', 'compatibility', 'integrated-report'
  )),
  event_name text not null check (event_name in (
    'solution_entry', 'test_start', 'test_complete', 'result_view',
    'share_open', 'share_image_saved', 'compatibility_compare',
    'integrated_report_view', 'share_landing_view', 'share_landing_cta'
  )),
  event_count bigint not null check (event_count >= 0),
  visitors bigint not null check (visitors >= 0),
  source text not null check (source in ('vercel-web-analytics', 'manual-import')),
  collected_at timestamptz not null default now(),
  primary key (metric_date, environment, analysis_key, event_name)
);

create table if not exists ops.analytics_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'vercel-web-analytics'),
  requested_since date not null,
  requested_until date not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  rows_written integer not null default 0 check (rows_written >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (requested_until >= requested_since),
  check ((status = 'running' and finished_at is null) or status <> 'running')
);

create index if not exists analytics_sync_runs_started_idx
  on ops.analytics_sync_runs (started_at desc);

create table if not exists ops.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text not null check (length(actor_user_id) between 1 and 128),
  action text not null check (action in ('view_analytics', 'run_sync', 'export_analytics')),
  range_start date,
  range_end date,
  created_at timestamptz not null default now(),
  check (range_end is null or range_start is not null),
  check (range_start is null or range_end >= range_start)
);

alter table ops.admin_members enable row level security;
alter table ops.admin_members force row level security;
alter table ops.daily_traffic_metrics enable row level security;
alter table ops.daily_traffic_metrics force row level security;
alter table ops.daily_solution_events enable row level security;
alter table ops.daily_solution_events force row level security;
alter table ops.analytics_sync_runs enable row level security;
alter table ops.analytics_sync_runs force row level security;
alter table ops.admin_audit_log enable row level security;
alter table ops.admin_audit_log force row level security;

create or replace function app.current_admin_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, app, ops
as $$
  select role
    from ops.admin_members
   where user_id = app.current_auth_user_id()
     and active = true
   limit 1
$$;

drop policy if exists admin_member_self_read on ops.admin_members;
create policy admin_member_self_read on ops.admin_members
  for select to lumina_cognitive_app
  using (user_id = app.current_auth_user_id());

drop policy if exists traffic_admin_read on ops.daily_traffic_metrics;
create policy traffic_admin_read on ops.daily_traffic_metrics
  for select to lumina_cognitive_app
  using (app.current_admin_role() in ('viewer', 'analyst', 'owner'));

drop policy if exists solution_events_admin_read on ops.daily_solution_events;
create policy solution_events_admin_read on ops.daily_solution_events
  for select to lumina_cognitive_app
  using (app.current_admin_role() in ('viewer', 'analyst', 'owner'));

drop policy if exists sync_runs_admin_read on ops.analytics_sync_runs;
-- Sync rows contain operational metadata only; every analytics reader needs
-- this policy so the dashboard HealthPanel is not blank for viewers.
create policy sync_runs_admin_read on ops.analytics_sync_runs
  for select to lumina_cognitive_app
  using (app.current_admin_role() in ('viewer', 'analyst', 'owner'));

drop policy if exists audit_log_admin_read on ops.admin_audit_log;
create policy audit_log_admin_read on ops.admin_audit_log
  for select to lumina_cognitive_app
  using (app.current_admin_role() in ('analyst', 'owner'));

drop policy if exists audit_log_admin_insert on ops.admin_audit_log;
create policy audit_log_admin_insert on ops.admin_audit_log
  for insert to lumina_cognitive_app
  with check (
    actor_user_id = app.current_auth_user_id()
    and app.current_admin_role() in ('viewer', 'analyst', 'owner')
  );

revoke all on schema ops from public;
revoke all on all tables in schema ops from public;
revoke all on function app.current_auth_user_id() from public;
revoke all on function app.current_admin_role() from public;

grant usage on schema ops to lumina_cognitive_app;
grant execute on function app.current_auth_user_id() to lumina_cognitive_app;
grant execute on function app.current_admin_role() to lumina_cognitive_app;
grant select on ops.admin_members, ops.daily_traffic_metrics, ops.daily_solution_events, ops.analytics_sync_runs to lumina_cognitive_app;
grant select, insert on ops.admin_audit_log to lumina_cognitive_app;

commit;
