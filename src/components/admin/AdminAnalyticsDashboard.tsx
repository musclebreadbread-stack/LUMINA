import Link from "next/link";
import { signOutAdmin } from "@/app/admin/actions";
import type { AdminTrackedAnalysis } from "@/lib/adminAnalytics";
import type {
  AdminAnalyticsSnapshot,
  AnalyticsSummaryMetric,
  EventMetric,
  SolutionMetric,
} from "@/server/admin/analytics/types";

export interface AdminAnalyticsLabels {
  readonly title: string;
  readonly description: string;
  readonly period: string;
  readonly preset: string;
  readonly today: string;
  readonly last7: string;
  readonly last30: string;
  readonly last90: string;
  readonly custom: string;
  readonly from: string;
  readonly to: string;
  readonly apply: string;
  readonly allSolutions: string;
  readonly overview: string;
  readonly visitors: string;
  readonly pageviews: string;
  readonly entries: string;
  readonly completions: string;
  readonly results: string;
  readonly shares: string;
  readonly comparedToPrevious: string;
  readonly noComparison: string;
  readonly trafficTrend: string;
  readonly trafficDescription: string;
  readonly date: string;
  readonly eventCount: string;
  readonly solutionUsage: string;
  readonly solutionUsageDescription: string;
  readonly funnel: string;
  readonly funnelDescription: string;
  readonly funnelEntry: string;
  readonly funnelCompletion: string;
  readonly funnelResult: string;
  readonly funnelShare: string;
  readonly completionRate: string;
  readonly resultRate: string;
  readonly noData: string;
  readonly source: string;
  readonly sourceLive: string;
  readonly sourceRollup: string;
  readonly sourceEmpty: string;
  readonly sourceUnavailable: string;
  readonly freshness: string;
  readonly live: string;
  readonly fresh: string;
  readonly stale: string;
  readonly unavailable: string;
  readonly lastUpdated: string;
  readonly coverage: string;
  readonly partialNote: string;
  readonly dataHealth: string;
  readonly configureSource: string;
  readonly migrationRequired: string;
  readonly approximateVisitors: string;
  readonly events: string;
  readonly count: string;
  readonly signOut: string;
  readonly backHome: string;
  readonly analysis: Readonly<Record<AdminTrackedAnalysis, string>>;
}

interface DashboardProps {
  readonly snapshot: AdminAnalyticsSnapshot;
  readonly labels: AdminAnalyticsLabels;
  readonly locale: string;
}

function numberFormat(locale: string, value: number): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR").format(value);
}

