import { ImageResponse } from "next/og";
import { getLocale, getTranslations } from "next-intl/server";
import { pillarLabel } from "@engine/saju/pillars";
import { YEAR_2027_PILLAR } from "@engine/saju/publicGuides";
import { buildSajuGuideOgCard } from "@/lib/og/cards/sajuGuide";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import { isLocale, type Locale } from "@/i18n/locale";

export const alt = "LUMINA 2027 정미년 사주 가이드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 31536000;

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

export default async function Image(): Promise<ImageResponse> {
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";

  try {
    const [t, tCommon] = await Promise.all([
      getTranslations({ locale, namespace: "sajuGuidesPage" }),
      getTranslations({ locale, namespace: "common" }),
    ]);

    const card = buildSajuGuideOgCard({
      kicker: t("kicker"),
      headline: pillarLabel(YEAR_2027_PILLAR, "hanja"),
      subheadline: t("hubTitle"),
      statusLabel: tCommon("tierCultural"),
      footerText: t("ogFooterNotice"),
    });
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
