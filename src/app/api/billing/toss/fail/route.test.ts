import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

const SITE_ORIGIN = "https://lumina.jack.ai.kr";

describe("GET /api/billing/toss/fail", () => {
  it("redirects to the default product page with purchase=failed", async () => {
    const response = await GET(new Request(`${SITE_ORIGIN}/api/billing/toss/fail`));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
  });

  it("preserves a non-default locale from the query string", async () => {
    const response = await GET(new Request(`${SITE_ORIGIN}/api/billing/toss/fail?locale=en`));
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/en/premium/saju-2027?purchase=failed`);
  });

  it("falls back to Korean for an unrecognized locale value", async () => {
    const response = await GET(new Request(`${SITE_ORIGIN}/api/billing/toss/fail?locale=xx`));
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
  });
});
