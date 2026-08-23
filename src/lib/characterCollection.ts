/**
 * 캐릭터 도감의 해금 기록.
 *
 * 분석 결과나 출생 정보는 저장하지 않고, 만난 캐릭터의 안정적인 id만 이
 * 브라우저에 기록한다. 서버·쿠키·공유 링크에는 포함하지 않는다.
 */
const STORAGE_KEY = "lumina.character-collection.v1";

let cachedRaw: string | null = null;
let cachedSnapshot: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();

function parse(raw: string | null): readonly string[] {
  if (!raw) return Object.freeze([]);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    const ids = parsed.filter((value): value is string => /^[a-z]+-(strong|balanced|weak)$/.test(value));
    return Object.freeze([...new Set(ids)]);
  } catch {
    return Object.freeze([]);
  }
}

function read(): readonly string[] {
  if (typeof window === "undefined") return Object.freeze([]);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = parse(raw);
  return cachedSnapshot;
}

export function subscribeCharacterCollection(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export function getCharacterCollectionSnapshot(): readonly string[] {
  return read();
}

export function getCharacterCollectionServerSnapshot(): readonly string[] {
  return Object.freeze([]);
}

export function unlockCharacter(id: string): void {
  if (!/^[a-z]+-(strong|balanced|weak)$/.test(id) || typeof window === "undefined") return;
  const current = read();
  if (current.includes(id)) return;
  const next = Object.freeze([...current, id]);
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = next;
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}
