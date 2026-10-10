import type { Saju2027SaleState } from "@/server/billing/service";

export interface PremiumSaleCopyKeys {
  readonly eyebrowKey: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly linkKey: string;
}

/** Sale state (Track C5: hidden/preview/live) → which yearlyReport-namespace keys to use. Pure function. */
export function premiumSaleCopyKeys(state: Saju2027SaleState): PremiumSaleCopyKeys {
  if (state.status === "live") {
    return {
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserSaleTitle",
      descriptionKey: "teaserSaleDescription",
      linkKey: "teaserSaleLink",
    };
  }
  if (state.status === "preview") {
    return {
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserPreviewTitle",
      descriptionKey: "teaserPreviewDescription",
      linkKey: "teaserPreviewLink",
    };
  }
  return {
    eyebrowKey: "teaserEyebrow",
    titleKey: "teaserTitle",
    descriptionKey: "teaserDescription",
    linkKey: "teaserLink",
  };
}