function dateFormat(locale: string, value: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function dateTimeFormat(locale: string, value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function MetricCard({
  label,
  metric,
  locale,
  comparisonLabel,
  noComparisonLabel,
}: {
  readonly label: string;
  readonly metric: AnalyticsSummaryMetric;
  readonly locale: string;
  readonly comparisonLabel: string;
  readonly noComparisonLabel: string;
}) {
  const change = metric.changePercent;
  return (
    <article className="border border-ink-700 bg-ink-900/65 p-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-hobun-faint">{label}</p>
      <p className="mt-3 font-mono text-3xl tabular-nums text-hobun">{numberFormat(locale, metric.value)}</p>
      <p className="mt-3 text-xs text-hobun-dim">
        {change === null ? noComparisonLabel : `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${Math.abs(change).toFixed(1)}% ${comparisonLabel}`}
      </p>
    </article>
  );
}

function TrafficTrend({ snapshot, labels, locale }: DashboardProps) {
  const width = 720;
  const height = 220;
  const chartLeft = 28;
  const chartRight = 692;
  const chartTop = 20;
  const chartBottom = 184;
  const maxValue = Math.max(...snapshot.trafficSeries.flatMap((point) => [point.pageviews, point.visitors]), 1);
  const pointFor = (value: number, index: number): string => {
    const divisor = Math.max(snapshot.trafficSeries.length - 1, 1);
    const x = chartLeft + ((chartRight - chartLeft) * index) / divisor;
    const y = chartBottom - ((chartBottom - chartTop) * value) / maxValue;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const pageviewPoints = snapshot.trafficSeries.map((point, index) => pointFor(point.pageviews, index)).join(" ");
  const visitorPoints = snapshot.trafficSeries.map((point, index) => pointFor(point.visitors, index)).join(" ");
  const chartTitle = `${labels.trafficTrend} · ${snapshot.range.startDate}–${snapshot.range.endDate}`;

  return (
    <section className="border border-ink-700 bg-ink-900/55 p-5 sm:p-7" aria-labelledby="admin-traffic-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admin-traffic-title" className="text-xl font-semibold text-hobun">{labels.trafficTrend}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hobun-dim">{labels.trafficDescription}</p>
        </div>
        <div className="flex gap-4 text-xs text-hobun-faint" aria-label={labels.events}>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-hobun" aria-hidden />{labels.pageviews}</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-300" aria-hidden />{labels.visitors}</span>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <svg className="h-auto min-w-[620px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="admin-traffic-chart-title">
          <title id="admin-traffic-chart-title">{chartTitle}</title>
          <line x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} stroke="currentColor" className="text-ink-600" />
          <line x1={chartLeft} x2={chartRight} y1={chartTop} y2={chartTop} stroke="currentColor" className="text-ink-800" />
          <polyline points={pageviewPoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-hobun" />
          <polyline points={visitorPoints} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 6" className="text-teal-300" />
          {snapshot.trafficSeries.map((point, index) => (
            <text key={point.date} x={pointFor(0, index).split(",")[0]} y="207" textAnchor="middle" className="fill-hobun-faint font-mono text-[10px]">
              {dateFormat(locale, point.date)}
            </text>
          ))}
        </svg>
      </div>
      <details className="mt-5 border-t border-ink-800 pt-4">
        <summary className="cursor-pointer text-xs text-hobun-dim">{labels.events} {labels.count}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-xs">
            <thead className="border-b border-ink-700 text-hobun-faint">
              <tr><th className="py-2 pr-4 font-normal">{labels.date}</th><th className="py-2 pr-4 font-normal">{labels.pageviews}</th><th className="py-2 font-normal">{labels.visitors}</th></tr>
            </thead>
            <tbody>
              {snapshot.trafficSeries.map((point) => (
                <tr key={point.date} className="border-b border-ink-800 text-hobun-dim">
                  <td className="py-2 pr-4">{dateFormat(locale, point.date)}</td>
                  <td className="py-2 pr-4 tabular-nums">{numberFormat(locale, point.pageviews)}</td>
                  <td className="py-2 tabular-nums">{numberFormat(locale, point.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Sparkline({ values, label }: { readonly values: readonly number[]; readonly label: string }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 28 - (value / max) * 24;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24 text-hobun" role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SolutionUsage({ snapshot, labels, locale }: DashboardProps) {
  const sorted = [...snapshot.solutions].sort((left, right) => right.entryCount - left.entryCount);
  return (
    <section className="border border-ink-700 bg-ink-900/55 p-5 sm:p-7" aria-labelledby="admin-solutions-title">
      <h2 id="admin-solutions-title" className="text-xl font-semibold text-hobun">{labels.solutionUsage}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hobun-dim">{labels.solutionUsageDescription}</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="border-b border-ink-700 text-xs text-hobun-faint">
            <tr>
              <th className="py-3 pr-4 font-normal">{labels.solutionUsage}</th>
              <th className="py-3 pr-4 font-normal">{labels.entries}</th>
              <th className="py-3 pr-4 font-normal">{labels.completions}</th>
              <th className="py-3 pr-4 font-normal">{labels.results}</th>
              <th className="py-3 pr-4 font-normal">{labels.completionRate}</th>
              <th className="py-3 font-normal">{labels.resultRate}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((solution) => (
              <SolutionRow key={solution.analysis} solution={solution} labels={labels} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SolutionRow({ solution, labels, locale }: { readonly solution: SolutionMetric; readonly labels: AdminAnalyticsLabels; readonly locale: string }) {
  const name = labels.analysis[solution.analysis];
  return (
    <tr className="border-b border-ink-800 text-hobun-dim">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <span className="min-w-28 font-medium text-hobun">{name}</span>
          <Sparkline values={solution.trend} label={`${name} ${labels.entries}`} />
        </div>
      </td>
      <td className="py-3 pr-4 tabular-nums">{numberFormat(locale, solution.entryCount)}</td>
      <td className="py-3 pr-4 tabular-nums">{numberFormat(locale, solution.completionCount)}</td>
      <td className="py-3 pr-4 tabular-nums">{numberFormat(locale, solution.resultCount)}</td>
      <td className="py-3 pr-4 tabular-nums">{solution.completionRate === null ? "—" : `${solution.completionRate.toFixed(1)}%`}</td>
      <td className="py-3 tabular-nums">{solution.resultRate === null ? "—" : `${solution.resultRate.toFixed(1)}%`}</td>
    </tr>
  );
}

function sumSolutionMetric(solutions: readonly SolutionMetric[], field: "entryCount" | "completionCount" | "resultCount" | "shareCount"): number {
  return solutions.reduce((total, solution) => total + solution[field], 0);
}

function eventCount(metrics: readonly EventMetric[], eventName: string): number {
  return metrics.filter((metric) => metric.eventName === eventName).reduce((total, metric) => total + metric.count, 0);
}

function Funnel({ snapshot, labels, locale }: DashboardProps) {
  const selectedSolutions = snapshot.selectedSolution === "all"
    ? snapshot.solutions
    : snapshot.solutions.filter((solution) => solution.analysis === snapshot.selectedSolution);
  const entries = snapshot.selectedSolution === "all"
    ? sumSolutionMetric(selectedSolutions, "entryCount")
    : eventCount(snapshot.selectedSolutionSeries, "solution_entry");
  const completions = snapshot.selectedSolution === "all"
    ? sumSolutionMetric(selectedSolutions, "completionCount")
    : eventCount(snapshot.selectedSolutionSeries, "test_complete");
  const results = snapshot.selectedSolution === "all"
    ? sumSolutionMetric(selectedSolutions, "resultCount")
    : eventCount(snapshot.selectedSolutionSeries, "result_view");
  const shares = snapshot.selectedSolution === "all"
    ? sumSolutionMetric(selectedSolutions, "shareCount")
    : eventCount(snapshot.selectedSolutionSeries, "share_open");
  const stages = [
    { label: labels.funnelEntry, value: entries },
    { label: labels.funnelCompletion, value: completions },
    { label: labels.funnelResult, value: results },
    { label: labels.funnelShare, value: shares },
  ];
  const max = Math.max(...stages.map((stage) => stage.value), 1);
  const selectedLabel = snapshot.selectedSolution === "all" ? labels.allSolutions : labels.analysis[snapshot.selectedSolution];

  return (
    <section className="border border-ink-700 bg-ink-900/55 p-5 sm:p-7" aria-labelledby="admin-funnel-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admin-funnel-title" className="text-xl font-semibold text-hobun">{labels.funnel} · {selectedLabel}</h2>
          <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{labels.funnelDescription}</p>
        </div>
        <Link href="/admin/analytics" className="text-xs text-hobun-dim underline underline-offset-4 hover:text-hobun">{labels.allSolutions}</Link>
      </div>
      <div className="mt-6 space-y-4">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-hobun-dim">{stage.label}</span>
              <span className="font-mono tabular-nums text-hobun">{numberFormat(locale, stage.value)}</span>
            </div>
            <div className="h-3 bg-ink-800" role="meter" aria-label={stage.label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={stage.value}>
              <div className="h-full bg-hobun transition-[width]" style={{ width: `${Math.max((stage.value / max) * 100, stage.value > 0 ? 3 : 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HealthPanel({ snapshot, labels, locale }: DashboardProps) {
  const sourceLabel = snapshot.source === "vercel-live"
    ? labels.sourceLive
    : snapshot.source === "neon-rollup"
      ? labels.sourceRollup
      : snapshot.source === "empty" ? labels.sourceEmpty : labels.sourceUnavailable;
  const freshnessLabel = snapshot.freshness === "live"
    ? labels.live
    : snapshot.freshness === "fresh"
      ? labels.fresh
      : snapshot.freshness === "stale" ? labels.stale : labels.unavailable;
  return (
    <section className="border border-ink-700 bg-ink-900/55 p-5 sm:p-7" aria-labelledby="admin-health-title">
      <h2 id="admin-health-title" className="text-xl font-semibold text-hobun">{labels.dataHealth}</h2>
      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <HealthItem label={labels.source} value={sourceLabel} />
        <HealthItem label={labels.freshness} value={freshnessLabel} />
        <HealthItem label={labels.lastUpdated} value={dateTimeFormat(locale, snapshot.health.lastSyncAt)} />
        <HealthItem label={labels.coverage} value={snapshot.health.coverageStart && snapshot.health.coverageEnd ? `${snapshot.health.coverageStart}–${snapshot.health.coverageEnd}` : "—"} />
      </div>
      {snapshot.source === "neon-rollup" && <p className="mt-5 border-l border-amber-300/50 pl-3 text-xs leading-relaxed text-amber-100">{labels.approximateVisitors}</p>}
      {snapshot.health.message !== null && <p className="mt-5 border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">{snapshot.health.message}</p>}
      {snapshot.freshness === "stale" && <p className="mt-3 text-xs leading-relaxed text-amber-100">{labels.partialNote}</p>}
      {!snapshot.health.sourceConfigured && <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{labels.configureSource}</p>}
      {snapshot.source === "unavailable" && <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{labels.migrationRequired}</p>}
    </section>
  );
}

function HealthItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-ink-800 bg-ink-950/50 p-4">
      <p className="font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{label}</p>
      <p className="mt-2 break-words text-sm text-hobun">{value}</p>
    </div>
  );
}

export function AdminAnalyticsDashboard({ snapshot, labels, locale }: DashboardProps) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-ink-700 py-10 sm:py-14">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-hobun-faint">LUMINA / OPERATIONS ANALYTICS</p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,4rem)] font-semibold tracking-[-0.05em] text-hobun">{labels.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-hobun-dim">{labels.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-hobun-dim underline underline-offset-4 hover:text-hobun">{labels.backHome}</Link>
          <form action={signOutAdmin}>
            <button type="submit" className="border border-ink-600 px-3 py-2 text-xs text-hobun-dim transition-colors hover:border-hobun hover:text-hobun">{labels.signOut}</button>
          </form>
        </div>
      </div>

      <form method="get" action="/admin/analytics" className="mt-8 grid gap-4 border border-ink-700 bg-ink-900/45 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="space-y-2">
          <span className="block font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{labels.preset}</span>
          <select name="preset" defaultValue={snapshot.query.preset} className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun outline-none focus:border-hobun">
            <option value="today">{labels.today}</option>
            <option value="7d">{labels.last7}</option>
            <option value="30d">{labels.last30}</option>
            <option value="90d">{labels.last90}</option>
            <option value="custom">{labels.custom}</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="block font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{labels.from}</span>
          <input type="date" name="from" defaultValue={snapshot.query.from ?? ""} className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun outline-none focus:border-hobun" />
        </label>
        <label className="space-y-2">
          <span className="block font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{labels.to}</span>
          <input type="date" name="to" defaultValue={snapshot.query.to ?? ""} className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun outline-none focus:border-hobun" />
        </label>
        <label className="space-y-2">
          <span className="block font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{labels.solutionUsage}</span>
          <select name="solution" defaultValue={snapshot.query.solution} className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun outline-none focus:border-hobun">
            <option value="all">{labels.allSolutions}</option>
            {Object.entries(labels.analysis).filter(([key]) => key !== "integrated-report").map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 bg-hobun px-5 py-3 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-85">{labels.apply}</button>
      </form>

      <p className="mt-5 text-xs text-hobun-faint">{labels.period}: {snapshot.range.startDate}–{snapshot.range.endDate} · Asia/Seoul</p>

      <section className="mt-6" aria-labelledby="admin-overview-title">
        <h2 id="admin-overview-title" className="sr-only">{labels.overview}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label={labels.visitors} metric={snapshot.summary.visitors} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
          <MetricCard label={labels.pageviews} metric={snapshot.summary.pageviews} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
          <MetricCard label={labels.entries} metric={snapshot.summary.entries} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
          <MetricCard label={labels.completions} metric={snapshot.summary.completions} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
          <MetricCard label={labels.results} metric={snapshot.summary.results} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
          <MetricCard label={labels.shares} metric={snapshot.summary.shares} locale={locale} comparisonLabel={labels.comparedToPrevious} noComparisonLabel={labels.noComparison} />
        </div>
      </section>

      <div className="mt-6 space-y-6">
        <TrafficTrend snapshot={snapshot} labels={labels} locale={locale} />
        <SolutionUsage snapshot={snapshot} labels={labels} locale={locale} />
        <Funnel snapshot={snapshot} labels={labels} locale={locale} />
        <HealthPanel snapshot={snapshot} labels={labels} locale={locale} />
      </div>
    </main>
  );
}
