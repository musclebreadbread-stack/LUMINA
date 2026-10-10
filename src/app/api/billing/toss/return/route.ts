import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { isOneTimeProductKey, PRODUCT_CATALOG } from "@/server/billing/catalog";
import { BillingAccessError, BillingInputError, applyTossPaymentEvent, getOwnOrder } from "@/server/billing/service";
import { paymentEventHash } from "@/server/billing/service";
import { getPaymentProvider } from "@/server/billing/paymentProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PRODUCT_PATH = PRODUCT_CATALOG["saju-2027"].productPath;
const DEFAULT_REPORT_PATH = PRODUCT_CATALOG["saju-2027"].reportPath;

function localeFrom(url: URL): Locale {
  const value = url.searchParams.get("locale");
  return isLocale(value) ? value : "ko";
}

function productPathFor(productKey: string): string {
  return isOneTimeProductKey(productKey) ? PRODUCT_CATALOG[productKey].productPath : DEFAULT_PRODUCT_PATH;
}

function reportPathFor(productKey: string): string {
  return isOneTimeProductKey(productKey) ? PRODUCT_CATALOG[productKey].reportPath : DEFAULT_REPORT_PATH;
}

function redirectTo(request: Request, path: string, params: Readonly<Record<string, string>>): NextResponse {
  const target = new URL(path, request.url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function failed(request: Request, locale: Locale, productPath: string = DEFAULT_PRODUCT_PATH): NextResponse {
  return redirectTo(request, localePath(productPath, locale), { purchase: "failed" });
}

// The buyer's own browser session already exists (checkout requires sign-in), so
// landing on the report path straight away lets Track B3's own-order gate decide
// whether to show the report or the "open report" consent screen — no separate
// "open your account" hop needed.
function succeeded(request: Request, locale: Locale, orderId: string, productKey: string): NextResponse {
  return redirectTo(request, localePath(reportPathFor(productKey), locale), { order: orderId });
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const locale = localeFrom(url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const paymentKey = url.searchParams.get("paymentKey") ?? "";
  const amountValue = url.searchParams.get("amount") ?? "";
  if (!/^\d{1,9}$/u.test(amountValue) || !paymentKey || paymentKey.length > 200) return failed(request, locale);

  try {
    const order = await getOwnOrder(orderId);
    const amount = Number(amountValue);
    if (!Number.isSafeInteger(amount) || amount !== order.amount || order.currency !== "KRW") {
      return failed(request, locale, productPathFor(order.productKey));
    }
    if (order.status === "paid") return succeeded(request, locale, order.id, order.productKey);
    if (order.status !== "pending") return failed(request, locale, productPathFor(order.productKey));

    const provider = await getPaymentProvider();
    const payment = await provider.confirmPayment({ paymentKey, orderId, amount });
    if (payment.orderId !== order.id || payment.totalAmount !== order.amount || payment.currency !== order.currency) {
      return failed(request, locale, productPathFor(order.productKey));
    }
    const eventId = `return:${order.id}:${createHash("sha256").update(paymentKey).digest("hex")}`;
    await applyTossPaymentEvent({
      eventId,
      eventType: "RETURN_CONFIRMATION",
      payloadHash: paymentEventHash({ orderId: order.id, paymentKeyDigest: eventId.slice(-64), amount }),
      payment,
    });
    const confirmedOrder = await getOwnOrder(order.id);
    return confirmedOrder.status === "paid"
      ? succeeded(request, locale, confirmedOrder.id, confirmedOrder.productKey)
      : failed(request, locale, productPathFor(confirmedOrder.productKey));
  } catch (error) {
    if (error instanceof BillingAccessError || error instanceof BillingInputError) return failed(request, locale);
    return failed(request, locale);
  }
}
