import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAnalyticsDashboard, type AdminAnalyticsLabels } from "@/components/admin/AdminAnalyticsDashboard";
import { ADMIN_TRACKED_ANALYSIS_KEYS, parseAnalyticsQuery } from "@/lib/adminAnalytics";
import { getAdminAccess } from "@/server/admin/authorization";
import { loadAdminAnalytics } from "@/server/admin/analytics/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAnalytics");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const access = await getAdminAccess();
  if (access.status === "unauthenticated") redirect("/admin/login");
  const [t, locale] = await Promise.all([getTranslations("adminAnalytics"), getLocale()]);

  if (access.status !== "authorized") {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-8">
        <section className="border border-ink-700 bg-ink-900/70 p-6 sm:p-8" aria-labelledby="admin-access-title">
          <h1 id="admin-access-title" className="text-2xl font-semibold text-hobun">{t("accessDeniedTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("accessDeniedBody")}</p>
        </section>
      </main>
    );
  }

  const query = parseAnalyticsQuery(await searchParams);
  const snapshot = await loadAdminAnalytics(query);
  const analysis = Object.fromEntries(
    ADMIN_TRACKED_ANALYSIS_KEYS.map((key) => [key, key === "integrated-report" ? t("integratedReport") : t(`analysis.${key}`)]),
  ) as AdminAnalyticsLabels["analysis"];
  const labels: AdminAnalyticsLabels = {
    title: t("title"),
    description: t("description"),
    period: t("period"),
    preset: t("preset"),
    today: t("today"),
    last7: t("last7"),
    last30: t("last30"),
    last90: t("last90"),
    custom: t("custom"),
    from: t("from"),
    to: t("to"),
    apply: t("apply"),
    allSolutions: t("allSolutions"),
    overview: t("overview"),
    visitors: t("visitors"),
    pageviews: t("pageviews"),
    entries: t("entries"),
    completions: t("completions"),
    results: t("results"),
    shares: t("shares"),
    comparedToPrevious: t("comparedToPrevious"),
    noComparison: t("noComparison"),
    trafficTrend: t("trafficTrend"),
    trafficDescription: t("trafficDescription"),
    date: t("date"),
    eventCount: t("eventCount"),
    solutionUsage: t("solutionUsage"),
    solutionUsageDescription: t("solutionUsageDescription"),
    funnel: t("funnel"),
    funnelDescription: t("funnelDescription"),
    funnelEntry: t("funnelEntry"),
    funnelCompletion: t("funnelCompletion"),
    funnelResult: t("funnelResult"),
    funnelShare: t("funnelShare"),
    completionRate: t("completionRate"),
    resultRate: t("resultRate"),
    noData: t("noData"),
    source: t("source"),
    sourceLive: t("sourceLive"),
    sourceRollup: t("sourceRollup"),
    sourceEmpty: t("sourceEmpty"),
    sourceUnavailable: t("sourceUnavailable"),
    freshness: t("freshness"),
    live: t("live"),
    fresh: t("fresh"),
    stale: t("stale"),
    unavailable: t("unavailable"),
    lastUpdated: t("lastUpdated"),
    coverage: t("coverage"),
    partialNote: t("partialNote"),
    dataHealth: t("dataHealth"),
    configureSource: t("configureSource"),
    migrationRequired: t("migrationRequired"),
    approximateVisitors: t("approximateVisitors"),
    events: t("events"),
    count: t("count"),
    signOut: t("signOut"),
    backHome: t("backHome"),
    analysis,
  };

  return <AdminAnalyticsDashboard snapshot={snapshot} labels={labels} locale={locale} />;
}
