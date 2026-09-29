import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ITEMS } from "@engine/cognitive/items";
import {
  EMPTY_DRAFT,
  ITEM_ELAPSED_CAP_MS,
  clearCognitiveDraft,
  getCognitiveDraftServerSnapshot,
  getCognitiveDraftSnapshot,
  loadCognitiveDraft,
  saveCognitiveDraft,
  subscribeCognitiveDraft,
  withElapsed,
  withResponse,
} from "../cognitiveDraft";

const STORAGE_KEY = "lumina.cognitive.draft.v1";
const first = ITEMS[0]!;
const optionCount = first.options.length;

describe("cognitive draft storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns the shared empty draft when nothing is stored", () => {
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
  });

  it("round-trips responses and elapsed times", () => {
    saveCognitiveDraft({ responses: { [first.id]: 1 }, elapsedMsByItem: { [first.id]: 4200 } });
    const loaded = loadCognitiveDraft();
    expect(loaded).toEqual({ responses: { [first.id]: 1 }, elapsedMsByItem: { [first.id]: 4200 } });
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.responses)).toBe(true);
  });

  it("drops responses for unknown items, bad keys and out-of-range options", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        responses: {
          [first.id]: optionCount,
          abc: 0,
          99999: 0,
          [ITEMS[1]!.id]: -1,
          [ITEMS[2]!.id]: 0.5,
          [ITEMS[3]!.id]: "1",
          [ITEMS[4]!.id]: 0,
        },
      }),
    );
    expect(loadCognitiveDraft().responses).toEqual({ [ITEMS[4]!.id]: 0 });
  });

  it("sanitizes elapsed times: rounds, caps, and drops invalid values", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        elapsedMsByItem: {
          [ITEMS[0]!.id]: 1234.6,
          [ITEMS[1]!.id]: ITEM_ELAPSED_CAP_MS * 3,
          [ITEMS[2]!.id]: -5,
          [ITEMS[3]!.id]: "10",
          abc: 5,
          99999: 5,
        },
      }),
    );
    expect(loadCognitiveDraft().elapsedMsByItem).toEqual({
      [ITEMS[0]!.id]: 1235,
      [ITEMS[1]!.id]: ITEM_ELAPSED_CAP_MS,
    });
  });

  it("treats non-object sections as empty", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses: 5, elapsedMsByItem: null }));
    expect(loadCognitiveDraft()).toEqual({ responses: {}, elapsedMsByItem: {} });
  });

  it("returns the empty draft for non-object or corrupt payloads", () => {
    window.localStorage.setItem(STORAGE_KEY, "null");
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
    window.localStorage.setItem(STORAGE_KEY, "42");
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
    window.localStorage.setItem(STORAGE_KEY, "{oops");
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
  });

  it("falls back to empty when storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
    expect(getCognitiveDraftSnapshot()).toBe(EMPTY_DRAFT);
  });

  it("clears the stored draft", () => {
    saveCognitiveDraft({ responses: { [first.id]: 0 }, elapsedMsByItem: {} });
    clearCognitiveDraft();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadCognitiveDraft()).toBe(EMPTY_DRAFT);
  });

  it("returns the empty draft snapshot after clearing a draft that was already read", () => {
    saveCognitiveDraft({ responses: { [first.id]: 0 }, elapsedMsByItem: {} });
    expect(getCognitiveDraftSnapshot().responses).toEqual({ [first.id]: 0 });
    clearCognitiveDraft();
    expect(getCognitiveDraftSnapshot()).toBe(EMPTY_DRAFT);
  });

  it("serves the frozen empty draft on the server", () => {
    expect(getCognitiveDraftServerSnapshot()).toBe(EMPTY_DRAFT);
    expect(Object.isFrozen(EMPTY_DRAFT)).toBe(true);
  });

  it("keeps the browser snapshot stable until the stored value changes", () => {
    saveCognitiveDraft({ responses: { [first.id]: 0 }, elapsedMsByItem: {} });
    const a = getCognitiveDraftSnapshot();
    expect(getCognitiveDraftSnapshot()).toBe(a);

    saveCognitiveDraft({ responses: { [first.id]: 1 }, elapsedMsByItem: {} });
    const b = getCognitiveDraftSnapshot();
    expect(b).not.toBe(a);
    expect(b.responses).toEqual({ [first.id]: 1 });
  });

  it("notifies subscribers on save, clear and storage events until unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCognitiveDraft(listener);
    saveCognitiveDraft(EMPTY_DRAFT);
    clearCognitiveDraft();
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    saveCognitiveDraft(EMPTY_DRAFT);
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("still notifies when storage writes or removals throw", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCognitiveDraft(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveCognitiveDraft(EMPTY_DRAFT)).not.toThrow();
    expect(() => clearCognitiveDraft()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe("withResponse", () => {
  it("replaces one response and leaves elapsed times untouched", () => {
    const base = { responses: { 1: 0, 2: 1 }, elapsedMsByItem: { 1: 500 } };
    const next = withResponse(base, 2, 3);
    expect(next.responses).toEqual({ 1: 0, 2: 3 });
    expect(next.elapsedMsByItem).toBe(base.elapsedMsByItem);
    expect(base.responses).toEqual({ 1: 0, 2: 1 });
    expect(Object.isFrozen(next)).toBe(true);
  });
});

describe("withElapsed", () => {
  it("accumulates elapsed time and rounds", () => {
    const one = withElapsed(EMPTY_DRAFT, 5, 1000.4);
    expect(one.elapsedMsByItem).toEqual({ 5: 1000 });
    const two = withElapsed(one, 5, 500);
    expect(two.elapsedMsByItem).toEqual({ 5: 1500 });
    expect(two.responses).toBe(one.responses);
  });

  it("returns the same object for non-positive or non-finite deltas", () => {
    expect(withElapsed(EMPTY_DRAFT, 5, 0)).toBe(EMPTY_DRAFT);
    expect(withElapsed(EMPTY_DRAFT, 5, -10)).toBe(EMPTY_DRAFT);
    expect(withElapsed(EMPTY_DRAFT, 5, Number.NaN)).toBe(EMPTY_DRAFT);
    expect(withElapsed(EMPTY_DRAFT, 5, Number.POSITIVE_INFINITY)).toBe(EMPTY_DRAFT);
  });

  it("caps at the per-item limit and then stops producing new drafts", () => {
    const capped = withElapsed(EMPTY_DRAFT, 5, ITEM_ELAPSED_CAP_MS + 999);
    expect(capped.elapsedMsByItem[5]).toBe(ITEM_ELAPSED_CAP_MS);
    expect(withElapsed(capped, 5, 1000)).toBe(capped);
  });
});
