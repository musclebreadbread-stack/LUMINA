import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const WEBSITE_ID = "550e8400-e29b-41d4-a716-446655440000";
const SHARE_ID = "6q2DwUjmM8y8SqdWVN7s5A";

function requestFor(payload: unknown): Request {
  return new Request("https://lumina.jack.ai.kr/api/umami/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "event", payload }),
  });
}

function routeContext(): { readonly params: Promise<{ readonly path: string[] }> } {
  return { params: Promise.resolve({ path: ["api", "send"] }) };
}

describe("Umami event proxy privacy boundary", () => {
  let forwardedUrl: string | undefined;
  let forwardedBody: string | undefined;

  beforeEach(() => {
    vi.stubEnv("UMAMI_INTERNAL_ORIGIN", "http://umami.railway.internal:3000");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", WEBSITE_ID);
    forwardedUrl = undefined;
    forwardedBody = undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      forwardedUrl = String(input);
      if (init?.body instanceof Uint8Array) {
        forwardedBody = new TextDecoder().decode(init.body);
      } else if (init?.body instanceof ArrayBuffer) {
        forwardedBody = new TextDecoder().decode(init.body);
      } else if (typeof init?.body === "string") {
        forwardedBody = init.body;
      }
      return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("scrubs private share tokens in both URL and referrer before forwarding", async () => {
    const response = await POST(requestFor({
      website: WEBSITE_ID,
      url: `/ko/%70/${SHARE_ID}?source=private`,
      referrer: `https://lumina.jack.ai.kr/ko/%70/${SHARE_ID}?source=private`,
      name: "share_landing_view",
      data: { analysis: "saju" },
    }), routeContext());

    expect(response.status).toBe(200);
    expect(forwardedUrl).toBe("http://umami.railway.internal:3000/api/send");
    expect(forwardedBody).toBeDefined();
    expect(forwardedBody).not.toContain(SHARE_ID);
    expect(JSON.parse(forwardedBody ?? "{}")).toEqual({
      type: "event",
      payload: {
        website: WEBSITE_ID,
        url: "/p/[share]",
        referrer: "https://lumina.jack.ai.kr/p/[share]",
        name: "share_landing_view",
        data: { analysis: "saju" },
      },
    });
  });

  it("rejects events without a valid URL without contacting Umami", async () => {
    const response = await POST(requestFor({ website: WEBSITE_ID, url: 42 }), routeContext());

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
