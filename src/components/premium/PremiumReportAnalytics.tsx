"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { trackPremiumReportEvent } from "@/lib/premiumReportAnalytics";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from "@/lib/consent";

export function PremiumReportViewTracker() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const tracked = useRef(false);

  useEffect(() => {
    if (consent === null || tracked.current) return;
    tracked.current = true;
    trackPremiumReportEvent("premium_report_view");
  }, [consent]);

  return null;
}

interface PremiumReportFreeAnalysisLinkProps {
  readonly children: ReactNode;
  readonly className: string;
}

export function PremiumReportFreeAnalysisLink({
  children,
  className,
}: PremiumReportFreeAnalysisLinkProps) {
  return (
    <Link
      href="/saju"
      className={className}
      onClick={() => trackPremiumReportEvent("premium_report_free_analysis_click")}
    >
      {children}
    </Link>
  );
}
