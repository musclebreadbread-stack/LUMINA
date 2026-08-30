import { ImageResponse } from "next/og";
import { getLocale } from "next-intl/server";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { buildHoroscopeOgCard } from "@/lib/og/cards/horoscope";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import type { Locale } from "@/i18n/locale";
import { findSign, type HoroscopeSystem } from "@engine/horoscope";

/**
 * 오늘의 운세 공유 카드 — 1200×630. system·sign 두 경로 세그먼트만으로 정해지는
 * 날짜 없는 카드다(buildHoroscopeOgCard 주석 참고) — page.tsx가 쓰는
 * computeDailyReading은 여기서 절대 부르지 않는다.
 *
 * 잘못된 system/sign 값은 page.tsx처럼 notFound()를 부르지 않는다 — 크롤러·소셜
 * 플랫폼에는 500 대신 여전히 LUMINA 브랜드 카드를 줘야 한다.
 */

export const alt = "LUMINA 오늘의 운세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 31536000;

function isSystem(value: string): value is HoroscopeSystem {
  return value === "zodiac" || value === "chinese";
}

function brokenLinkImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: HOBUN,
          fontSize: 56,
          letterSpacing: 18,
        }}
      >
        LUMINA
      </div>
    ),
    size,
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ system: string; sign: string }>;
}): Promise<ImageResponse> {
  const { system, sign } = await params;
  if (!isSystem(system)) return brokenLinkImage();

  const signDef = findSign(system, sign);
  if (!signDef) return brokenLinkImage();

  const locale = (await getLocale()) as Locale;

  try {
    const card = await buildHoroscopeOgCard(system, signDef, locale);
    const frame = renderOgFrame({
      statusLabel: card.statusLabel,
      footerText: card.footerText,
      centerContent: card.centerContent,
      centerSerifText: card.serifText,
      centerSansText: card.sansText,
    });
    const fonts = await loadOgFonts({ serifText: frame.serifText, sansText: frame.sansText });
    return new ImageResponse(frame.node, { ...size, fonts: fonts.length ? [...fonts] : undefined });
  } catch {
    return brokenLinkImage();
  }
}
