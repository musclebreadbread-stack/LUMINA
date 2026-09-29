import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDarkTriadDraft,
  getDarkTriadDraftServerSnapshot,
  getDarkTriadDraftSnapshot,
  loadDarkTriadDraft,
  saveDarkTriadDraft,
  subscribeDarkTriadDraft,
} from "../darktriadDraft";

const STORAGE_KEY = "lumina.darktriad.draft.v1";

describe("darktriad draft storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns an empty draft when nothing is stored", () => {
    expect(loadDarkTriadDraft()).toEqual({});
  });

  it("round-trips valid responses", () => {
    saveDarkTriadDraft({ 1: 5, 2: 1, 3: 3 });
    expect(loadDarkTriadDraft()).toEqual({ 1: 5, 2: 1, 3: 3 });
  });

  it("drops out-of-range, non-numeric and non-integer entries", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 1: 0, 2: 6, 3: "3", 4: 2.5, abc: 4, 5: 4 }),
    );
    expect(loadDarkTriadDraft()).toEqual({ 5: 4 });
  });

  it("ignores non-object and corrupt payloads", () => {
    window.localStorage.setItem(STORAGE_KEY, "null");
    expect(loadDarkTriadDraft()).toEqual({});
    window.localStorage.setItem(STORAGE_KEY, "7");
    expect(loadDarkTriadDraft()).toEqual({});
    window.localStorage.setItem(STORAGE_KEY, "{oops");
    expect(loadDarkTriadDraft()).toEqual({});
  });

  it("returns an empty draft when storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadDarkTriadDraft()).toEqual({});
    expect(getDarkTriadDraftSnapshot()).toEqual({});
  });

  it("clears a stored draft", () => {
    saveDarkTriadDraft({ 1: 4 });
    clearDarkTriadDraft();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadDarkTriadDraft()).toEqual({});
  });

  it("returns an empty snapshot after clearing a draft that was already read", () => {
    saveDarkTriadDraft({ 1: 4 });
    expect(getDarkTriadDraftSnapshot()).toEqual({ 1: 4 });
    clearDarkTriadDraft();
    expect(getDarkTriadDraftSnapshot()).toEqual({});
    expect(getDarkTriadDraftSnapshot()).toBe(getDarkTriadDraftSnapshot());
  });

  it("serves a frozen, referentially stable server snapshot", () => {
    expect(getDarkTriadDraftServerSnapshot()).toEqual({});
    expect(getDarkTriadDraftServerSnapshot()).toBe(getDarkTriadDraftServerSnapshot());
    expect(Object.isFrozen(getDarkTriadDraftServerSnapshot())).toBe(true);
  });

  it("keeps the browser snapshot stable until the stored value changes", () => {
    saveDarkTriadDraft({ 1: 3 });
    const first = getDarkTriadDraftSnapshot();
    expect(getDarkTriadDraftSnapshot()).toBe(first);

    saveDarkTriadDraft({ 1: 3, 2: 4 });
    const second = getDarkTriadDraftSnapshot();
    expect(second).not.toBe(first);
    expect(second).toEqual({ 1: 3, 2: 4 });

  });

  it("notifies subscribers on save, clear and storage events until unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDarkTriadDraft(listener);

    saveDarkTriadDraft({ 1: 2 });
    clearDarkTriadDraft();
    expect(listener).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    saveDarkTriadDraft({ 1: 1 });
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("still notifies when storage writes or removals throw", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDarkTriadDraft(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveDarkTriadDraft({ 1: 2 })).not.toThrow();
    expect(() => clearDarkTriadDraft()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
