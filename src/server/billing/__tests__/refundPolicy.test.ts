import { describe, expect, it } from "vitest";
import { isSelfServiceRefundEligible, type RefundableOrder } from "../refundPolicy";

const NOW = new Date("2026-10-15T00:00:00Z");

function order(overrides: Partial<RefundableOrder> = {}): RefundableOrder {
  return {
    status: "paid",
    viewedAt: null,
    paidAt: new Date("2026-10-10T00:00:00Z"), // 5 days before NOW
    subscriptionInvoiceId: null,
    ...overrides,
  };
}

describe("isSelfServiceRefundEligible", () => {
  it("allows a paid, unopened order within the 7-day window", () => {
    expect(isSelfServiceRefundEligible(order(), NOW)).toBe(true);
  });

  it("rejects a subscription invoice order, even if otherwise eligible", () => {
    // Regression test: a subscriber who learned an invoice's order id could
    // previously self-refund a recurring charge through this same API, bypassing
    // the subscription's own cancellation terms.
    expect(isSelfServiceRefundEligible(order({ subscriptionInvoiceId: "invoice-1" }), NOW)).toBe(false);
  });

  it("rejects an order that has already been viewed", () => {
    expect(isSelfServiceRefundEligible(order({ viewedAt: new Date("2026-10-11T00:00:00Z") }), NOW)).toBe(false);
  });

  it("rejects an order outside the 7-day window", () => {
    expect(isSelfServiceRefundEligible(order({ paidAt: new Date("2026-10-01T00:00:00Z") }), NOW)).toBe(false);
  });

  it("rejects an order that is not in the 'paid' status", () => {
    expect(isSelfServiceRefundEligible(order({ status: "refunding" }), NOW)).toBe(false);
    expect(isSelfServiceRefundEligible(order({ status: "pending" }), NOW)).toBe(false);
  });

  it("rejects an order with no paid_at timestamp", () => {
    expect(isSelfServiceRefundEligible(order({ paidAt: null }), NOW)).toBe(false);
  });

  it("allows an order exactly at the 7-day boundary", () => {
    const paidAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(isSelfServiceRefundEligible(order({ paidAt }), NOW)).toBe(true);
  });

  it("rejects an order one millisecond past the 7-day boundary", () => {
    const paidAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 1);
    expect(isSelfServiceRefundEligible(order({ paidAt }), NOW)).toBe(false);
  });
});
