import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { BillingAccessError, BillingInputError, applyTossPaymentEvent, getOwnOrder } from "@/server/billing/service";
import { paymentEventHash } from "@/server/billing/service";
import { getPaymentProvider } from "@/server/billing/paymentProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function destination(request: Request, result: "success" | "failed"): NextResponse {
  const target = new URL("/premium/saju-2027", request.url);
  target.searchParams.set("purchase", result);
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const paymentKey = url.searchParams.get("paymentKey") ?? "";
  const amountValue = url.searchParams.get("amount") ?? "";
  if (!/^\d{1,9}$/u.test(amountValue) || !paymentKey || paymentKey.length > 200) return destination(request, "failed");

  try {
    const order = await getOwnOrder(orderId);
    const amount = Number(amountValue);
    if (!Number.isSafeInteger(amount) || amount !== order.amount || order.currency !== "KRW") {
      return destination(request, "failed");
    }
    if (order.status === "paid") return destination(request, "success");
    if (order.status !== "pending") return destination(request, "failed");

    const provider = await getPaymentProvider();
    const payment = await provider.confirmPayment({ paymentKey, orderId, amount });
    if (payment.orderId !== order.id || payment.totalAmount !== order.amount || payment.currency !== order.currency) {
      return destination(request, "failed");
    }
    const eventId = `return:${order.id}:${createHash("sha256").update(paymentKey).digest("hex")}`;
    await applyTossPaymentEvent({
      eventId,
      eventType: "RETURN_CONFIRMATION",
      payloadHash: paymentEventHash({ orderId: order.id, paymentKeyDigest: eventId.slice(-64), amount }),
      payment,
    });
    const confirmedOrder = await getOwnOrder(order.id);
    return destination(request, confirmedOrder.status === "paid" ? "success" : "failed");
  } catch (error) {
    if (error instanceof BillingAccessError || error instanceof BillingInputError) return destination(request, "failed");
    return destination(request, "failed");
  }
}
