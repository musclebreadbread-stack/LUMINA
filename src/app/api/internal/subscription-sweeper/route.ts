import { timingSafeEqual } from "node:crypto";
import {
  cleanupTerminatedSubscriptionBillingKeys,
  expireCancelledSubscriptions,
  expireStalePendingSubscriptions,
  processDueSubscriptionInvoices,
  queueSubscriptionRenewals,
} from "@/server/billing/subscriptions";
import { dispatchSubscriptionNotices } from "@/server/billing/subscriptionNotices";
import { billingJobsAllowed } from "@/server/billing/environment";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.SUBSCRIPTION_CRON_SECRET;
  const candidate = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "") ?? "";
  if (!expected || expected.length < 32 || /[\r\n]/u.test(expected)) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}

function disabled(): Response {
  return Response.json({ error: "subscription_worker_disabled" }, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, {
    status: 401,
    headers: { "Cache-Control": "no-store" },
  });
  if (!billingJobsAllowed()
    || process.env.SUBSCRIPTION_ENABLED !== "true"
    || process.env.SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED !== "true"
    || process.env.TOSS_BILLING_APPROVED !== "true") return disabled();

  try {
    const renewalsQueued = await queueSubscriptionRenewals(50);
    const notices = await dispatchSubscriptionNotices(10);
    const invoices = await processDueSubscriptionInvoices(3);
    const subscriptionsExpired = await expireCancelledSubscriptions(50);
    const pendingExpired = await expireStalePendingSubscriptions(50);
    const billingKeysDeleted = await cleanupTerminatedSubscriptionBillingKeys(5);
    return Response.json({
      renewalsQueued,
      invoices,
      subscriptionsExpired,
      pendingExpired,
      billingKeysDeleted,
      notices,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await captureServerError(error, "internal-cron");
    return Response.json({ error: "subscription_worker_failed" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
