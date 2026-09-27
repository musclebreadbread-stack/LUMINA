import { z } from "zod";
import {
  createPendingSubscription,
  SubscriptionAccessError,
  SubscriptionInputError,
} from "@/server/billing/subscriptions";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { LOCALES } from "@/i18n/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  productKey: z.enum(["lumina-plus-monthly", "lumina-plus-yearly"]),
  locale: z.enum(LOCALES),
  acceptedSubscriptionTerms: z.literal(true),
  acceptedAutomaticRenewal: z.literal(true),
  acceptedRenewalPrice: z.literal(true),
}).strict();

function response(status: number, error: string): Response {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

function isSameOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return response(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) return response(415, "json_required");
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return response(body.status, "invalid_request");
  const parsed = requestSchema.safeParse(body.value);
  if (!parsed.success) return response(400, "invalid_request");
  try {
    const checkout = await createPendingSubscription(parsed.data);
    return Response.json(checkout, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      const status = error.reason === "authentication_required" ? 401 : error.reason === "consent_required" ? 403 : 503;
      return response(status, error.reason);
    }
    if (error instanceof SubscriptionInputError) return response(409, error.reason);
    return response(503, "subscription_unavailable");
  }
}
