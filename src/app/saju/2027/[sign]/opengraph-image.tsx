import { ImageResponse } from "next/og";
import { getLocale, getTranslations } from "next-intl/server";
import { CHINESE_SIGNS } from "@engine/horoscope/constants";
import { branchAt } from "@engine/saju/constants";
import { buildSajuGuideOgCard } from "@/lib/og/cards/sajuGuide";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import { isLocale, type Locale } from "@/i18n/locale";

export const alt = "LUMINA 2027 정미년 띠별 사주 가이드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 31536000;

function findSignIndex(key: string): number {
  return CHINESE_SIGNS.findIndex((sign) => sign.key === key);
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
  params: Promise<{ sign: string }>;
}): Promise<ImageResponse> {
  const { sign: signKey } = await params;
  const index = findSignIndex(signKey);
  if (index === -1) return brokenLinkImage();
  const sign = CHINESE_SIGNS[index];
  if (!sign) return brokenLinkImage();

  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";

  try {
    const [t, tCommon] = await Promise.all([
      getTranslations({ locale, namespace: "sajuGuidesPage" }),
      getTranslations({ locale, namespace: "common" }),
    ]);
    const branch = branchAt(index);
    const signName = locale === "ko" ? sign.ko : sign.en;

    const card = buildSajuGuideOgCard({
      kicker: t("kicker"),
      headline: branch.hanja,
      subheadline: t("signTitle", { sign: signName }),
      statusLabel: tCommon("tierCultural"),
      footerText: t("ogFooterNotice"),
      accentElement: branch.element,
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
