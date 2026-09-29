import { ImageResponse } from "next/og";
import { getLocale, getTranslations } from "next-intl/server";
import { stemAt } from "@engine/saju/constants";
import { pillarLabel } from "@engine/saju/pillars";
import { findIljuBySlug } from "@engine/saju/publicGuides";
import { buildSajuGuideOgCard } from "@/lib/og/cards/sajuGuide";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import { isLocale, type Locale } from "@/i18n/locale";

export const alt = "LUMINA 2027 정미년 일주별 사주 가이드";
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

export default async function Image({
  params,
}: {
  params: Promise<{ pillar: string }>;
}): Promise<ImageResponse> {
  const { pillar: slug } = await params;
  const pillar = findIljuBySlug(slug);
  if (!pillar) return brokenLinkImage();

  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";

  try {
    const [t, tCommon] = await Promise.all([
      getTranslations({ locale, namespace: "sajuGuidesPage" }),
      getTranslations({ locale, namespace: "common" }),
    ]);
    const stem = stemAt(pillar.stem);
    const hanja = pillarLabel(pillar, "hanja");
    const label = pillarLabel(pillar, locale === "ko" ? "ko" : "en");

    const card = buildSajuGuideOgCard({
      kicker: t("kicker"),
      headline: hanja,
      subheadline: t("iljuTitle", { hanja, label }),
      statusLabel: tCommon("tierCultural"),
      footerText: t("ogFooterNotice"),
      accentElement: stem.element,
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
