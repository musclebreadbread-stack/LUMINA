import { ImageResponse } from "next/og";
import { getLocale } from "next-intl/server";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { buildTarotOgCard } from "@/lib/og/cards/tarot";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import type { Locale } from "@/i18n/locale";
import { SPREADS, type SpreadKey } from "@engine/tarot";

/**
 * 타로 결과 공유 카드 — 1200×630. spread·seed 두 경로 세그먼트만으로 그 자리에서
 * 다시 뽑으므로(buildTarotOgCard → buildTarotView, page.tsx와 같은 함수) 서버에
 * 저장해 둔 것이 없다. 날짜 의존이 없어 같은 링크는 언제 열어도 같은 카드라
 * 오래 캐시해도 안전하다.
 *
 * 잘못된 spread 키는 page.tsx처럼 notFound()를 부르지 않는다 — 크롤러·소셜
 * 플랫폼에는 500 대신 여전히 LUMINA 브랜드 카드를 줘야 한다.
 */

export const alt = "LUMINA 타로";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 31536000;

const SPREAD_KEYS: readonly SpreadKey[] = Object.keys(SPREADS) as readonly SpreadKey[];

function isSpreadKey(value: string): value is SpreadKey {
  return (SPREAD_KEYS as readonly string[]).includes(value);
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
  params: Promise<{ spread: string; seed: string }>;
}): Promise<ImageResponse> {
  const { spread, seed } = await params;
  if (!isSpreadKey(spread)) return brokenLinkImage();

  const locale = (await getLocale()) as Locale;

  try {
    const card = await buildTarotOgCard(spread, seed, locale);
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
