import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/reportProfileSession", () => ({
  encryptReportProfileSession: vi.fn(() => "encrypted-session"),
  reportProfileCookieName: (kind: string) => `lumina.report.${kind}`,
}));

import { POST } from "./route";

const PROFILE = {
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
} as const;

function request(body: unknown): Request {
  return new Request("http://localhost:3000/api/report/profile-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/report/profile-session", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("APP_ENV", "development");
  });
  afterEach(() => vi.unstubAllEnvs());

  function setCookies(response: Response): string[] {
    return response.headers.getSetCookie();
  }

  it("scopes a birth session cookie to /r and to every locale-prefixed /<locale>/r path", async () => {
    const response = await POST(request({ kind: "birth", profile: PROFILE }));

    expect(response.status).toBe(200);
    const cookies = setCookies(response);
    expect(cookies.map((cookie) => /Path=([^;]+)/u.exec(cookie)?.[1])).toEqual([
      "/r",
      "/en/r",
      "/ja/r",
      "/zh-Hant/r",
      "/es/r",
    ]);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/^lumina\.report\.birth=encrypted-session; /u);
      expect(cookie).toContain("Max-Age=1800");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).not.toContain("Secure");
    }
  });

  it("scopes a compatibility session cookie to /compatibility and every locale-prefixed path", async () => {
    const response = await POST(request({ kind: "compatibility", first: PROFILE, second: PROFILE }));

    expect(response.status).toBe(200);
    expect(setCookies(response).map((cookie) => /Path=([^;]+)/u.exec(cookie)?.[1])).toEqual([
      "/compatibility",
      "/en/compatibility",
      "/ja/compatibility",
      "/zh-Hant/compatibility",
      "/es/compatibility",
    ]);
  });

  it("marks the cookies Secure on an https origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example");
    vi.stubEnv("APP_ENV", "production");
    const secureRequest = new Request("https://lumina.example/api/report/profile-session", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://lumina.example" },
      body: JSON.stringify({ kind: "birth", profile: PROFILE }),
    });
    const response = await POST(secureRequest);
    expect(response.status).toBe(200);
    for (const cookie of setCookies(response)) expect(cookie).toContain("; Secure");
  });

  it("closes with 503 and sets no cookie when the site origin is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await POST(request({ kind: "birth", profile: PROFILE }));
    expect(response.status).toBe(503);
    expect(setCookies(response)).toEqual([]);
  });

  it("rejects a foreign origin without setting a cookie", async () => {
    const foreign = new Request("http://localhost:3000/api/report/profile-session", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ kind: "birth", profile: PROFILE }),
    });
    const response = await POST(foreign);
    expect(response.status).toBe(403);
    expect(setCookies(response)).toEqual([]);
  });

  it("rejects an invalid profile payload", async () => {
    const response = await POST(request({ kind: "birth", profile: { ...PROFILE, month: 13 } }));
    expect(response.status).toBe(400);
    expect(setCookies(response)).toEqual([]);
  });
});
