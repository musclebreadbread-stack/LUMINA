import type { LikertResponse } from "@engine/eq/scoring";

const STORAGE_KEY = "lumina.eq.draft.v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;

export type EqDraft = Partial<Record<number, LikertResponse>>;
const EMPTY_DRAFT: EqDraft = Object.freeze({});
let cachedDraft: EqDraft = {};

function isLikertResponse(value: unknown): value is LikertResponse {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function loadEqDraft(): EqDraft {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const result: EqDraft = {};
    for (const [key, value] of Object.entries(parsed)) {
      const itemId = Number(key);
      if (Number.isInteger(itemId) && isLikertResponse(value)) result[itemId] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function subscribeEqDraft(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getEqDraftSnapshot(): EqDraft {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = loadEqDraft();
  }
  return cachedDraft;
}

export function getEqDraftServerSnapshot(): EqDraft {
  return EMPTY_DRAFT;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveEqDraft(responses: EqDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
    cachedRaw = null;
  } catch {
    // A storage quota or privacy-mode failure should not interrupt the survey.
  }
  notify();
}

export function clearEqDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
  } catch {
    // Best effort only; the completed result remains usable.
  }
  notify();
}
