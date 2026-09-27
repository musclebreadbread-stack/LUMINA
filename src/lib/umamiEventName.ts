import {
  isAdminEventName,
  isAdminTrackedAnalysis,
  type AdminTrackedAnalysis,
} from "./adminAnalytics";
import type { AnalyticsEventName } from "./analytics";

export interface ParsedUmamiEventName {
  readonly eventName: AnalyticsEventName;
  readonly analysis: AdminTrackedAnalysis;
}

export function buildUmamiEventName(name: AnalyticsEventName, analysis: AdminTrackedAnalysis): string {
  return `${name}__${analysis}`;
}

export function parseUmamiEventName(value: string): ParsedUmamiEventName | null {
  const separator = value.lastIndexOf("__");
  if (separator <= 0 || separator === value.length - 2) return null;
  const eventName = value.slice(0, separator);
  const analysis = value.slice(separator + 2);
  if (!isAdminEventName(eventName) || !isAdminTrackedAnalysis(analysis)) return null;
  return Object.freeze({ eventName, analysis }) as ParsedUmamiEventName;
}
