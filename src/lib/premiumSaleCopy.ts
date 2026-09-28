import type { ActiveSaju2027Sale } from "@/server/billing/service";

export interface PremiumSaleCopyKeys {
  readonly eyebrowKey: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly linkKey: string;
}

/**
 * sale 유무 → yearlyReport 네임스페이스의 어떤 키를 쓸지 고르는 순수 함수.
 *
 * hidden/preview/live 3단계를 지금 만들지 않는다 — getActiveSaju2027Sale()이
 * 오늘은 이진값이고(billingCheckoutReady()가 꺼져 있으면 무조건 null), DB에도
 * "preview"를 구분할 근거가 없다. Track C5(결제 페이지 자체)에서 진짜 개념이
 * 생기면 이 함수의 입력 타입만 넓히면 된다 — PremiumTeaser·PremiumSaleBanner는
 * 손대지 않아도 된다.
 */
export function premiumSaleCopyKeys(sale: ActiveSaju2027Sale | null): PremiumSaleCopyKeys {
  if (sale) {
    return {
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserSaleTitle",
      descriptionKey: "teaserSaleDescription",
      linkKey: "teaserSaleLink",
    };
  }
  return {
    eyebrowKey: "teaserEyebrow",
    titleKey: "teaserTitle",
    descriptionKey: "teaserDescription",
    linkKey: "teaserLink",
  };
}
