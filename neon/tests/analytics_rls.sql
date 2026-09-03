-- Execute on a disposable Neon branch after the analytics migration.
-- The checks switch from an owner connection to lumina_cognitive_app so the
-- viewer policy is exercised through the same NOBYPASSRLS boundary as runtime.

begin;
set local role neondb_owner;

insert into ops.admin_members (user_id, role, active)
values ('analytics-viewer-test', 'viewer', true)
on conflict (user_id) do update
set role = excluded.role, active = excluded.active;

insert into ops.admin_members (user_id, role, active)
values ('analytics-analyst-test', 'analyst', true)
on conflict (user_id) do update
set role = excluded.role, active = excluded.active;

insert into ops.daily_traffic_metrics
  (metric_date, environment, pageviews, visitors, source, coverage_start, coverage_end)
values
  ('2026-09-01', 'production', 1, 1, 'manual-import', '2026-09-01T00:00:00Z', '2026-09-01T23:59:59Z');

insert into ops.daily_solution_events
  (metric_date, environment, analysis_key, event_name, event_count, visitors, source)
values
  ('2026-09-01', 'production', 'saju', 'solution_entry', 1, 1, 'manual-import');

insert into ops.analytics_sync_runs
  (source, requested_since, requested_until, status, rows_written, finished_at)
values
  ('vercel-web-analytics', '2026-09-01', '2026-09-01', 'succeeded', 2, '2026-09-02T00:00:00Z');

set local role lumina_cognitive_app;
select set_config('app.current_auth_user_id', 'analytics-viewer-test', true);

do $$
declare
  visible_traffic integer;
  visible_events integer;
  visible_sync_runs integer;
begin
  select count(*) into visible_traffic from ops.daily_traffic_metrics;
  select count(*) into visible_events from ops.daily_solution_events;
  select count(*) into visible_sync_runs from ops.analytics_sync_runs;
  if visible_traffic <> 1 or visible_events <> 1 or visible_sync_runs <> 1 then
    raise exception 'viewer should see aggregate rows and sync metadata, got traffic %, events %, sync runs %',
      visible_traffic, visible_events, visible_sync_runs;
  end if;
end
$$;

select set_config('app.current_auth_user_id', 'analytics-analyst-test', true);

do $$
declare
  visible_sync_runs integer;
begin
  select count(*) into visible_sync_runs from ops.analytics_sync_runs;
  if visible_sync_runs <> 1 then
    raise exception 'analyst should see sync metadata, got %', visible_sync_runs;
  end if;
end
$$;

rollback;
