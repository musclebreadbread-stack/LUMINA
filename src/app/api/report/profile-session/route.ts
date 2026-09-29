import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locale";
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

function sessionCookie(name: string, value: string, path: string, secure: boolean): string {
  return `${name}=${value}; Path=${path}; Max-Age=${30 * 60}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
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
  const basePath = kind === "birth" ? "/r" : "/compatibility";
  // 기본 로케일(ko)은 URL 접두사가 없고 나머지는 /<locale>/... 로 열린다. 브라우저는 쿠키 경로가
  // 요청 경로의 접두사일 때만 쿠키를 보내므로, 경로마다 따로 저장하지 않으면 영어 등에서
  // 결과 페이지가 세션을 읽지 못해 404가 된다. Next의 cookies().set()은 이름이 같으면 마지막
  // 값 하나만 남기므로 Set-Cookie 헤더를 경로별로 직접 추가한다. 값은 base64url과 '.'뿐이라 인코딩이 필요 없다.
  const cookiePaths = [
    basePath,
    ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => `/${locale}${basePath}`),
  ];
  const response = Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  for (const path of cookiePaths) {
    response.headers.append("Set-Cookie", sessionCookie(reportProfileCookieName(kind), encryptedValue, path, origin.protocol === "https:"));
  }
  return response;
}
