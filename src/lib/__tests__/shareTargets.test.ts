import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHARE_CAMPAIGN,
  shareIntentUrl,
  shareMethodFor,
  shareUtmFor,
  withUtm,
} from "../shareTargets";

const SHARE_URL = "https://lumina.example/s/eq/ABCD";

describe("withUtm", () => {
  it("adds source, medium and campaign to a clean url", () => {
    const result = new URL(withUtm(SHARE_URL, shareUtmFor("x")));

    expect(result.searchParams.get("utm_source")).toBe("x");
    expect(result.searchParams.get("utm_medium")).toBe("social");
    expect(result.searchParams.get("utm_campaign")).toBe(DEFAULT_SHARE_CAMPAIGN);
  });

  it("keeps the original source when a link is re-shared", () => {
    const firstShare = withUtm(SHARE_URL, shareUtmFor("x"));
    const reShared = withUtm(firstShare, shareUtmFor("facebook"));

    expect(new URL(reShared).searchParams.get("utm_source")).toBe("x");
  });

  it("preserves query params the share link already carried", () => {
    const result = new URL(withUtm(`${SHARE_URL}?d=2026-01-01`, shareUtmFor("threads")));

    expect(result.searchParams.get("d")).toBe("2026-01-01");
    expect(result.searchParams.get("utm_source")).toBe("threads");
  });

  it("returns the input unchanged when it is not a valid url", () => {
    expect(withUtm("not a url", shareUtmFor("x"))).toBe("not a url");
  });
});

describe("shareIntentUrl", () => {
  it("puts the url in a dedicated parameter for X", () => {
    const intent = shareIntentUrl("x", SHARE_URL, "내 결과");

    expect(intent).not.toBeNull();
    const parsed = new URL(intent as string);
    expect(parsed.host).toBe("x.com");
    expect(parsed.searchParams.get("url")).toBe(SHARE_URL);
    expect(parsed.searchParams.get("text")).toBe("내 결과");
  });

  it("folds the url into the body for Threads, which has no url parameter", () => {
    const parsed = new URL(shareIntentUrl("threads", SHARE_URL, "내 결과") as string);

    expect(parsed.host).toBe("www.threads.net");
    expect(parsed.searchParams.get("text")).toBe(`내 결과 ${SHARE_URL}`);
  });

  it("sends only the url to Facebook, which reads the page's own OG tags", () => {
    const parsed = new URL(shareIntentUrl("facebook", SHARE_URL, "내 결과") as string);

    expect(parsed.searchParams.get("u")).toBe(SHARE_URL);
    expect(parsed.searchParams.get("text")).toBeNull();
  });

  it("has no intent url for Kakao because it needs the JS SDK", () => {
    expect(shareIntentUrl("kakao", SHARE_URL, "내 결과")).toBeNull();
  });
});

describe("shareMethodFor", () => {
  it("maps every target onto an analytics method of the same name", () => {
    expect(shareMethodFor("x")).toBe("x");
    expect(shareMethodFor("threads")).toBe("threads");
    expect(shareMethodFor("facebook")).toBe("facebook");
    expect(shareMethodFor("kakao")).toBe("kakao");
  });
});
