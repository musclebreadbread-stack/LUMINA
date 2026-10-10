// Pure refund-eligibility logic, kept dependency-free (no "server-only", no pg, no
// crypto) so it can be unit tested without mocking the database or environment.
// The actual DB row that feeds this comes from `reserveRefund` in `service.ts`.

const SELF_SERVICE_REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RefundableOrder {
  readonly status: string;
  readonly viewedAt: Date | null;
  readonly paidAt: Date | null;
  readonly subscriptionInvoiceId: string | null;
}

/**
 * The self-service refund policy: an order qualifies only while it is paid,
 * unopened, within 7 days of payment, and — critically — not a subscription's
 * recurring invoice. A subscription invoice is charged automatically by the
 * sweeper rather than chosen at checkout, and cancelling it is the subscription
 * cancellation flow's job, not this endpoint's; without the last check a
 * subscriber who learns an order id could self-refund a recurring charge here,
 * bypassing the subscription's own cancellation terms. Anything that fails
 * this check still has the admin-refund path (`reserveAdminRefund`), which does
 * not enforce it.
 */
export function isSelfServiceRefundEligible(order: RefundableOrder, now: Date): boolean {
  if (order.status !== "paid") return false;
  if (order.viewedAt !== null) return false;
  if (order.subscriptionInvoiceId !== null) return false;
  if (!order.paidAt) return false;
  return now.getTime() - order.paidAt.getTime() <= SELF_SERVICE_REFUND_WINDOW_MS;
}
