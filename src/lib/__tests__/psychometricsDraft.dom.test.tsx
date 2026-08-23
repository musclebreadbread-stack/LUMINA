import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPsychometricsDraft,
  loadPsychometricsDraft,
  savePsychometricsDraft,
} from "../psychometricsDraft";

describe("psychometrics draft storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips valid partial responses", () => {
    savePsychometricsDraft({ 1: 5, 2: 2 });
    expect(loadPsychometricsDraft()).toEqual({ 1: 5, 2: 2 });
  });

  it("drops malformed entries", () => {
    window.localStorage.setItem(
      "lumina.ipip.draft.v1",
      JSON.stringify({ 1: 6, 2: "3", invalid: 4 }),
    );
    expect(loadPsychometricsDraft()).toEqual({});
  });

  it("clears a completed draft", () => {
    savePsychometricsDraft({ 1: 4 });
    clearPsychometricsDraft();
    expect(loadPsychometricsDraft()).toEqual({});
  });
});
