import { z } from "zod";
import { BillingAccessError, BillingInputError, createPendingOrder } from "@/server/billing/service";
import { ONE_TIME_PRODUCT_KEYS } from "@/server/billing/catalog";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";
import { claimOwnLocalData } from "@/server/member/dal";
import { memberProfileSchema } from "@/server/member/profileSchema";
import { LOCALES } from "@/i18n/locale";
import { sanitizeAttribution } from "@/lib/attributionPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderSchema = z.object({
  productKey: z.enum(ONE_TIME_PRODUCT_KEYS),
  locale: z.enum(LOCALES),
  acceptedPurchaseTerms: z.literal(true),
  acceptedWithdrawalNotice: z.literal(true),
  acceptedEuWithdrawalWaiver: z.boolean(),
  // Track C2: lets checkout succeed for a member who has a birth profile in
  // their browser (from the free analysis) but never explicitly saved one to
  // their account. Only ever used as a one-time fallback — see the retry below.
  profileSnapshot: memberProfileSchema.optional(),
  // Track D7: first-touch channel. The values here are only bounded, not trusted —
  // sanitizeAttribution() below re-normalizes every field before anything is stored.
  attribution: z.object({
    source: z.string().max(200).nullable(),
    medium: z.string().max(200).nullable(),
    campaign: z.string().max(200).nullable(),
    landingPath: z.string().max(512),
  }).strict().optional(),
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
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return response(415, "json_required");
  }
  // A saved birth profile (place labels up to 100 chars each, multi-byte in Korean) plus
  // the optional attribution block can exceed the earlier 2 KiB ceiling.
  const body = await readBoundedJson(request, 4_096);
  if (!body.ok) return response(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = orderSchema.safeParse(body.value);
  if (!parsed.success) return response(400, "invalid_request");
  const country = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
  const orderInput = {
    productKey: parsed.data.productKey,
    locale: parsed.data.locale,
    acceptedPurchaseTerms: parsed.data.acceptedPurchaseTerms,
    acceptedWithdrawalNotice: parsed.data.acceptedWithdrawalNotice,
    acceptedEuWithdrawalWaiver: parsed.data.acceptedEuWithdrawalWaiver,
    countryCode: country && /^[A-Z]{2}$/u.test(country) ? country : null,
    attribution: parsed.data.attribution ? sanitizeAttribution(parsed.data.attribution) : null,
  };
  try {
    let order;
    try {
      order = await createPendingOrder(orderInput);
    } catch (error) {
      // Track C2: a member with no saved profile yet, but who sent one from
      // their browser's free-analysis data, gets exactly one automatic retry
      // after that data is claimed as their account profile — this never
      // overwrites an existing saved profile, since createPendingOrder only
      // fails this way when none exists.
      if (error instanceof BillingInputError && error.reason === "profile_required" && parsed.data.profileSnapshot) {
        await claimOwnLocalData(parsed.data.profileSnapshot, []);
        order = await createPendingOrder(orderInput);
      } else {
        throw error;
      }
    }
    return Response.json(order, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof BillingAccessError) {
      const status = error.reason === "authentication_required" ? 401 : error.reason === "consent_required" ? 403 : 503;
      return response(status, error.reason);
    }
    if (error instanceof BillingInputError) return response(400, error.reason);
    // An unexpected failure here (e.g. a missing database grant) otherwise fails
    // silently as a generic 503 — nobody finds out until a person notices orders
    // aren't being created.
    await captureServerError(error, "billing-order");
    return response(503, "billing_unavailable");
  }
}
