import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEqDraft,
  getEqDraftServerSnapshot,
  getEqDraftSnapshot,
  loadEqDraft,
  saveEqDraft,
  subscribeEqDraft,
} from "../eqDraft";

const STORAGE_KEY = "lumina.eq.draft.v1";

describe("eq draft storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns an empty draft when nothing is stored", () => {
    expect(loadEqDraft()).toEqual({});
  });

  it("round-trips valid responses", () => {
    saveEqDraft({ 1: 5, 2: 1, 3: 3 });
    expect(loadEqDraft()).toEqual({ 1: 5, 2: 1, 3: 3 });
  });

  it("drops out-of-range, non-numeric and non-integer entries", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 1: 0, 2: 6, 3: "3", 4: 2.5, abc: 4, 5: 4 }),
    );
    expect(loadEqDraft()).toEqual({ 5: 4 });
  });

  it("ignores non-object and corrupt payloads", () => {
    window.localStorage.setItem(STORAGE_KEY, "null");
    expect(loadEqDraft()).toEqual({});
    window.localStorage.setItem(STORAGE_KEY, "7");
    expect(loadEqDraft()).toEqual({});
    window.localStorage.setItem(STORAGE_KEY, "{oops");
    expect(loadEqDraft()).toEqual({});
  });

  it("returns an empty draft when storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadEqDraft()).toEqual({});
    expect(getEqDraftSnapshot()).toEqual({});
  });

  it("clears a stored draft", () => {
    saveEqDraft({ 1: 4 });
    clearEqDraft();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadEqDraft()).toEqual({});
  });

  it("serves a frozen, referentially stable server snapshot", () => {
    expect(getEqDraftServerSnapshot()).toEqual({});
    expect(getEqDraftServerSnapshot()).toBe(getEqDraftServerSnapshot());
    expect(Object.isFrozen(getEqDraftServerSnapshot())).toBe(true);
  });

  it("keeps the browser snapshot stable until the stored value changes", () => {
    saveEqDraft({ 1: 3 });
    const first = getEqDraftSnapshot();
    expect(getEqDraftSnapshot()).toBe(first);

    saveEqDraft({ 1: 3, 2: 4 });
    const second = getEqDraftSnapshot();
    expect(second).not.toBe(first);
    expect(second).toEqual({ 1: 3, 2: 4 });

  });

  it("notifies subscribers on save, clear and storage events until unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEqDraft(listener);

    saveEqDraft({ 1: 2 });
    clearEqDraft();
    expect(listener).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    saveEqDraft({ 1: 1 });
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("still notifies when storage writes or removals throw", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEqDraft(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveEqDraft({ 1: 2 })).not.toThrow();
    expect(() => clearEqDraft()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
