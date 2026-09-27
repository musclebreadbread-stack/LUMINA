import { NextResponse } from "next/server";
import { cancelOwnSubscription } from "@/server/billing/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscriptionId") ?? "";
  await cancelOwnSubscription(subscriptionId).catch(() => undefined);
  const target = new URL("/plus", url);
  target.searchParams.set("subscription", "failed");
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
