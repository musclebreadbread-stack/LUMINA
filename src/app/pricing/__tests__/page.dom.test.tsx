import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  locale: "ko" as string,
  saleState: { status: "hidden" } as
    | { status: "hidden" }
    | { status: "preview" | "live"; sale: { amount: number; currency: "KRW"; nameKo: string; nameEn: string } },
  plusSale: null as null | {
    monthly: { amount: number; currency: "KRW"; nameKo: string; nameEn: string };
    yearly: { amount: number; currency: "KRW"; nameKo: string; nameEn: string };
  },
}));

vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale }));
vi.mock("next/link", () => ({
  default: ({ children, href, className }: {
    readonly children: import("react").ReactNode;
    readonly href: string;
    readonly className?: string;
  }) => <a href={href} className={className}>{children}</a>,
}));
vi.mock("@/components/i18n/LocaleSwitcher", () => ({ LocaleSwitcher: () => null }));
vi.mock("@/components/ui/SceneShell", () => ({
  SceneShell: ({ children }: { readonly children: import("react").ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/seoAlternates", () => ({ buildAlternates: async () => ({}) }));
vi.mock("@/server/billing/service", () => ({ getSaju2027SaleState: async () => state.saleState }));
vi.mock("@/server/billing/subscriptions", () => ({ getActiveLuminaPlusSale: async () => state.plusSale }));

import PricingPage from "../page";

const SAJU_SALE = { amount: 9_900, currency: "KRW" as const, nameKo: "2027 신년운세 리포트", nameEn: "2027 Year Forecast Report" };
const PLUS_SALE = {
  monthly: { amount: 4_900, currency: "KRW" as const, nameKo: "LUMINA+ 월간", nameEn: "LUMINA+ Monthly" },
  yearly: { amount: 49_000, currency: "KRW" as const, nameKo: "LUMINA+ 연간", nameEn: "LUMINA+ Yearly" },
};

async function render(): Promise<string> {
  return renderToStaticMarkup(await PricingPage());
}

beforeEach(() => {
  state.locale = "ko";
  state.saleState = { status: "hidden" };
  state.plusSale = null;
});

describe("/pricing", () => {
  it("says nothing is on sale — and shows no price — when every product is hidden", async () => {
    const html = await render();
    expect(html).toContain("현재 판매 중인 유료 상품이 없습니다");
    expect(html).not.toMatch(/₩/u);
  });

  it("shows the saju-2027 report as coming soon in preview, linking to its page", async () => {
    state.saleState = { status: "preview", sale: SAJU_SALE };
    const html = await render();
    expect(html).toContain("판매 시작 예정");
    expect(html).toContain("2027 신년운세 리포트");
    expect(html).toMatch(/9,900/u);
    expect(html).toContain('href="/premium/saju-2027"');
    expect(html).not.toContain("현재 판매 중인 유료 상품이 없습니다");
  });

  it("marks the report as on sale when live", async () => {
    state.saleState = { status: "live", sale: SAJU_SALE };
    const html = await render();
    expect(html).toContain("판매 중");
    expect(html).not.toContain("판매 시작 예정");
  });

  it("lists both membership plans with their billing interval when subscriptions are on sale", async () => {
    state.plusSale = PLUS_SALE;
    const html = await render();
    expect(html).toContain("LUMINA+ 월간");
    expect(html).toContain("LUMINA+ 연간");
    expect(html).toContain("매월");
    expect(html).toContain("매년");
    expect(html).toMatch(/4,900/u);
    expect(html).toMatch(/49,000/u);
    expect(html).toContain('href="/plus"');
    expect(html).not.toContain("현재 판매 중인 유료 상품이 없습니다");
  });

  it("shows only the products that are actually offered", async () => {
    state.plusSale = PLUS_SALE;
    const html = await render();
    expect(html).not.toContain("2027 신년운세 리포트");
  });

  it("always links the refund policy, terms and privacy policy", async () => {
    const html = await render();
    expect(html).toContain('href="/refund-policy"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });

  it("renders English copy and locale-prefixed links for a non-default locale", async () => {
    state.locale = "en";
    state.saleState = { status: "preview", sale: SAJU_SALE };
    const html = await render();
    expect(html).toContain("Pricing");
    expect(html).toContain("Coming soon");
    expect(html).toContain("2027 Year Forecast Report");
    expect(html).toContain('href="/en/premium/saju-2027"');
    expect(html).toContain('href="/en/refund-policy"');
    expect(html).not.toContain("판매 시작 예정");
  });
});
