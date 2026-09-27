import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import koMessages from "../../../messages/ko.json";
import { previousAnalyticsDateRange, resolveAnalyticsDateRange } from "@/lib/adminAnalytics";
import type { AdminAnalyticsSnapshot } from "@/server/admin/analytics/types";
import { AdminAnalyticsDashboard, type AdminAnalyticsLabels } from "./AdminAnalyticsDashboard";

vi.mock("@/app/admin/actions", () => ({
  signOutAdmin: async () => undefined,
}));

const labelsByLocale = {
  en: {
    ...enMessages.adminAnalytics,
    analysis: {
      ...enMessages.adminAnalytics.analysis,
      "integrated-report": enMessages.adminAnalytics.integratedReport,
    },
  },
  ko: {
    ...koMessages.adminAnalytics,
    analysis: {
      ...koMessages.adminAnalytics.analysis,
      "integrated-report": koMessages.adminAnalytics.integratedReport,
    },
  },
} satisfies Record<"en" | "ko", AdminAnalyticsLabels>;

function renderedParagraphs(markup: string): string[] {
  return Array.from(markup.matchAll(/<p\b[^>]*>(.*?)<\/p>/gs), (match) => match[1] ?? "");
}

function unavailableSnapshot(sourceConfigured: boolean): AdminAnalyticsSnapshot {
  const query = { preset: "7d", from: null, to: null, solution: "all" } as const;
  const range = resolveAnalyticsDateRange(query, new Date("2026-09-27T04:59:00.000Z"));
  const metric = { value: 0, previousValue: null, changePercent: null } as const;

  return {
    query,
    range,
    previousRange: previousAnalyticsDateRange(range),
    source: "unavailable",
    freshness: "unavailable",
    generatedAt: "2026-09-27T04:59:00.000Z",
    summary: {
      visitors: metric,
      pageviews: metric,
      entries: metric,
      completions: metric,
      results: metric,
      shares: metric,
    },
    trafficSeries: [],
    solutions: [],
    selectedSolution: "all",
    selectedSolutionSeries: [],
    eventTrend: [],
    health: {
      sourceConfigured,
      rollupAvailable: false,
      lastSyncAt: null,
      coverageStart: null,
      coverageEnd: null,
      sourceChangeDate: null,
      message: "Analytics rollups could not be loaded from Neon.",
    },
  };
}

function premiumFunnelSnapshot(selectedSolution: AdminAnalyticsSnapshot["selectedSolution"]): AdminAnalyticsSnapshot {
  return {
    ...unavailableSnapshot(true),
    selectedSolution,
    selectedSolutionSeries: [
      { analysis: "saju", eventName: "premium_report_view", count: 120, visitors: 80 },
      { analysis: "saju", eventName: "premium_report_free_analysis_click", count: 30, visitors: 26 },
      { analysis: "saju", eventName: "premium_report_checkout_start", count: 8, visitors: 7 },
    ],
  };
}

describe("AdminAnalyticsDashboard unavailable rollup notices", () => {
  it("renders one Korean rollup error and keeps the Umami setup hint separate", () => {
    const labels = labelsByLocale.ko;
    const markup = renderToStaticMarkup(
      <AdminAnalyticsDashboard snapshot={unavailableSnapshot(false)} labels={labels} locale="ko" />,
    );

    expect(markup.split(labels.rollupUnavailable)).toHaveLength(2);
    expect(markup).not.toContain("Analytics rollups could not be loaded from Neon.");
    expect(markup).toContain(labels.configureSource);
    const paragraphs = renderedParagraphs(markup);
    const noticeParagraphs = paragraphs.filter((paragraph) => paragraph.includes(labels.rollupUnavailable));
    const setupParagraphs = paragraphs.filter((paragraph) => paragraph.includes(labels.configureSource));
    expect(noticeParagraphs).toHaveLength(1);
    expect(setupParagraphs).toHaveLength(1);
    expect(noticeParagraphs[0]).not.toBe(setupParagraphs[0]);
  });

  it("renders one English rollup error without an Umami setup hint when configured", () => {
    const labels = labelsByLocale.en;
    const markup = renderToStaticMarkup(
      <AdminAnalyticsDashboard snapshot={unavailableSnapshot(true)} labels={labels} locale="en" />,
    );

    expect(markup.split(labels.rollupUnavailable)).toHaveLength(2);
    expect(markup).not.toContain("Analytics rollups could not be loaded from Neon.");
    expect(markup).not.toContain(labels.configureSource);
  });
});

describe("AdminAnalyticsDashboard premium report funnel", () => {
  it("shows funnel event counts for all solutions", () => {
    const labels = labelsByLocale.en;
    const markup = renderToStaticMarkup(
      <AdminAnalyticsDashboard snapshot={premiumFunnelSnapshot("all")} labels={labels} locale="en" />,
    );

    expect(markup).toContain(labels.premiumFunnel);
    expect(markup).toContain(labels.premiumReportViews);
    expect(markup).toContain(labels.premiumFreeAnalysisClicks);
    expect(markup).toContain(labels.premiumCheckoutStarts);
    expect(markup).toContain(">120<");
    expect(markup).toContain(">30<");
    expect(markup).toContain(">8<");
  });

  it("hides the product funnel when another solution is selected", () => {
    const labels = labelsByLocale.en;
    const markup = renderToStaticMarkup(
      <AdminAnalyticsDashboard snapshot={premiumFunnelSnapshot("astro")} labels={labels} locale="en" />,
    );

    expect(markup).not.toContain(labels.premiumFunnel);
  });
});
