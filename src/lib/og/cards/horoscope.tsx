import { getTranslations } from "next-intl/server";
import type { HoroscopeSign, HoroscopeSystem } from "@engine/horoscope";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import type { Locale } from "@/i18n/locale";

/**
 * 오늘의 운세 공유 카드의 가운데 콘텐츠.
 *
 * opengraph-image는 "?d=" 쿼리를 못 읽고 소셜 플랫폼이 이미지를 오래 캐시하므로,
 * 실제 오늘자 리딩(computeDailyReading)은 절대 계산하지 않는다 — (체계, 별자리/띠)
 * 쌍만으로 정해지는 삽화·표시 이름·고정 문구만 그려 몇 달 뒤에도 여전히 맞는
 * 카드가 되게 한다. 별자리 기호(♈ 등)는 OG 폰트 서브셋에 없어 두부로 나오므로
 * 쓰지 않는다.
 */

const ILLUSTRATION_WIDTH = 300;
const ILLUSTRATION_HEIGHT = 430;

export async function buildHoroscopeOgCard(
  system: HoroscopeSystem,
  sign: HoroscopeSign,
  locale: Locale,
): Promise<OgCard> {
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "horoscope" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const signName = locale === "en" ? sign.en : sign.ko;
  const kicker = t(system === "zodiac" ? "systemZodiac" : "systemChinese");
  const subheadline = t("resultTitleSuffix");
  const imagePath = system === "zodiac" ? `horoscope/zodiac/${sign.key}.png` : `saju/zodiac/${sign.key}.png`;
  const illustration = await loadOgPng(imagePath);

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 48,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 72, lineHeight: 1.1, color: HOBUN }}>
          {signName}
        </div>
        <div style={{ display: "flex", fontFamily: "Sans", fontSize: 24, color: HOBUN_DIM }}>{subheadline}</div>
      </div>

      <div
        style={{
          display: "flex",
          width: ILLUSTRATION_WIDTH,
          height: ILLUSTRATION_HEIGHT,
          borderRadius: 28,
          overflow: "hidden",
          border: `1px solid ${INK_LINE}`,
        }}
      >
        {illustration ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 next/image를 지원하지 않는다.
          <img
            src={illustration}
            alt=""
            width={ILLUSTRATION_WIDTH}
            height={ILLUSTRATION_HEIGHT}
            style={{ objectFit: "cover", width: ILLUSTRATION_WIDTH, height: ILLUSTRATION_HEIGHT }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Serif",
              fontSize: 48,
              color: HOBUN_FAINT,
            }}
          >
            {signName}
          </div>
        )}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon("tierCultural"),
    footerText: t("ogFooterNotice"),
    serifText: signName,
    sansText: `${kicker}${subheadline}`,
  };
}
