import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "../sentryPrivacy";

describe("scrubSentryEvent", () => {
  it("removes private share capability IDs from request URLs", () => {
    const shareId = "6q2DwUjmM8y8SqdWVN7s5A";
    const event = scrubSentryEvent({
      request: { url: `https://lumina.jack.ai.kr/en/p/${shareId}?source=private` },
      transaction: `/en/p/${shareId}`,
    }, false);

    expect(event?.request).toEqual({ url: "/en/p/[share]" });
    expect(event?.transaction).toBe("/en/p/[share]");
    expect(JSON.stringify(event)).not.toContain(shareId);
  });

  it("scrubs the default-locale alias before redirect handling", () => {
    const shareId = "6q2DwUjmM8y8SqdWVN7s5A";
    const event = scrubSentryEvent({
      request: { url: `https://lumina.jack.ai.kr/ko/p/${shareId}` },
      transaction: `/ko/p/${shareId}`,
    }, false);

    expect(event?.request).toEqual({ url: "/p/[share]" });
    expect(event?.transaction).toBe("/p/[share]");
    expect(JSON.stringify(event)).not.toContain(shareId);
  });

  it("scrubs encoded locale and route aliases", () => {
    const shareId = "6q2DwUjmM8y8SqdWVN7s5A";
    const event = scrubSentryEvent({
      request: { url: `https://lumina.jack.ai.kr/%65n/%70/${shareId}` },
      transaction: `/%65n/%70/${shareId}`,
    }, false);

    expect(event?.request).toEqual({ url: "/en/p/[share]" });
    expect(event?.transaction).toBe("/en/p/[share]");
    expect(JSON.stringify(event)).not.toContain(shareId);
  });
});
