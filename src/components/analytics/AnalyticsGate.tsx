"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from "@/lib/consent";
import { flushPendingAnalyticsEvents } from "@/lib/analytics";
import { scrubAnalyticsUrl } from "@/lib/analyticsScrub";
import { initSentryClient } from "@/lib/sentryClient";

const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

function safeUmamiScriptUrl(): string | null {
  if (!scriptUrl || !websiteId) return null;
  try {
    const parsed = new URL(scriptUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return null;
    }
    if (!parsed.pathname.endsWith("/script.js")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const verifiedScriptUrl = safeUmamiScriptUrl();

/** Loads privacy telemetry only after the visitor has chosen the existing consent setting. */
export function AnalyticsGate() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const pathname = usePathname();
  const [trackerReady, setTrackerReady] = useState(false);

  useEffect(() => {
    if (consent === null) return;
    void initSentryClient();
  }, [consent]);

  useEffect(() => {
    if (consent === null || !trackerReady || !websiteId || window.umami === undefined) return;
    const url = scrubAnalyticsUrl(pathname ?? "/");
    if (url === null) return;
    flushPendingAnalyticsEvents();
    window.umami.track({ website: websiteId, url });
  }, [consent, pathname, trackerReady]);

  if (consent === null || verifiedScriptUrl === null || websiteId === null || websiteId === "") return null;

  return (
    <Script
      src={verifiedScriptUrl}
      strategy="afterInteractive"
      data-website-id={websiteId}
      data-auto-pageview="false"
      onReady={() => setTrackerReady(true)}
    />
  );
}
