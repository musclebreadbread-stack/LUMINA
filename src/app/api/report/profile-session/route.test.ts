import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieValue = Readonly<{ value: string }>;

const { cookieGetMock, cookiesMock } = vi.hoisted(() => ({
  cookieGetMock: vi.fn<(name: string) => CookieValue | undefined>(),
  cookiesMock: vi.fn<() => Promise<{
    get: (name: string) => CookieValue | undefined;
  }>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";
import { encodeProfile } from "@/lib/share";
import {
  encryptReportProfileSession,
  reportProfileCookieName,
  resolveBirthReportProfile,
  resolveCompatibilityReportProfiles,
} from "@/server/reportProfileSession";
import type { MemberProfile } from "@/server/member/profileSchema";

const SITE_ORIGIN = "https://lumina.example";
const SESSION_KEY = "ab".repeat(32);

const birthProfile: MemberProfile = {
  year: 1990,
  month: 1,
  day: 20,
  calendar: "solar",
  isLeapMonth: false,
  hour: 12,
  minute: 30,
  gender: "female",
  dayBoundaryRule: "zi23",
  placeLabel: "Seoul",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
};

const unknownTimeProfile: MemberProfile = {
  year: 1990,
  month: 5,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: null,
  minute: null,
  gender: "unspecified",
  dayBoundaryRule: "zi23",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
};

function requestWithBody(
  body: string,
  options: Readonly<{ origin?: string | null; contentType?: string }> = {},
): Request {
  const headers = new Headers({ "content-type": options.contentType ?? "application/json" });
  if (options.origin !== null) headers.set("origin", options.origin ?? SITE_ORIGIN);
  return new Request(`${SITE_ORIGIN}/api/report/profile-session`, {
    method: "POST",
    headers,
    body,
  });
}

function jsonRequest(payload: unknown, options?: Readonly<{ origin?: string | null; contentType?: string }>): Request {
  return requestWithBody(JSON.stringify(payload), options);
}

function birthPayload(profile: MemberProfile = birthProfile): Readonly<{ kind: "birth"; profile: MemberProfile }> {
  return { kind: "birth", profile };
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function cookiePath(setCookie: string): string | undefined {
  return /Path=([^;]+)/u.exec(setCookie)?.[1];
}

type ParsedCookie = Readonly<{ name: string; value: string; attributes: string }>;

function parseSetCookie(setCookie: string): ParsedCookie {
  const separator = setCookie.indexOf(";");
  const pair = separator === -1 ? setCookie : setCookie.slice(0, separator);
  const equals = pair.indexOf("=");
  return {
    name: pair.slice(0, equals),
    value: pair.slice(equals + 1),
    attributes: separator === -1 ? "" : setCookie.slice(separator + 1),
  };
}

describe("report profile session route", () => {
  let sessionCookies: Map<string, string>;

  // The route writes Set-Cookie headers (one per locale-prefixed path); this
  // mirrors what the browser would send back on a later report page request.
  function rememberResponseCookies(response: Response): void {
    for (const header of setCookies(response)) {
      const cookie = parseSetCookie(header);
      sessionCookies.set(cookie.name, cookie.value);
    }
  }

  beforeEach(() => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_ORIGIN);
    vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", SESSION_KEY);
    sessionCookies = new Map();
    cookieGetMock.mockReset().mockImplementation((name) => {
      const value = sessionCookies.get(name);
      return value === undefined ? undefined : { value };
    });
    cookiesMock.mockReset().mockResolvedValue({ get: cookieGetMock });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects a cross-origin request before reading or saving profile data", async () => {
    const response = await POST(jsonRequest(birthPayload(), { origin: "https://attacker.example" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "origin_not_allowed" });
    expect(setCookies(response)).toEqual([]);
  });

  it("returns null when a current profile cookie is absent", async () => {
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toBeNull();
  });

  it("keeps existing URL-encoded birth reports resolving without reading session cookies", async () => {
    const shareCode = encodeProfile(birthProfile);

    await expect(resolveBirthReportProfile(shareCode)).resolves.toEqual(birthProfile);
    expect(cookiesMock).not.toHaveBeenCalled();
  });

  it("rejects a missing origin and non-JSON content before processing the body", async () => {
    const missingOrigin = await POST(jsonRequest(birthPayload(), { origin: null }));
    const nonJson = await POST(jsonRequest(birthPayload(), { contentType: "text/plain" }));

    expect(missingOrigin.status).toBe(403);
    expect(nonJson.status).toBe(415);
    expect(setCookies(missingOrigin)).toEqual([]);
    expect(setCookies(nonJson)).toEqual([]);
  });

  it("rejects an oversized streamed request body", async () => {
    const response = await POST(requestWithBody("x".repeat(8_193)));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "request_too_large" });
    expect(setCookies(response)).toEqual([]);
  });

  it.each([
    ["invalid JSON", "{"],
    ["invalid profile date", JSON.stringify({ ...birthPayload(), profile: { ...birthProfile, month: 2, day: 31 } })],
    ["invalid profile month", JSON.stringify({ ...birthPayload(), profile: { ...unknownTimeProfile, month: 13 } })],
    ["unexpected fields", JSON.stringify({ ...birthPayload(), extra: "not allowed" })],
  ])("rejects %s without writing a cookie", async (_label, body) => {
    const response = await POST(requestWithBody(body));

    expect(response.status).toBe(400);
    expect(setCookies(response)).toEqual([]);
  });

  it("stores a birth profile only in a short-lived encrypted HttpOnly cookie scoped to reports", async () => {
    const response = await POST(jsonRequest(birthPayload({ ...birthProfile, placeLabel: " Seoul " })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true });
    const [savedCookie] = setCookies(response);
    expect(savedCookie).toBeDefined();
    const { name, value, attributes } = parseSetCookie(savedCookie ?? "");
    expect(name).toBe(reportProfileCookieName("birth"));
    expect(value).toBeTruthy();
    expect(value).not.toContain("Seoul");
    expect(attributes).toBe(" Path=/r; Max-Age=1800; HttpOnly; SameSite=Lax; Secure");
    expect(response.headers.get("cache-control")).toBe("no-store");
    rememberResponseCookies(response);
    await expect(resolveBirthReportProfile("current")).resolves.toEqual({ ...birthProfile, placeLabel: "Seoul" });
  });

  it("scopes a birth session cookie to /r and to every locale-prefixed /<locale>/r path", async () => {
    const response = await POST(jsonRequest(birthPayload(unknownTimeProfile)));

    expect(response.status).toBe(200);
    const cookies = setCookies(response);
    expect(cookies.map(cookiePath)).toEqual(["/r", "/en/r", "/ja/r", "/zh-Hant/r", "/es/r"]);
    const values = new Set(cookies.map((cookie) => parseSetCookie(cookie).value));
    expect(values.size).toBe(1);
    for (const cookie of cookies) {
      expect(parseSetCookie(cookie).name).toBe(reportProfileCookieName("birth"));
      expect(cookie).toContain("Max-Age=1800");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("; Secure");
    }
  });

  it("stores both compatibility profiles in a cookie scoped to every locale's compatibility reports", async () => {
    const secondProfile: MemberProfile = { ...birthProfile, year: 1988, gender: "male", placeLabel: "Busan" };
    const response = await POST(jsonRequest({ kind: "compatibility", first: birthProfile, second: secondProfile }));

    expect(response.status).toBe(200);
    const cookies = setCookies(response);
    expect(cookies.map(cookiePath)).toEqual([
      "/compatibility",
      "/en/compatibility",
      "/ja/compatibility",
      "/zh-Hant/compatibility",
      "/es/compatibility",
    ]);
    for (const cookie of cookies) {
      expect(parseSetCookie(cookie).name).toBe(reportProfileCookieName("compatibility"));
      expect(cookie).toContain("Max-Age=1800; HttpOnly; SameSite=Lax; Secure");
    }
    rememberResponseCookies(response);
    await expect(resolveCompatibilityReportProfiles("current", "current"))
      .resolves.toEqual({ first: birthProfile, second: secondProfile });
    await expect(resolveCompatibilityReportProfiles("current", "non-current"))
      .resolves.toBeNull();
  });

  it("keeps existing URL-encoded compatibility reports resolving and validates decoded profiles", async () => {
    const secondProfile: MemberProfile = { ...birthProfile, year: 1988, gender: "male", placeLabel: "Busan" };
    const firstCode = encodeProfile(birthProfile);
    const secondCode = encodeProfile(secondProfile);
    const invalidZoneCode = encodeProfile({ ...secondProfile, timeZone: "Invalid/Zone" });

    await expect(resolveCompatibilityReportProfiles(firstCode, secondCode))
      .resolves.toEqual({ first: birthProfile, second: secondProfile });
    await expect(resolveCompatibilityReportProfiles(firstCode, invalidZoneCode)).resolves.toBeNull();
    await expect(resolveCompatibilityReportProfiles("invalid", secondCode)).resolves.toBeNull();
    expect(cookiesMock).not.toHaveBeenCalled();
  });

  it("accepts a valid lunar day 30 in new sessions and existing compatibility URLs", async () => {
    const lunarProfile: MemberProfile = {
      ...birthProfile,
      year: 1990,
      month: 2,
      day: 30,
      calendar: "lunar",
    };
    const secondProfile: MemberProfile = { ...birthProfile, year: 1988, gender: "male" };

    const birthResponse = await POST(jsonRequest(birthPayload(lunarProfile)));
    expect(birthResponse.status).toBe(200);
    rememberResponseCookies(birthResponse);
    await expect(resolveBirthReportProfile("current")).resolves.toEqual(lunarProfile);

    const compatibilityResponse = await POST(jsonRequest({
      kind: "compatibility",
      first: lunarProfile,
      second: secondProfile,
    }));
    expect(compatibilityResponse.status).toBe(200);
    rememberResponseCookies(compatibilityResponse);
    await expect(resolveCompatibilityReportProfiles("current", "current"))
      .resolves.toEqual({ first: lunarProfile, second: secondProfile });

    await expect(resolveCompatibilityReportProfiles(
      encodeProfile(lunarProfile),
      encodeProfile(secondProfile),
    )).resolves.toEqual({ first: lunarProfile, second: secondProfile });
  });

  it("rejects nonexistent leap-month dates and unsupported lunar years in routes and sessions", async () => {
    const invalidProfiles: readonly MemberProfile[] = [
      { ...birthProfile, year: 2023, month: 2, day: 30, calendar: "lunar", isLeapMonth: true },
      { ...birthProfile, year: 2051, month: 1, day: 1, calendar: "lunar" },
    ];

    for (const profile of invalidProfiles) {
      const response = await POST(jsonRequest(birthPayload(profile)));
      expect(response.status).toBe(400);
      expect(setCookies(response)).toEqual([]);

      sessionCookies.set(reportProfileCookieName("birth"), encryptReportProfileSession(birthPayload(profile)));
      await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
      sessionCookies.clear();
    }
  });

  it("rejects a birth cookie when it is presented as a compatibility session", async () => {
    rememberResponseCookies(await POST(jsonRequest(birthPayload())));
    const birthCookie = sessionCookies.get(reportProfileCookieName("birth"));
    if (!birthCookie) throw new Error("Expected an encrypted birth cookie");
    sessionCookies.set(reportProfileCookieName("compatibility"), birthCookie);

    await expect(resolveCompatibilityReportProfiles("current", "current")).resolves.toBeNull();
  });

  it("rejects a copied encrypted profile cookie after the server-side 30-minute expiry", async () => {
    vi.useFakeTimers();
    const issuedAt = new Date("2026-10-01T00:00:00.000Z");
    vi.setSystemTime(issuedAt);
    sessionCookies.set(reportProfileCookieName("birth"), encryptReportProfileSession(birthPayload()));

    await expect(resolveBirthReportProfile("current")).resolves.toEqual(birthProfile);
    vi.setSystemTime(new Date(issuedAt.getTime() + 1_800_000));
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it.each(["malformed", "a.b.c.d", "x".repeat(8_193)])("fails closed for invalid session ciphertext", async (value) => {
    sessionCookies.set(reportProfileCookieName("birth"), value);

    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it("fails closed when the ciphertext tag or encryption key is invalid", async () => {
    rememberResponseCookies(await POST(jsonRequest(birthPayload())));
    const encrypted = sessionCookies.get(reportProfileCookieName("birth"));
    if (!encrypted) throw new Error("Expected an encrypted birth cookie");
    const [iv, tag, ciphertext] = encrypted.split(".");
    if (!iv || !tag || ciphertext === undefined) throw new Error("Expected a three-part session ciphertext");
    const replacement = tag[0] === "A" ? "B" : "A";
    sessionCookies.set(reportProfileCookieName("birth"), `${iv}.${replacement}${tag.slice(1)}.${ciphertext}`);
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();

    sessionCookies.set(reportProfileCookieName("birth"), encrypted);
    vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", "cd".repeat(32));
    await expect(resolveBirthReportProfile("current")).resolves.toBeNull();
  });

  it("fails closed on production HTTP configuration and on missing encryption keys", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://lumina.example");
    const insecureOrigin = await POST(jsonRequest(birthPayload()));
    expect(insecureOrigin.status).toBe(503);
    expect(setCookies(insecureOrigin)).toEqual([]);

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_ORIGIN);
    vi.stubEnv("REPORT_SESSION_ENCRYPTION_KEY", "");
    const missingKey = await POST(jsonRequest(birthPayload()));
    expect(missingKey.status).toBe(503);
    expect(setCookies(missingKey)).toEqual([]);
  });

  it("closes with 503 and sets no cookie when the site origin is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await POST(jsonRequest(birthPayload()));

    expect(response.status).toBe(503);
    expect(setCookies(response)).toEqual([]);
  });

  it("allows an HTTP development origin and does not mark its cookies Secure", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await POST(jsonRequest(birthPayload(), { origin: "http://localhost:3000" }));

    expect(response.status).toBe(200);
    const cookies = setCookies(response);
    expect(cookies).toHaveLength(5);
    for (const cookie of cookies) expect(cookie).not.toContain("Secure");
  });
});
