import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { default: sitemap } = await import("../sitemap");

/**
 * `/saju/2027`'s sitemap entry drives whether Google ever discovers
 * `/en/saju/2027` — the growth task's whole premise is that this alternate keeps
 * being emitted correctly. This pins that invariant and the privacy boundary
 * (no personally-identifiable result page — e.g. a member's bound report — ever
 * gets a sitemap entry).
 */
describe("sitemap — /saju/2027 + its /en alternate", () => {
  const entries = sitemap();

  function entryFor(koreanPathname: string) {
    const match = entries.find((entry) => new URL(entry.url).pathname === koreanPathname);
    if (!match) throw new Error(`no sitemap entry for ${koreanPathname}`);
    return match;
  }

  function languageUrl(languages: Record<string, string> | undefined, locale: string): string {
    const url = languages?.[locale];
    if (!url) throw new Error(`no "${locale}" alternate`);
    return url;
  }

  it("lists the Korean /saju/2027 hub at the unprefixed canonical path", () => {
    const entry = entryFor("/saju/2027");
    expect(new URL(entry.url).pathname).toBe("/saju/2027");
  });

  it("emits an /en/saju/2027 hreflang alternate alongside the Korean canonical", () => {
    const entry = entryFor("/saju/2027");
    const languages = entry.alternates?.languages as Record<string, string> | undefined;
    expect(languages).toBeDefined();
    expect(new URL(languageUrl(languages, "ko")).pathname).toBe("/saju/2027");
    expect(new URL(languageUrl(languages, "en")).pathname).toBe("/en/saju/2027");
    expect(new URL(languageUrl(languages, "x-default")).pathname).toBe("/saju/2027");
  });

  it("every saju 2027 zodiac-sign guide page also carries its /en alternate", () => {
    const signEntry = entries.find((entry) => new URL(entry.url).pathname.startsWith("/saju/2027/"));
    expect(signEntry).toBeDefined();
    const languages = signEntry!.alternates?.languages as Record<string, string> | undefined;
    const koPath = new URL(signEntry!.url).pathname;
    expect(new URL(languageUrl(languages, "en")).pathname).toBe(`/en${koPath}`);
  });

  it("never lists a personally-identifiable result path (bound reports, accounts, admin)", () => {
    const paths = entries.map((entry) => new URL(entry.url).pathname);
    for (const path of paths) {
      expect(path).not.toMatch(/\/(account|admin)(\/|$)/u);
      expect(path).not.toMatch(/\/premium\/saju-2027\/report/u);
      expect(path).not.toMatch(/[?&](profile|session|order)=/u);
    }
  });
});
