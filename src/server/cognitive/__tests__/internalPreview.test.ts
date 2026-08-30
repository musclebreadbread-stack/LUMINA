import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hasValidInternalPreviewToken, isInternalPreviewEnabled } from "../internalPreview";

const VALID_TOKEN = "a".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cognitive internal preview guard", () => {
  it("is disabled when no token is configured", () => {
    vi.stubEnv("COGNITIVE_INTERNAL_PREVIEW_TOKEN", "");
    expect(isInternalPreviewEnabled()).toBe(false);
    expect(hasValidInternalPreviewToken(VALID_TOKEN)).toBe(false);
  });

  it("is disabled when the configured token is shorter than 32 characters", () => {
    vi.stubEnv("COGNITIVE_INTERNAL_PREVIEW_TOKEN", "too-short");
    expect(isInternalPreviewEnabled()).toBe(false);
  });

  it("is enabled once a 32+ character token is configured", () => {
    vi.stubEnv("COGNITIVE_INTERNAL_PREVIEW_TOKEN", VALID_TOKEN);
    expect(isInternalPreviewEnabled()).toBe(true);
  });

  it("accepts only an exact token match", () => {
    vi.stubEnv("COGNITIVE_INTERNAL_PREVIEW_TOKEN", VALID_TOKEN);
    expect(hasValidInternalPreviewToken(VALID_TOKEN)).toBe(true);
    expect(hasValidInternalPreviewToken(`${VALID_TOKEN}x`)).toBe(false);
    expect(hasValidInternalPreviewToken("b".repeat(32))).toBe(false);
  });

  it("rejects a missing or empty candidate token", () => {
    vi.stubEnv("COGNITIVE_INTERNAL_PREVIEW_TOKEN", VALID_TOKEN);
    expect(hasValidInternalPreviewToken(undefined)).toBe(false);
    expect(hasValidInternalPreviewToken("")).toBe(false);
  });
});
