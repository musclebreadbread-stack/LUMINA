import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locale";
import { createPrivateShareHeaderRules, PRIVATE_SHARE_HEADER_SOURCES } from "../privateShareHeaders";

describe("private share response headers", () => {
  it("covers both public share route families for every configured locale", () => {
    const sources = new Set(PRIVATE_SHARE_HEADER_SOURCES);

    for (const locale of LOCALES) {
      const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
      expect(sources.has(`${prefix}/p/:path*`)).toBe(true);
      expect(sources.has(`${prefix}/r/:path*`)).toBe(true);
    }
  });

  it("prevents referrer disclosure and storage for every share rule", () => {
    const rules = createPrivateShareHeaderRules();

    expect(rules).toHaveLength(LOCALES.length * 2);
    for (const rule of rules) {
      expect(rule.headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
      expect(rule.headers).toContainEqual({ key: "Cache-Control", value: "private, no-store" });
    }
  });
});
