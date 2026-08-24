import type { AnalysisKey } from "@engine/shared/evidence";
import type { Locale } from "@/i18n/locale";

export interface AssessmentRunV1<
  TMethod extends AnalysisKey = AnalysisKey,
  TSummary = unknown,
> {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly methodKey: TMethod;
  readonly instrumentVersion: string;
  readonly locale: Locale;
  readonly createdAt: string;
  readonly scoreSummary: TSummary;
}

interface CreateAssessmentRunInput<TMethod extends AnalysisKey, TSummary> {
  readonly methodKey: TMethod;
  readonly instrumentVersion: string;
  readonly locale: Locale;
  readonly scoreSummary: TSummary;
}

type ScoreSummaryGuard<TSummary> = (value: unknown) => value is TSummary;

const STORAGE_PREFIX = "lumina.assessment-run.v1.";
const RUN_ID_PATTERN = /^[a-zA-Z0-9_-]{16,100}$/;

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

function createRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocale(value: unknown): value is Locale {
  return value === "ko" || value === "en";
}

export function createAssessmentRun<TMethod extends AnalysisKey, TSummary>(
  input: CreateAssessmentRunInput<TMethod, TSummary>,
): AssessmentRunV1<TMethod, TSummary> | null {
  if (typeof window === "undefined") return null;

  const run: AssessmentRunV1<TMethod, TSummary> = {
    schemaVersion: 1,
    id: createRunId(),
    methodKey: input.methodKey,
    instrumentVersion: input.instrumentVersion,
    locale: input.locale,
    createdAt: new Date().toISOString(),
    scoreSummary: input.scoreSummary,
  };

  try {
    window.sessionStorage.setItem(storageKey(run.id), JSON.stringify(run));
    return run;
  } catch {
    return null;
  }
}

export function readAssessmentRun<TMethod extends AnalysisKey, TSummary>(
  id: string,
  methodKey: TMethod,
  isScoreSummary: ScoreSummaryGuard<TSummary>,
): AssessmentRunV1<TMethod, TSummary> | null {
  if (typeof window === "undefined" || !RUN_ID_PATTERN.test(id)) return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey(id));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 1 ||
      parsed.id !== id ||
      parsed.methodKey !== methodKey ||
      typeof parsed.instrumentVersion !== "string" ||
      parsed.instrumentVersion.length === 0 ||
      !isLocale(parsed.locale) ||
      typeof parsed.createdAt !== "string" ||
      !isScoreSummary(parsed.scoreSummary)
    ) {
      return null;
    }

    return {
      schemaVersion: 1,
      id,
      methodKey,
      instrumentVersion: parsed.instrumentVersion,
      locale: parsed.locale,
      createdAt: parsed.createdAt,
      scoreSummary: parsed.scoreSummary,
    };
  } catch {
    return null;
  }
}

export function removeAssessmentRun(id: string): void {
  if (typeof window === "undefined" || !RUN_ID_PATTERN.test(id)) return;
  try {
    window.sessionStorage.removeItem(storageKey(id));
  } catch {
    // Storage may be disabled by the browser; there is nothing else to clear.
  }
}

export const ASSESSMENT_RUN_STORAGE_PREFIX = STORAGE_PREFIX;
