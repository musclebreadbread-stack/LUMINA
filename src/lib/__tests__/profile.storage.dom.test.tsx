import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROFILE,
  clearProfile,
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  loadProfile,
  saveProfile,
  subscribeProfile,
  toBirthInput,
  type StoredProfile,
} from "../profile";

const STORAGE_KEY = "lumina.profile.v1";

describe("profile storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns null when nothing is stored", () => {
    expect(loadProfile()).toBeNull();
  });

  it("round-trips a profile and freezes the result", () => {
    saveProfile(DEFAULT_PROFILE);
    const loaded = loadProfile();
    expect(loaded).toEqual(DEFAULT_PROFILE);
    expect(Object.isFrozen(loaded)).toBe(true);
  });

  it("fills defaults for legacy profiles without dayBoundaryRule or placeLabelEn", () => {
    const { dayBoundaryRule: _d, placeLabelEn: _p, ...legacy } = DEFAULT_PROFILE;
    void _d;
    void _p;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    expect(loadProfile()).toMatchObject({ dayBoundaryRule: "zi23", placeLabelEn: "" });
  });

  it("accepts lunar calendar, midnight rule and unknown time", () => {
    const stored = { ...DEFAULT_PROFILE, calendar: "lunar", dayBoundaryRule: "midnight", hour: null, minute: null };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    expect(loadProfile()).toEqual(stored);
  });

  it.each([
    ["non-object", "5"],
    ["null", "null"],
    ["corrupt JSON", "{oops"],
    ["bad calendar", JSON.stringify({ ...DEFAULT_PROFILE, calendar: "julian" })],
    ["bad dayBoundaryRule", JSON.stringify({ ...DEFAULT_PROFILE, dayBoundaryRule: "noon" })],
    ["string year", JSON.stringify({ ...DEFAULT_PROFILE, year: "1995" })],
    ["non-boolean leap month", JSON.stringify({ ...DEFAULT_PROFILE, isLeapMonth: 0 })],
    ["undefined hour", JSON.stringify({ ...DEFAULT_PROFILE, hour: undefined })],
    ["string minute", JSON.stringify({ ...DEFAULT_PROFILE, minute: "0" })],
    ["numeric gender", JSON.stringify({ ...DEFAULT_PROFILE, gender: 1 })],
    ["string lat", JSON.stringify({ ...DEFAULT_PROFILE, lat: "37" })],
    ["string lng", JSON.stringify({ ...DEFAULT_PROFILE, lng: "126" })],
    ["numeric timeZone", JSON.stringify({ ...DEFAULT_PROFILE, timeZone: 9 })],
    ["numeric placeLabel", JSON.stringify({ ...DEFAULT_PROFILE, placeLabel: 1 })],
    ["numeric placeLabelEn", JSON.stringify({ ...DEFAULT_PROFILE, placeLabelEn: 1 })],
  ])("rejects an invalid stored value: %s", (_name, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);
    expect(loadProfile()).toBeNull();
  });

  it("returns null when storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadProfile()).toBeNull();
    expect(getProfileSnapshot()).toBeNull();
  });

  it("clears the profile", () => {
    saveProfile(DEFAULT_PROFILE);
    clearProfile();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadProfile()).toBeNull();
  });

  it("keeps the snapshot referentially stable until storage changes", () => {
    saveProfile(DEFAULT_PROFILE);
    const a = getProfileSnapshot();
    expect(a).toEqual(DEFAULT_PROFILE);
    expect(getProfileSnapshot()).toBe(a);

    saveProfile({ ...DEFAULT_PROFILE, year: 2000 });
    const b = getProfileSnapshot();
    expect(b).not.toBe(a);
    expect(b?.year).toBe(2000);

    clearProfile();
    expect(getProfileSnapshot()).toBeNull();
  });

  it("serves null on the server", () => {
    expect(getProfileServerSnapshot()).toBeNull();
  });

  it("notifies subscribers on save, clear and storage events until unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProfile(listener);
    saveProfile(DEFAULT_PROFILE);
    clearProfile();
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    saveProfile(DEFAULT_PROFILE);
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not throw and still notifies when storage writes or removals fail", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProfile(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveProfile(DEFAULT_PROFILE)).not.toThrow();
    expect(() => clearProfile()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe("hydrationStore", () => {
  it("reports hydrated on the client and not on the server", () => {
    expect(hydrationStore.getSnapshot()).toBe(true);
    expect(hydrationStore.getServerSnapshot()).toBe(false);
    const unsubscribe = hydrationStore.subscribe();
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe("toBirthInput", () => {
  it("maps a stored profile to engine input", () => {
    expect(toBirthInput(DEFAULT_PROFILE)).toEqual({
      date: { year: 1995, month: 6, day: 15 },
      time: { hour: 12, minute: 0 },
      calendar: "solar",
      isLeapMonth: false,
      gender: "unspecified",
      place: { lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul", label: "서울" },
    });
  });

  it("omits time when hour or minute is unknown", () => {
    const noHour: StoredProfile = { ...DEFAULT_PROFILE, hour: null };
    const noMinute: StoredProfile = { ...DEFAULT_PROFILE, minute: null };
    expect(toBirthInput(noHour).time).toBeUndefined();
    expect(toBirthInput(noMinute).time).toBeUndefined();
  });

  it("keeps midnight (0:00) as a known time", () => {
    expect(toBirthInput({ ...DEFAULT_PROFILE, hour: 0, minute: 0 }).time).toEqual({ hour: 0, minute: 0 });
  });
});
