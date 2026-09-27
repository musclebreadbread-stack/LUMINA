import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchReceiptEmails } from "@/server/billing/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.BILLING_CRON_SECRET;
  if (typeof secret !== "string" || secret.length < 32) return false;
  const authorization = request.headers.get("authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (process.env.APP_ENV !== "production"
    || process.env.BILLING_RECEIPTS_ENABLED !== "true"
    || process.env.BILLING_LEGAL_DOCUMENTS_APPROVED !== "true"
    || !process.env.BILLING_DATABASE_URL) {
    return NextResponse.json({ error: "billing_receipts_disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await dispatchReceiptEmails(5);
    if (result.failed > 0) {
      return NextResponse.json({ error: "receipt_dispatch_incomplete", ...result }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "receipt_dispatch_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
