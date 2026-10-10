import { describe, expect, it } from "vitest";
import { premiumSaleCopyKeys } from "../premiumSaleCopy";

const SALE = { amount: 9_900, currency: "KRW" as const, nameKo: "2027 신년운세", nameEn: "2027 Yearly Report" };

describe("premiumSaleCopyKeys", () => {
  it("picks the sale copy keys for a live state", () => {
    expect(premiumSaleCopyKeys({ status: "live", sale: SALE })).toEqual({
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserSaleTitle",
      descriptionKey: "teaserSaleDescription",
      linkKey: "teaserSaleLink",
    });
  });

  it("picks the preview copy keys for a preview state", () => {
    expect(premiumSaleCopyKeys({ status: "preview", sale: SALE })).toEqual({
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserPreviewTitle",
      descriptionKey: "teaserPreviewDescription",
      linkKey: "teaserPreviewLink",
    });
  });

  it("picks the default 'in preparation' copy keys for a hidden state", () => {
    expect(premiumSaleCopyKeys({ status: "hidden" })).toEqual({
      eyebrowKey: "teaserEyebrow",
      titleKey: "teaserTitle",
      descriptionKey: "teaserDescription",
      linkKey: "teaserLink",
    });
  });
});
