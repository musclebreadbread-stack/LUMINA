import { createCipheriv, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { encodeProfile } from "@/lib/share";
import type { MemberProfile } from "@/server/member/profileSchema";
import {
  encryptReportProfileSession,
  reportProfileCookieName,
  resolveBirthReportProfile,
  resolveCompatibilityReportProfiles,
} from "../reportProfileSession";

const KEY = "ab".repeat(32);

const PROFILE: MemberProfile = {
  year: 1990,
  month: 5,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: 14,
  minute: 30,
  gender: "male",
  dayBoundaryRule: "zi23",
  placeLabel: "Seoul",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
};
const OTHER: MemberProfile = { ...PROFILE, year: 1985, month: 11, day: 3, gender: "female", hour: null, minute: null };

function setCookies(values: Record<string, string>) {
  cookieStore.get.mockImplementation((name: string) => (name in values ? { value: values[name] } : undefined));
}

/** Encrypts arbitrary plaintext with the same scheme, to craft payloads the app would never emit. */
function encryptRaw(plaintext: string, aadKind: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(KEY, "hex"), iv);
  cipher.setAAD(Buffer.from(`lumina-report-session:v1:${aadKind}`, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

beforeEach(() => {
  cookieStore.get.mockReset();
  vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reportProfileCookieName", () => {
  it("maps each kind to its cookie name", () => {
    expect(reportProfileCookieName("birth")).toBe("lumina-report-profile");
    expect(reportProfileCookieName("compatibility")).toBe("lumina-compatibility-profiles");
  });
});

describe("encryptReportProfileSession", () => {
  it("emits iv.tag.ciphertext with fresh randomness each call", () => {
    const payload = { kind: "birth", profile: PROFILE } as const;
    const a = encryptReportProfileSession(payload);
    const b = encryptReportProfileSession(payload);
    expect(a.split(".")).toHaveLength(3);
    expect(a).not.toBe(b);
    expect(Buffer.from(a.split(".")[0]!, "base64url")).toHaveLength(12);
    expect(Buffer.from(a.split(".")[1]!, "base64url")).toHaveLength(16);
  });

  it.each([
    ["missing", ""],
    ["too short", "abcd"],
    ["non-hex", "zz".repeat(32)],
  ])("throws when the key is %s", (_label, key) => {
    vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", key);
    expect(() => encryptReportProfileSession({ kind: "birth", profile: PROFILE })).toThrow(
      "REPORT_SESSION_ENCRYPTION_KEY must be a 32-byte hex key",
    );
  });
});

describe("resolveBirthReportProfile", () => {
  it("decodes a shared profile string directly without cookies", async () => {
    const decoded = await resolveBirthReportProfile(encodeProfile(PROFILE));
    expect(decoded).toMatchObject({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "male" });
    expect(cookieStore.get).not.toHaveBeenCalled();
  });

  it("returns null for an undecodable shared string", async () => {
    await expect(resolveBirthReportProfile("garbage")).resolves.toBeNull();
  });

  it("round-trips the encrypted cookie for 'current'", async () => {
    setCookies({ "lumina-report-profile": encryptReportProfileSession({ kind: "birth", profile: PROFILE }) });
    await expect(resolveBirthReportProfile("current")).resolves.toEqual(PROFILE);
    expect(cookieStore.get).toHaveBeenCalledWith("lumina-report-profile");
  });

  it("returns null when the cookie is absent", async () => {
    setCookies({});
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it("rejects a compatibility payload placed in the birth cookie (AAD mismatch)", async () => {
    setCookies({
      "lumina-report-profile": encryptReportProfileSession({ kind: "compatibility", first: PROFILE, second: OTHER }),
    });
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it("rejects tampered ciphertext", async () => {
    const [iv, tag, ct] = encryptReportProfileSession({ kind: "birth", profile: PROFILE }).split(".");
    const flipped = Buffer.from(ct!, "base64url");
    flipped[0] = flipped[0]! ^ 0xff;
    setCookies({ "lumina-report-profile": [iv, tag, flipped.toString("base64url")].join(".") });
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it("rejects a cookie encrypted under a different key", async () => {
    const token = encryptReportProfileSession({ kind: "birth", profile: PROFILE });
    vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", "cd".repeat(32));
    setCookies({ "lumina-report-profile": token });
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it.each([
    ["oversized value", "a".repeat(8_193)],
    ["wrong segment count", "a.b"],
    ["extra segments", "a.b.c.d"],
    ["bad iv/tag lengths", "AAAA.AAAA.AAAA"],
    ["oversized ciphertext", `${"A".repeat(16)}.${"A".repeat(22)}.${"A".repeat(8_200)}`],
  ])("rejects a malformed cookie: %s", async (_label, value) => {
    setCookies({ "lumina-report-profile": value });
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it.each([
    ["non-JSON plaintext", "not json"],
    ["array plaintext", "[1,2]"],
    ["null plaintext", "null"],
    ["string plaintext", '"x"'],
    ["record with the wrong kind", JSON.stringify({ kind: "compatibility", profile: PROFILE })],
    ["invalid profile", JSON.stringify({ kind: "birth", profile: { ...PROFILE, month: 13 } })],
    ["profile with extra fields", JSON.stringify({ kind: "birth", profile: { ...PROFILE, extra: 1 } })],
  ])("returns null for validly-encrypted but unacceptable content: %s", async (_label, plaintext) => {
    setCookies({ "lumina-report-profile": encryptRaw(plaintext, "birth") });
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });
});

describe("resolveCompatibilityReportProfiles", () => {
  it("decodes two shared profile strings", async () => {
    const result = await resolveCompatibilityReportProfiles(encodeProfile(PROFILE), encodeProfile(OTHER));
    expect(result?.first).toMatchObject({ year: 1990, gender: "male" });
    expect(result?.second).toMatchObject({ year: 1985, gender: "female", hour: null });
  });

  it("returns null when either shared string is undecodable", async () => {
    await expect(resolveCompatibilityReportProfiles("bad", encodeProfile(OTHER))).resolves.toBeNull();
    await expect(resolveCompatibilityReportProfiles(encodeProfile(PROFILE), "bad")).resolves.toBeNull();
  });

  it("returns null when a decoded profile fails member schema validation", async () => {
    // Decodes fine but the time zone is not a real IANA zone.
    const invalid = encodeProfile({ ...PROFILE, timeZone: "Not/AZone" });
    await expect(resolveCompatibilityReportProfiles(invalid, encodeProfile(OTHER))).resolves.toBeNull();
    await expect(resolveCompatibilityReportProfiles(encodeProfile(PROFILE), invalid)).resolves.toBeNull();
  });

  it("round-trips the encrypted cookie when both sides are 'current'", async () => {
    setCookies({
      "lumina-compatibility-profiles": encryptReportProfileSession({ kind: "compatibility", first: PROFILE, second: OTHER }),
    });
    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toEqual({ first: PROFILE, second: OTHER });
    expect(cookieStore.get).toHaveBeenCalledWith("lumina-compatibility-profiles");
  });

  it("returns null for a mix of 'current' and a shared string", async () => {
    await expect(resolveCompatibilityReportProfiles("current", encodeProfile(OTHER))).resolves.toBeNull();
    await expect(resolveCompatibilityReportProfiles(encodeProfile(PROFILE), "current")).resolves.toBeNull();
    expect(cookieStore.get).not.toHaveBeenCalled();
  });

  it("returns null when the cookie is absent", async () => {
    setCookies({});
    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toBeNull();
  });

  it("rejects a birth payload in the compatibility cookie", async () => {
    setCookies({ "lumina-compatibility-profiles": encryptReportProfileSession({ kind: "birth", profile: PROFILE }) });
    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toBeNull();
  });

  it.each([
    ["wrong kind", JSON.stringify({ kind: "birth", first: PROFILE, second: OTHER })],
    ["invalid second profile", JSON.stringify({ kind: "compatibility", first: PROFILE, second: { nope: 1 } })],
    ["invalid first profile", JSON.stringify({ kind: "compatibility", first: null, second: OTHER })],
  ])("returns null for %s", async (_label, plaintext) => {
    setCookies({ "lumina-compatibility-profiles": encryptRaw(plaintext, "compatibility") });
    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toBeNull();
  });
});
