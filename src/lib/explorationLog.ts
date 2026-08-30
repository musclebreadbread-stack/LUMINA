import type { AnalysisKey } from "@engine/shared/evidence";
import { ANALYSIS_CATALOG } from "./analysisCatalog";

/**
 * 자기 탐색 기록(Self Atlas).
 *
 * 어떤 분석을 끝까지 열어 봤는지만 이 브라우저에 남긴다. 점수·응답·출생 정보는
 * 절대 넣지 않는다 — 파생 결과는 URL 에만 살고 식별 가능한 값은 저장하지 않는다는
 * 이 플랫폼의 원칙이 여기서도 그대로 적용된다. 서버·쿠키·공유 링크에도 나가지 않는다.
 */
const STORAGE_KEY = "lumina.exploration.v1";

export interface ExplorationEntry {
  /** 카탈로그에 실재하는 분석 키. 읽을 때 검증하고 모르는 키는 조용히 버린다. */
  readonly key: AnalysisKey;
  /** 처음 열어 본 시각(ISO-8601, UTC). 순서를 되살리기 위한 값이지 식별자가 아니다. */
  readonly at: string;
}

const EMPTY_LOG: readonly ExplorationEntry[] = Object.freeze([]);
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedLog: readonly ExplorationEntry[] = EMPTY_LOG;

function isAnalysisKey(value: unknown): value is AnalysisKey {
  return typeof value === "string" && ANALYSIS_CATALOG.some((item) => item.key === value);
}

function parse(raw: string | null): readonly ExplorationEntry[] {
  if (!raw) return EMPTY_LOG;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_LOG;

    const seen = new Map<AnalysisKey, string>();
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      if (!isAnalysisKey(record.key)) continue;
      if (typeof record.at !== "string" || !TIMESTAMP_PATTERN.test(record.at)) continue;
      seen.set(record.key, record.at);
    }

    return Object.freeze([...seen].map(([key, at]) => Object.freeze({ key, at })));
  } catch {
    return EMPTY_LOG;
  }
}

function read(): readonly ExplorationEntry[] {
  if (typeof window === "undefined") return EMPTY_LOG;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedLog;
  cachedRaw = raw;
  cachedLog = parse(raw);
  return cachedLog;
}

export function subscribeExplorationLog(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export function getExplorationLogSnapshot(): readonly ExplorationEntry[] {
  return read();
}

export function getExplorationLogServerSnapshot(): readonly ExplorationEntry[] {
  return EMPTY_LOG;
}

/** 이미 기록된 분석은 다시 쓰지 않는다 — 처음 열어 본 시각을 덮어쓸 이유가 없다. */
export function recordExploration(key: AnalysisKey): void {
  if (!isAnalysisKey(key) || typeof window === "undefined") return;
  const current = read();
  if (current.some((entry) => entry.key === key)) return;

  const next = Object.freeze([
    ...current,
    Object.freeze({ key, at: new Date().toISOString() }),
  ]);

  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedLog = next;
  } catch {
    return;
  }

  listeners.forEach((listener) => listener());
}

export function exploredAnalysisKeys(
  entries: readonly ExplorationEntry[],
): ReadonlySet<AnalysisKey> {
  return new Set(entries.map((entry) => entry.key));
}

export const EXPLORATION_STORAGE_KEY = STORAGE_KEY;
