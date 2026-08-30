import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import type { OgCard } from "@/lib/og/cards/frame";
import type { ShareKind } from "@/lib/shareCode";
import { SHARE_KIND_HUB_TITLE_KEY } from "@/lib/shareMeta";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_FAINT } from "@/lib/og/theme";

/**
 * bigfive·darktriad·attachment 등 아직 전용 카드가 없는 kind의 잠정 카드.
 * 다음 작업이 각 kind 전용 렌더러를 추가하면 opengraph-image.tsx의 분기만
 * 교체하면 되도록, frame.tsx의 OgCard 모양을 그대로 따른다.
 */

const FALLBACK_ART: Readonly<Record<ShareKind, string>> = Object.freeze({
  jungian: "og/types/intj.png",
  bigfive: "psychometrics/factors/intellect.png",
  darktriad: "og/darktriad/overview.png",
  attachment: "og/attachment/overview.png",
  eq: "og/eq/overview.png",
  cognitive: "og/cognitive/overview.png",
});

export async function buildFallbackOgCard(kind: ShareKind, locale: Locale): Promise<OgCard> {
  const [tHome, tShare] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "share" }),
  ]);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY[kind]);
  const statusLabel = tShare("kicker");
  const heroKicker = tShare("fallback.heroKicker");
  const heroTitle = tShare("fallback.heroTitle", { title: kindTitle });
  const heroBody = tShare("fallback.heroBody", { title: kindTitle });
  const footerText = tShare("fallback.footerNotice");
  const illustration = await loadOgPng(FALLBACK_ART[kind]);

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: 36,
      }}
    >
      <div style={{ display: "flex", width: 220, height: 180, borderRadius: 22, overflow: "hidden" }}>
        {illustration ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og) requires a data URI image.
          <img src={illustration} alt="" width={220} height={180} style={{ objectFit: "cover", width: 220, height: 180 }} />
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 18, letterSpacing: 4, fontFamily: "Sans" }}>
          {heroKicker}
        </div>
        <div style={{ display: "flex", color: HOBUN, fontSize: 56, lineHeight: 1.15, fontFamily: "Sans", maxWidth: 820 }}>
          {heroTitle}
        </div>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 22, lineHeight: 1.5, fontFamily: "Sans", maxWidth: 760 }}>
          {heroBody}
        </div>
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel,
    footerText,
    serifText: "",
    sansText: `${heroKicker}${heroTitle}${heroBody}`,
  };
}
