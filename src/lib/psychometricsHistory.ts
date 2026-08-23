import { decodeResponses, encodeResponses } from "./psychometricsCode";
import type { ResponseMap } from "@engine/psychometrics/scoring";

/** 재검사 비교를 위한 브라우저 전용 이력. 서버에는 전송하지 않는다. */
const STORAGE_KEY = "lumina.psychometrics.history.v1";
const MAX_ENTRIES = 5;

export interface PsychometricsHistoryEntry {
  readonly code: string;
  readonly completedAt: string;
}

function isEntry(value: unknown): value is PsychometricsHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.code === "string" &&
    /^[1-5]{50}$/.test(record.code) &&
    typeof record.completedAt === "string"
  );
}

export function loadPsychometricsHistory(): readonly PsychometricsHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Object.freeze(parsed.filter(isEntry).slice(0, MAX_ENTRIES));
  } catch {
    return [];
  }
}

export function savePsychometricsResult(responses: ResponseMap, completedAt = new Date().toISOString()): void {
  if (typeof window === "undefined") return;
  const code = encodeResponses(responses);
  const previous = loadPsychometricsHistory();
  const next = [
    { code, completedAt },
    ...previous.filter((entry) => entry.code !== code),
  ].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 사생활 보호 모드나 저장 용량 부족이어도 현재 결과는 계속 볼 수 있다.
  }
}

export function previousDistinctResponses(
  currentCode: string,
): { readonly entry: PsychometricsHistoryEntry; readonly responses: ResponseMap } | null {
  const previous = loadPsychometricsHistory().find((entry) => entry.code !== currentCode);
  if (!previous) return null;
  const responses = decodeResponses(previous.code);
  return responses ? { entry: previous, responses } : null;
}
