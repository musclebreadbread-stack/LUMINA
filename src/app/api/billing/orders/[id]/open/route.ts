import { NextResponse } from "next/server";
import { isOneTimeProductKey, PRODUCT_CATALOG } from "@/server/billing/catalog";
import { BillingAccessError, BillingInputError, getOwnOrder, markOwnEntitlementViewed } from "@/server/billing/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This is the moment a purchased report is actually opened, and per 전자상거래법
// the point where the digital-content withdrawal right ends — it must only fire
// from a genuine user action, never a page render (link previews, prefetch,
// crawlers). A plain GET to the report page can no longer trigger it; only this
// same-origin POST, submitted from the report page's own "open report" gate, can.
function isSameOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL ?? "").origin;
  } catch {
    return false;
  }
}

function redirectTo(request: Request, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  if (!isSameOrigin(request)) return redirectTo(request, "/account");
  const { id } = await context.params;

  try {
    const order = await getOwnOrder(id);
    if (order.status !== "paid" || !isOneTimeProductKey(order.productKey)) {
      return redirectTo(request, "/account");
    }
    await markOwnEntitlementViewed(order.productKey);
    return redirectTo(request, PRODUCT_CATALOG[order.productKey].reportPath);
  } catch (error) {
    if (error instanceof BillingAccessError || error instanceof BillingInputError) {
      return redirectTo(request, "/account");
    }
    throw error;
  }
}
