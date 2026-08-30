import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPLORATION_STORAGE_KEY,
  exploredAnalysisKeys,
  getExplorationLogServerSnapshot,
  getExplorationLogSnapshot,
  recordExploration,
  subscribeExplorationLog,
} from "@/lib/explorationLog";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

interface WindowStub {
  readonly localStorage: Storage;
  readonly addEventListener: () => void;
  readonly removeEventListener: () => void;
}

function stubWindow(storage: Storage): WindowStub {
  const stub: WindowStub = {
    localStorage: storage,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", stub);
  return stub;
}

describe("exploration log storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    stubWindow(storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records only the analysis key and a timestamp", () => {
    recordExploration("eq");

    const raw = storage.getItem(EXPLORATION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed: unknown = JSON.parse(raw ?? "[]");
    expect(Array.isArray(parsed)).toBe(true);
    const entry = (parsed as readonly Record<string, unknown>[])[0];
    expect(Object.keys(entry ?? {}).sort()).toEqual(["at", "key"]);
    expect(entry?.key).toBe("eq");
    expect(typeof entry?.at).toBe("string");
  });

  it("keeps the first visit time when the same result is opened again", () => {
    recordExploration("cognitive");
    const first = getExplorationLogSnapshot();
    recordExploration("cognitive");
    const second = getExplorationLogSnapshot();

    expect(second).toHaveLength(1);
    expect(second[0]?.at).toBe(first[0]?.at);
  });

  it("preserves the order analyses were explored in", () => {
    recordExploration("saju");
    recordExploration("tarot");
    recordExploration("attachment");

    expect(getExplorationLogSnapshot().map((entry) => entry.key)).toEqual([
      "saju",
      "tarot",
      "attachment",
    ]);
  });

  it("returns a referentially stable snapshot while storage is unchanged", () => {
    recordExploration("horoscope");
    expect(getExplorationLogSnapshot()).toBe(getExplorationLogSnapshot());
  });

  it("silently drops unknown keys, malformed rows and bad timestamps", () => {
    storage.setItem(
      EXPLORATION_STORAGE_KEY,
      JSON.stringify([
        { key: "palmistry", at: "2026-08-27T01:02:03Z" },
        { key: "saju", at: "yesterday" },
        { key: "tarot" },
        null,
        "numerology",
        { key: "numerology", at: "2026-08-27T01:02:03.400Z" },
      ]),
    );

    expect(getExplorationLogSnapshot()).toEqual([
      { key: "numerology", at: "2026-08-27T01:02:03.400Z" },
    ]);
  });

  it("treats unreadable storage as an empty log", () => {
    storage.setItem(EXPLORATION_STORAGE_KEY, "{not json");
    expect(getExplorationLogSnapshot()).toEqual([]);

    storage.setItem(EXPLORATION_STORAGE_KEY, JSON.stringify({ eq: true }));
    expect(getExplorationLogSnapshot()).toEqual([]);
  });

  it("never throws when the browser refuses storage access", () => {
    const hostile: Storage = {
      length: 0,
      clear: () => undefined,
      getItem: () => {
        throw new Error("blocked");
      },
      key: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new Error("blocked");
      },
    };
    stubWindow(hostile);

    expect(() => recordExploration("psychometrics")).not.toThrow();
    expect(getExplorationLogSnapshot()).toEqual([]);
  });

  it("notifies subscribers when a new analysis is recorded and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeExplorationLog(listener);

    recordExploration("darktriad");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    recordExploration("jungian");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hands the server a frozen empty log so the first paint shows zero explored", () => {
    const serverSnapshot = getExplorationLogServerSnapshot();
    expect(serverSnapshot).toEqual([]);
    expect(Object.isFrozen(serverSnapshot)).toBe(true);
    expect(getExplorationLogServerSnapshot()).toBe(serverSnapshot);
  });

  it("does nothing outside the browser", () => {
    vi.unstubAllGlobals();
    expect(() => recordExploration("saju")).not.toThrow();
    expect(getExplorationLogSnapshot()).toEqual([]);
  });

  it("collapses entries into a lookup set for the hub cards", () => {
    const explored = exploredAnalysisKeys([
      { key: "eq", at: "2026-08-27T01:02:03Z" },
      { key: "saju", at: "2026-08-27T01:02:04Z" },
    ]);

    expect(explored.has("eq")).toBe(true);
    expect(explored.has("tarot")).toBe(false);
  });
});
