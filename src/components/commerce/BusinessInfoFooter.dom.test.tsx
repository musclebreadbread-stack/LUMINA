import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessInfoFooter } from "./BusinessInfoFooter";

const SELLER_ENVIRONMENT = {
  NEXT_PUBLIC_SELLER_NAME: "합성상호",
  NEXT_PUBLIC_SELLER_REPRESENTATIVE: "합성대표",
  NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER: "000-00-00000",
  NEXT_PUBLIC_SELLER_MAIL_ORDER_NUMBER: "제2026-합성-0000호",
  NEXT_PUBLIC_SELLER_ADDRESS: "합성시 합성구 합성로 1",
  NEXT_PUBLIC_SELLER_PHONE: "000-0000-0000",
  NEXT_PUBLIC_SELLER_CONTACT_EMAIL: "help@example.invalid",
  NEXT_PUBLIC_HOSTING_PROVIDER: "합성호스팅",
} as const;

function render(locale: string): string {
  return renderToStaticMarkup(<BusinessInfoFooter locale={locale} />);
}

describe("BusinessInfoFooter", () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries(SELLER_ENVIRONMENT)) vi.stubEnv(name, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows every seller disclosure required at the bottom of a Korean mail-order site", () => {
    const html = render("ko");

    expect(html).toContain("상호 합성상호");
    expect(html).toContain("대표자 합성대표");
    expect(html).toContain("사업자등록번호 000-00-00000");
    expect(html).toContain("통신판매업 신고번호 제2026-합성-0000호");
    expect(html).toContain("주소 합성시 합성구 합성로 1");
    expect(html).toContain("고객센터 000-0000-0000");
    expect(html).toContain('href="mailto:help@example.invalid"');
    expect(html).toContain("호스팅 제공자 합성호스팅");
  });

  it("labels the same disclosures in English for non-Korean locales", () => {
    const html = render("en");

    expect(html).toContain("Business name 합성상호");
    expect(html).toContain("Mail-order registration 제2026-합성-0000호");
    expect(html).toContain("Hosting provider 합성호스팅");
  });

  it.each(Object.keys(SELLER_ENVIRONMENT))("renders nothing while %s is missing so partial seller data is never shown", (name) => {
    vi.stubEnv(name, " ");

    expect(render("ko")).toBe("");
  });
});
