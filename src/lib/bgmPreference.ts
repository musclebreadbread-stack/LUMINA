const STORAGE_KEY = "lumina.bgm.enabled.v1";

const listeners = new Set<() => void>();
const serverSnapshot = false;
let cachedRaw: string | null = null;
let cachedSnapshot = false;
let memoryOverride: boolean | null = null;

function read(): boolean {
  if (typeof window === "undefined") return serverSnapshot;
  if (memoryOverride !== null) return memoryOverride;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = raw === "1";
  return cachedSnapshot;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeBgmPreference(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = () => {
      memoryOverride = null;
      cachedRaw = null;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => listeners.delete(listener);
}

export function getBgmPreferenceSnapshot(): boolean {
  return read();
}

export function getBgmPreferenceServerSnapshot(): boolean {
  return serverSnapshot;
}

export function setBgmPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;

  const raw = enabled ? "1" : "0";
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    memoryOverride = null;
  } catch {
    // Private browsing or a restrictive storage policy should not disable the
    // current session's control; retain the preference in memory instead.
    memoryOverride = enabled;
  }

  cachedRaw = raw;
  cachedSnapshot = enabled;
  notify();
}

export const BGM_PREFERENCE_STORAGE_KEY = STORAGE_KEY;

