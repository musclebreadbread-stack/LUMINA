import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isEuCountryCode } from "../service";

describe("isEuCountryCode", () => {
  it("recognizes EU member country codes", () => {
    expect(isEuCountryCode("DE")).toBe(true);
    expect(isEuCountryCode("FR")).toBe(true);
    expect(isEuCountryCode("SE")).toBe(true);
  });

  it("rejects non-EU country codes and null", () => {
    expect(isEuCountryCode("KR")).toBe(false);
    expect(isEuCountryCode("US")).toBe(false);
    expect(isEuCountryCode("GB")).toBe(false);
    expect(isEuCountryCode(null)).toBe(false);
  });
});
