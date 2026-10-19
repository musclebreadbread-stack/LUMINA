import { describe, expect, it } from "vitest";
import en from "../../../../../messages/en.json";
import ko from "../../../../../messages/ko.json";

/**
 * Year of the Fire Goat 2027 — English SEO landing (`/en/saju/2027`).
 *
 * `page.tsx` renders `t("hubTitle")` as both the metadata title and the H1, and
 * `t("hubDescription")` / `t("hubIntro")` as the metadata description and the lede
 * paragraph. Pinning the message catalog values here is the cheapest way to lock
 * the exact search phrase and the cultural-accuracy guardrails without having to
 * stand up next-intl's server request machinery in a component test.
 */
describe("sajuGuidesPage (en) — Year of the Fire Goat 2027", () => {
  const hub = en.sajuGuidesPage;

  it("includes the exact search phrase \"Year of the Fire Goat 2027\" in the title (also used as H1)", () => {
    expect(hub.hubTitle).toContain("Year of the Fire Goat 2027");
  });

  it("keeps the Ding-Wei (丁未) saju framing alongside the search phrase", () => {
    expect(hub.hubTitle).toContain("Ding-Wei");
    expect(hub.hubTitle).toContain("丁未");
  });

  it("description explains the Ipchun year boundary, the Ding-Wei/Wei relation, and does not overreach", () => {
    expect(hub.hubDescription).toContain("Ipchun");
    expect(hub.hubDescription).toContain("Ding-Wei");
    expect(hub.hubDescription).toContain("丁未");
    expect(hub.hubDescription).not.toMatch(/will (happen|bring)|guarantee|certain(ly)?|destin(y|ed)/iu);
  });

  it("body intro explains the Ipchun boundary, the Wei (未, Goat) relation, and frames results as calculation-bounded, not prophecy", () => {
    expect(hub.hubIntro).toContain("Ipchun");
    expect(hub.hubIntro).toContain("Wei");
    expect(hub.hubIntro).toContain("未");
    expect(hub.hubIntro.toLowerCase()).toContain("not a forecast of what will happen");
    expect(hub.hubIntro).not.toMatch(/guarantee|certain(ly)?|destin(y|ed)/iu);
  });

  it("kicker also carries the search phrase", () => {
    expect(hub.kicker).toContain("Year of the Fire Goat 2027");
  });

  it("og footer notice still disclaims prediction (unchanged guardrail)", () => {
    expect(hub.ogFooterNotice).toContain("not a prediction");
  });

  it("does not touch the Korean hub copy — ko.json keeps its own title/intro/description", () => {
    expect(ko.sajuGuidesPage.hubTitle).toBe("2027년 정미년(丁未) 사주 가이드");
    expect(ko.sajuGuidesPage.hubTitle).not.toContain("Year of the Fire Goat");
    expect(ko.sajuGuidesPage.hubDescription).toContain("십신");
    expect(ko.sajuGuidesPage.hubIntro).toContain("정미년");
  });
});
