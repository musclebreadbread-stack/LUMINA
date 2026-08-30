import { itemById } from "@engine/cognitive/items";

/**
 * 인지능력 탐색 임시 저장 — 고른 보기와 문항별 경과 시간을 한 덩어리로 담는다.
 *
 * 왜 시간까지 같이 두는가: 이 검사는 시간을 재되 채점에는 절대 쓰지 않는다(엔진 계약).
 * 그래도 "이 문항에 얼마나 머물렀는지"는 응답자 본인에게 돌려줄 값이므로 응답과 같은 수명을
 * 가져야 한다. URL 코드에는 싣지 않는다 — 이유는 cognitiveCode.ts 헤더 주석에 적어 두었다.
 *
 * 구조는 eqDraft.ts를 그대로 따른다(모듈 수준 listeners, cachedRaw/cachedDraft 메모,
 * 동결된 서버 스냅샷, 모든 저장소 접근을 try/catch로 감싸기).
 */

const STORAGE_KEY = "lumina.cognitive.draft.v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;

/**
 * 한 문항에 기록할 수 있는 시간의 상한(15분).
 *
 * 화면을 켜 둔 채 자리를 비우면 탭이 계속 "보이는" 상태이므로 시야 기반 측정으로도 시간이 쌓인다.
 * 이 값은 "이만큼 생각했다"고 응답자에게 되돌려 줄 숫자라, 사람이 한 문항을 붙들고 있었다고
 * 보기 어려운 구간은 잘라 낸다. 잘린 값이 실제보다 짧을 수는 있어도 거짓으로 길지는 않다.
 */
export const ITEM_ELAPSED_CAP_MS = 15 * 60 * 1000;

export interface CognitiveDraft {
  /** 문항 id → 고른 보기의 색인(0부터). 엔진 ResponseMap과 같은 표현이다. */
  readonly responses: Readonly<Record<number, number>>;
  /** 문항 id → 그 문항 화면에 실제로 머문 시간(ms). 잰 적 없는 문항은 아예 키가 없다. */
  readonly elapsedMsByItem: Readonly<Record<number, number>>;
}

/** 서버 스냅샷이자 "아무것도 없음"의 표준형. 동결돼 있으므로 공유해도 안전하다. */
export const EMPTY_DRAFT: CognitiveDraft = Object.freeze({
  responses: Object.freeze({}),
  elapsedMsByItem: Object.freeze({}),
});

let cachedDraft: CognitiveDraft = EMPTY_DRAFT;

/** 저장된 응답은 문항이 실제로 가진 보기 범위 안에 있어야 한다 — 문항이 바뀌면 옛 초안은 버린다. */
function readResponses(source: unknown): Record<number, number> {
  const result: Record<number, number> = {};
  if (typeof source !== "object" || source === null) return result;

  for (const [key, value] of Object.entries(source)) {
    const itemId = Number(key);
    if (!Number.isInteger(itemId)) continue;
    const item = itemById(itemId);
    if (!item) continue;
    if (typeof value !== "number" || !Number.isInteger(value)) continue;
    if (value < 0 || value >= item.options.length) continue;
    result[itemId] = value;
  }
  return result;
}

function readElapsed(source: unknown): Record<number, number> {
  const result: Record<number, number> = {};
  if (typeof source !== "object" || source === null) return result;

  for (const [key, value] of Object.entries(source)) {
    const itemId = Number(key);
    if (!Number.isInteger(itemId) || !itemById(itemId)) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    result[itemId] = Math.min(Math.round(value), ITEM_ELAPSED_CAP_MS);
  }
  return result;
}

export function loadCognitiveDraft(): CognitiveDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_DRAFT;

    const record = parsed as Record<string, unknown>;
    return Object.freeze({
      responses: Object.freeze(readResponses(record.responses)),
      elapsedMsByItem: Object.freeze(readElapsed(record.elapsedMsByItem)),
    });
  } catch {
    return EMPTY_DRAFT;
  }
}

export function subscribeCognitiveDraft(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getCognitiveDraftSnapshot(): CognitiveDraft {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = loadCognitiveDraft();
  }
  return cachedDraft;
}

export function getCognitiveDraftServerSnapshot(): CognitiveDraft {
  return EMPTY_DRAFT;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveCognitiveDraft(draft: CognitiveDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ responses: draft.responses, elapsedMsByItem: draft.elapsedMsByItem }),
    );
    cachedRaw = null;
  } catch {
    // 저장소 용량이나 시크릿 모드 실패가 검사를 끊어서는 안 된다.
  }
  notify();
}

export function clearCognitiveDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
  } catch {
    // 최선 노력일 뿐이며, 이미 완료된 결과는 그대로 쓸 수 있다.
  }
  notify();
}

/** 응답 하나만 갈아 끼운 새 초안. 시간 기록은 건드리지 않는다. */
export function withResponse(draft: CognitiveDraft, itemId: number, optionIndex: number): CognitiveDraft {
  return Object.freeze({
    responses: Object.freeze({ ...draft.responses, [itemId]: optionIndex }),
    elapsedMsByItem: draft.elapsedMsByItem,
  });
}

/**
 * 문항에 머문 시간을 누적한 새 초안. 문항을 오갈 수 있으므로 덮어쓰지 않고 더한다.
 * 0 이하이거나 상한에 이미 닿아 변화가 없으면 같은 객체를 그대로 돌려준다 —
 * useSyncExternalStore 아래에서 의미 없는 재렌더를 만들지 않기 위해서다.
 */
export function withElapsed(draft: CognitiveDraft, itemId: number, deltaMs: number): CognitiveDraft {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return draft;

  const previous = draft.elapsedMsByItem[itemId] ?? 0;
  const next = Math.min(Math.round(previous + deltaMs), ITEM_ELAPSED_CAP_MS);
  if (next === previous) return draft;

  return Object.freeze({
    responses: draft.responses,
    elapsedMsByItem: Object.freeze({ ...draft.elapsedMsByItem, [itemId]: next }),
  });
}
