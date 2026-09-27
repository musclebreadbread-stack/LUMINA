begin;

-- Preserve historical Vercel/manual rows while allowing Railway Umami rollups.
alter table ops.daily_traffic_metrics
  drop constraint if exists daily_traffic_metrics_source_check;
alter table ops.daily_traffic_metrics
  add constraint daily_traffic_metrics_source_check
  check (source in ('vercel-web-analytics', 'manual-import', 'umami'));

alter table ops.daily_solution_events
  drop constraint if exists daily_solution_events_source_check;
alter table ops.daily_solution_events
  add constraint daily_solution_events_source_check
  check (source in ('vercel-web-analytics', 'manual-import', 'umami'));

alter table ops.analytics_sync_runs
  drop constraint if exists analytics_sync_runs_source_check;
alter table ops.analytics_sync_runs
  add constraint analytics_sync_runs_source_check
  check (source in ('vercel-web-analytics', 'umami'));

-- Historical rows remain visible to the worker for replacement/deletion, while
-- every newly written or updated aggregate must be explicitly sourced by Umami.
drop policy if exists daily_traffic_jobs_write on ops.daily_traffic_metrics;
create policy daily_traffic_jobs_write on ops.daily_traffic_metrics
  for all to lumina_jobs_worker
  using (
    environment = 'production'
    and source in ('umami', 'vercel-web-analytics', 'manual-import')
  )
  with check (environment = 'production' and source = 'umami');

drop policy if exists solution_events_jobs_write on ops.daily_solution_events;
create policy solution_events_jobs_write on ops.daily_solution_events
  for all to lumina_jobs_worker
  using (
    environment = 'production'
    and source in ('umami', 'vercel-web-analytics', 'manual-import')
  )
  with check (environment = 'production' and source = 'umami');

drop policy if exists sync_runs_jobs_write on ops.analytics_sync_runs;
create policy sync_runs_jobs_write on ops.analytics_sync_runs
  for all to lumina_jobs_worker
  using (source = 'umami')
  with check (source = 'umami');

commit;
