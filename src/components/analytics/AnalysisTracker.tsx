"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import { track } from "@/lib/analytics";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from "@/lib/consent";

interface AnalysisTrackerProps {
  readonly analysis: AnalysisKey;
}

function useAnalyticsConsent() {
  return useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
}

export function AnalysisEntryTracker({ analysis }: AnalysisTrackerProps) {
  const consent = useAnalyticsConsent();
  useEffect(() => {
    if (consent === null) return;
    track("solution_entry", { analysis });
  }, [analysis, consent]);

  return null;
}

export function AnalysisResultTracker({ analysis }: AnalysisTrackerProps) {
  const consent = useAnalyticsConsent();
  useEffect(() => {
    if (consent === null) return;
    track("result_view", { analysis });
  }, [analysis, consent]);

  return null;
}

export function IntegratedReportTracker() {
  const consent = useAnalyticsConsent();
  useEffect(() => {
    if (consent === null) return;
    track("integrated_report_view", { analysis: "integrated-report" });
  }, [consent]);

  return null;
}
