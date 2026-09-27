import { cookies } from "next/headers";
import { z } from "zod";
import { memberProfileSchema } from "@/server/member/profileSchema";
import { encryptReportProfileSession, reportProfileCookieName } from "@/server/reportProfileSession";
import { readBoundedJson } from "@/server/http/readBoundedJson";

export const runtime = "nodejs";

const reportProfileSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("birth"), profile: memberProfileSchema }).strict(),
  z.object({
    kind: z.literal("compatibility"),
    first: memberProfileSchema,
    second: memberProfileSchema,
  }).strict(),
]);

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function reportOrigin(): URL | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
    if (process.env.APP_ENV !== "development" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const origin = reportOrigin();
  if (!origin) return errorResponse(503, "report_session_unavailable");
  if (request.headers.get("origin") !== origin.origin) return errorResponse(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return errorResponse(415, "json_required");
  }

  const body = await readBoundedJson(request, 8_192);
  if (!body.ok) return errorResponse(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = reportProfileSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "invalid_report_profile");

  let encryptedValue: string;
  try {
    encryptedValue = encryptReportProfileSession(parsed.data);
  } catch {
    return errorResponse(503, "report_session_unavailable");
  }

  const kind = parsed.data.kind;
  const cookiePath = kind === "birth" ? "/r" : "/compatibility";
  const cookieStore = await cookies();
  cookieStore.set(reportProfileCookieName(kind), encryptedValue, {
    httpOnly: true,
    secure: origin.protocol === "https:",
    sameSite: "lax",
    path: cookiePath,
    maxAge: 30 * 60,
  });

  return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
}
