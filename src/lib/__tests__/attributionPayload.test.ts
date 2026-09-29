import { describe, expect, it } from "vitest";
import {
  sanitizeAttribution,
  sanitizeAttributionTag,
  sanitizeLandingPath,
  UNKNOWN_LANDING_PATH,
} from "../attributionPayload";

describe("sanitizeAttributionTag", () => {
  it("lowercases and keeps ordinary campaign tags", () => {
    expect(sanitizeAttributionTag("Naver")).toBe("naver");
    expect(sanitizeAttributionTag("  q4_launch-2027 ")).toBe("q4_launch-2027");
  });

  it("drops anything that could carry personal data or markup", () => {
    expect(sanitizeAttributionTag("person@example.com")).toBeNull();
    expect(sanitizeAttributionTag("한글")).toBeNull();
    expect(sanitizeAttributionTag("a b")).toBeNull();
    expect(sanitizeAttributionTag("<script>")).toBeNull();
    expect(sanitizeAttributionTag("x".repeat(65))).toBeNull();
    expect(sanitizeAttributionTag("")).toBeNull();
    expect(sanitizeAttributionTag(42)).toBeNull();
    expect(sanitizeAttributionTag(null)).toBeNull();
  });
});

describe("sanitizeLandingPath", () => {
  it("keeps public SEO landing pages as they are", () => {
    expect(sanitizeLandingPath("/saju/2027/dragon")).toBe("/saju/2027/dragon");
    expect(sanitizeLandingPath("/en/saju/ilju/ding-wei")).toBe("/en/saju/ilju/ding-wei");
    expect(sanitizeLandingPath("/")).toBe("/");
  });

  it("never stores the encoded birth data carried by a result URL", () => {
    expect(sanitizeLandingPath("/r/N4IgdghgtgpiBcIAuACAMgSwEZgDQBcB7ATwFsAaAQQ")).toBe("/r/[data]");
    expect(sanitizeLandingPath("/r/N4IgdghgtgpiBcIAuACAMgSwEZ/astro")).toBe("/r/[data]/astro");
    expect(sanitizeLandingPath("/compatibility/AAAA/BBBB")).toBe("/compatibility/[left]/[right]");
    expect(sanitizeLandingPath("/p/private-share-token")).toBe("/p/[share]");
  });

  it("drops the query string entirely", () => {
    expect(sanitizeLandingPath("/saju/2027?utm_source=x&email=a@b.c")).toBe("/saju/2027");
  });

  it("folds unsafe or unparseable input into the unknown bucket instead of storing it", () => {
    expect(sanitizeLandingPath("/saju/%ED%95%9C%EA%B8%80")).toBe(UNKNOWN_LANDING_PATH);
    expect(sanitizeLandingPath("/a b")).toBe(UNKNOWN_LANDING_PATH);
    expect(sanitizeLandingPath(`/${"a".repeat(200)}`)).toBe(UNKNOWN_LANDING_PATH);
    expect(sanitizeLandingPath("")).toBe(UNKNOWN_LANDING_PATH);
    expect(sanitizeLandingPath(undefined)).toBe(UNKNOWN_LANDING_PATH);
    expect(sanitizeLandingPath("x".repeat(600))).toBe(UNKNOWN_LANDING_PATH);
  });
});

describe("sanitizeAttribution", () => {
  it("sanitizes every field independently so one bad value does not discard the rest", () => {
    expect(sanitizeAttribution({
      source: "Kakao",
      medium: "bad value!",
      campaign: null,
      landingPath: "/r/abcdefgh",
    })).toEqual({ source: "kakao", medium: null, campaign: null, landingPath: "/r/[data]" });
  });

  it("returns null when the input is not an object", () => {
    expect(sanitizeAttribution(null)).toBeNull();
    expect(sanitizeAttribution("x")).toBeNull();
    expect(sanitizeAttribution(undefined)).toBeNull();
  });

  it("still yields a usable record when only the landing path is present (organic visit)", () => {
    expect(sanitizeAttribution({ landingPath: "/saju/2027" })).toEqual({
      source: null,
      medium: null,
      campaign: null,
      landingPath: "/saju/2027",
    });
  });
});
