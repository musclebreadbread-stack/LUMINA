import { describe, expect, it } from "vitest";
import { sanitizeReturnTo } from "../returnTo";

describe("sanitizeReturnTo", () => {
  it("accepts internal /premium/* and /r/* paths", () => {
    expect(sanitizeReturnTo("/premium/saju-2027")).toBe("/premium/saju-2027");
    expect(sanitizeReturnTo("/premium/saju-2027/report")).toBe("/premium/saju-2027/report");
    expect(sanitizeReturnTo("/r/abc123")).toBe("/r/abc123");
    expect(sanitizeReturnTo("/r/abc123/astro")).toBe("/r/abc123/astro");
  });

  it("accepts a locale-prefixed internal path", () => {
    expect(sanitizeReturnTo("/en/premium/saju-2027")).toBe("/en/premium/saju-2027");
    expect(sanitizeReturnTo("/ja/r/abc123")).toBe("/ja/r/abc123");
  });

  it("rejects paths outside the allowed prefixes", () => {
    expect(sanitizeReturnTo("/account")).toBeNull();
    expect(sanitizeReturnTo("/admin/billing")).toBeNull();
    expect(sanitizeReturnTo("/")).toBeNull();
  });

  it("rejects absolute and protocol-relative URLs (open-redirect attempts)", () => {
    expect(sanitizeReturnTo("https://evil.example/premium/x")).toBeNull();
    expect(sanitizeReturnTo("//evil.example/premium/x")).toBeNull();
    expect(sanitizeReturnTo("http://evil.example")).toBeNull();
  });

  it("rejects path-traversal and backslash tricks", () => {
    expect(sanitizeReturnTo("/premium/../../etc/passwd")).toBeNull();
    expect(sanitizeReturnTo("/premium/\\evil.example")).toBeNull();
  });

  it("rejects embedded whitespace and oversized values", () => {
    expect(sanitizeReturnTo("/premium/saju-2027 \n/evil")).toBeNull();
    expect(sanitizeReturnTo(`/premium/${"a".repeat(600)}`)).toBeNull();
  });

  it("rejects null, undefined, and empty values", () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo("")).toBeNull();
  });
});
