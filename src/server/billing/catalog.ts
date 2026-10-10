import "server-only";

/**
 * The single source of truth for "what does owning this product mean" — separate
 * from billing.products/billing.prices, which only track price and commercial
 * availability (see scripts/billing-product-admin.mjs). Deliberately holds only
 * products this app actually knows how to fulfill today (saju-2027 and the two
 * LUMINA+ tiers); billing.products' other seeded-but-unbuilt rows (saju-deep,
 * compatibility-deep, ...) get a catalog entry once their report pages exist.
 */

export const ONE_TIME_PRODUCT_KEYS = ["saju-2027"] as const;
export const SUBSCRIPTION_PRODUCT_KEYS = ["lumina-plus-monthly", "lumina-plus-yearly"] as const;
export const PRODUCT_KEYS = [...ONE_TIME_PRODUCT_KEYS, ...SUBSCRIPTION_PRODUCT_KEYS] as const;

export type OneTimeProductKey = (typeof ONE_TIME_PRODUCT_KEYS)[number];
export type SubscriptionProductKey = (typeof SUBSCRIPTION_PRODUCT_KEYS)[number];
export type ProductKey = (typeof PRODUCT_KEYS)[number];

export interface ProductCatalogEntry {
  readonly key: ProductKey;
  readonly type: "one_time" | "subscription";
  /** How many birth profiles a purchase of this product needs bound to it (Track B2). */
  readonly requiredProfiles: number;
  /** The sales/landing page for this product. */
  readonly productPath: string;
  /** Where an entitled buyer goes to read what they bought. */
  readonly reportPath: string;
  /** Whether the standard self-service refund window (refundPolicy.ts) applies at all. */
  readonly selfRefundable: boolean;
  /** Which LUMINA+ subscription tiers grant this product's entitlement for free. */
  readonly includedInPlus: readonly SubscriptionProductKey[];
}

export const PRODUCT_CATALOG: Readonly<Record<ProductKey, ProductCatalogEntry>> = Object.freeze({
  "saju-2027": Object.freeze({
    key: "saju-2027",
    type: "one_time",
    requiredProfiles: 1,
    productPath: "/premium/saju-2027",
    reportPath: "/premium/saju-2027/report",
    selfRefundable: true,
    includedInPlus: SUBSCRIPTION_PRODUCT_KEYS,
  }),
  "lumina-plus-monthly": Object.freeze({
    key: "lumina-plus-monthly",
    type: "subscription",
    requiredProfiles: 1,
    productPath: "/plus",
    reportPath: "/account/subscriptions",
    selfRefundable: false,
    includedInPlus: Object.freeze([]),
  }),
  "lumina-plus-yearly": Object.freeze({
    key: "lumina-plus-yearly",
    type: "subscription",
    requiredProfiles: 1,
    productPath: "/plus",
    reportPath: "/account/subscriptions",
    selfRefundable: false,
    includedInPlus: Object.freeze([]),
  }),
});

export function isProductKey(value: string): value is ProductKey {
  return (PRODUCT_KEYS as readonly string[]).includes(value);
}

export function isOneTimeProductKey(value: string): value is OneTimeProductKey {
  return (ONE_TIME_PRODUCT_KEYS as readonly string[]).includes(value);
}
