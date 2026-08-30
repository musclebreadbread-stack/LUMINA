import type { LikertScale } from "@engine/attachment/items";
import type { AttachmentResponse } from "@engine/attachment/scoring";

/**
 * 애착 설문 초안 보관소.
 *
 * 나머지 세 리커트 설문과 같은 외부 저장소 구독 형태로 맞춘다 — 첫 렌더에서 곧바로
 * localStorage를 읽으면 서버가 그린 HTML과 어긋나 하이드레이션이 깨진다. 서버 스냅숏은
 * 언제나 빈 초안이고, 브라우저 값은 구독을 통해 들어온다.
 */

const STORAGE_KEY = "lumina.attachment.draft";
const listeners = new Set<() => void>();
const EMPTY_DRAFT: AttachmentResponse = Object.freeze({});

let cachedRaw: string | null = null;
let cachedDraft: AttachmentResponse = EMPTY_DRAFT;

function isLikertScale(value: unknown): value is LikertScale {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function loadAttachmentDraft(): AttachmentResponse {
  if (typeof window === "undefined") return EMPTY_DRAFT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_DRAFT;

    const result: { [itemId: number]: LikertScale } = {};
    for (const [key, value] of Object.entries(parsed)) {
      const itemId = Number(key);
      if (Number.isInteger(itemId) && isLikertScale(value)) result[itemId] = value;
    }
    return result;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function subscribeAttachmentDraft(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getAttachmentDraftSnapshot(): AttachmentResponse {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = loadAttachmentDraft();
  }
  return cachedDraft;
}

export function getAttachmentDraftServerSnapshot(): AttachmentResponse {
  return EMPTY_DRAFT;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveAttachmentDraft(responses: AttachmentResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
    cachedRaw = null;
  } catch {
    // 저장 용량이나 시크릿 모드 제한 때문에 설문 진행 자체가 끊겨서는 안 된다.
  }
  notify();
}

export function clearAttachmentDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
  } catch {
    // 최선을 다한 정리일 뿐이고, 이미 만들어진 결과는 그대로 쓸 수 있다.
  }
  notify();
}
