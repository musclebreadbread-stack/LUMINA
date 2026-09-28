import { NextResponse } from "next/server";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { PRODUCT_CATALOG } from "@/server/billing/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PRODUCT_PATH = PRODUCT_CATALOG["saju-2027"].productPath;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const localeValue = url.searchParams.get("locale");
  const locale: Locale = isLocale(localeValue) ? localeValue : "ko";
  const target = new URL(localePath(DEFAULT_PRODUCT_PATH, locale), request.url);
  target.searchParams.set("purchase", "failed");
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
