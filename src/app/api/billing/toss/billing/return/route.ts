import { NextResponse } from "next/server";
import { completeSubscriptionBillingAuthorization } from "@/server/billing/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function destination(request: Request, result: "pending" | "failed"): NextResponse {
  const target = new URL("/plus", request.url);
  target.searchParams.set("subscription", result);
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscriptionId") ?? "";
  const authKey = url.searchParams.get("authKey") ?? "";
  const customerKey = url.searchParams.get("customerKey") ?? "";
  try {
    await completeSubscriptionBillingAuthorization({ subscriptionId, authKey, customerKey });
    return destination(request, "pending");
  } catch {
    return destination(request, "failed");
  }
}
