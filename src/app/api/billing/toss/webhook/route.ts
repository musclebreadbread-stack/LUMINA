import { createHash } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { applyTossPaymentEvent } from "@/server/billing/service";
import { getPaymentProvider } from "@/server/billing/paymentProvider";
import { readBoundedBody } from "@/server/http/readBoundedJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  eventType: z.string().min(1).max(100),
  data: z.object({ orderId: z.string().uuid() }).passthrough(),
}).passthrough();

function json(status: number, value: Readonly<Record<string, boolean | string>>): NextResponse {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return json(415, { error: "json_required" });
  }
  const transmissionId = request.headers.get("tosspayments-webhook-transmission-id")?.trim() ?? "";
  if (!/^[A-Za-z0-9:_-]{1,200}$/u.test(transmissionId)) return json(400, { error: "invalid_event" });
  const raw = await readBoundedBody(request, 32_768);
  if (!raw.ok) return json(raw.status, { error: raw.status === 413 ? "request_too_large" : "invalid_event" });
  let bodyValue: unknown;
  try {
    bodyValue = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw.bytes)) as unknown;
  } catch {
    return json(400, { error: "invalid_event" });
  }
  const parsed = webhookSchema.safeParse(bodyValue);
  if (!parsed.success) return json(400, { error: "invalid_event" });
  if (parsed.data.eventType !== "PAYMENT_STATUS_CHANGED") return json(200, { ok: true });

  try {
    const provider = await getPaymentProvider();
    const payment = await provider.getPaymentByOrder(parsed.data.data.orderId);
    if (payment.orderId !== parsed.data.data.orderId) return json(200, { ok: true });
    await applyTossPaymentEvent({
      eventId: transmissionId,
      eventType: parsed.data.eventType,
      payloadHash: createHash("sha256").update(raw.bytes).digest(),
      payment,
    });
    return json(200, { ok: true });
  } catch {
    return json(503, { error: "webhook_processing_failed" });
  }
}
