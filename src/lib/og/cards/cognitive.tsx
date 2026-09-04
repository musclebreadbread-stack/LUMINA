import { getTranslations } from "next-intl/server";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEMS_PER_DOMAIN,
  ITEM_COUNT,
  type CognitiveDomain,
} from "@engine/cognitive/items";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import { correctCountFromAccuracy, type CognitiveSummaryV1, type CognitiveSummaryV2 } from "@/lib/shareCode";

/**
 * 인지능력 탐색 공유 카드의 가운데 콘텐츠.
 *
 * 공유 카드는 이 제품에서 가장 많이 보이면서 맥락은 가장 적은 화면이다. 그래서 여기에
 * 숫자 하나를 크게 찍는다면 그 숫자가 무엇인지가 결정적이다 — 여기 찍히는 것은
 * "16문항 중 몇 문항"이라는 정답 수와 정답률뿐이고, IQ 환산치·백분위·z점수·T점수·등수는
 * 어느 자리에도 없다. 이 문항에 답한 규준 표본이 존재하지 않아 계산할 근거가 없기 때문이며,
 * 꼬리 문구가 그 사실(LUMINA 자체 문항 · 규준 없음 · 임상 지능검사 아님)을 함께 싣는다.
 *
 * darktriad.tsx·eq.tsx와 마찬가지로 전용 삽화가 없어(현재 쓰는 그림은 Big Five 요인 아트를
 * 잠시 빌린 자리표시자다) 이미지 박스를 두지 않고 활자만으로 구성한다 — Satori는 WebP·AVIF를
 * 조용히 실패시키므로, 있지도 않은 그림을 억지로 끼우는 쪽이 더 위험하다.
 */

const TRACK_WIDTH = 300;
const LABEL_WIDTH = 208;
const COUNT_WIDTH = 56;
const ILLUSTRATION_WIDTH = 180;
const ILLUSTRATION_HEIGHT = 140;

interface DomainBarDatum {
  readonly domain: CognitiveDomain;
  readonly label: string;
  readonly correctCount: number;
  readonly fraction: number;
  readonly countText: string;
}

export async function buildCognitiveOgCard(summary: CognitiveSummaryV1): Promise<OgCard> {
  const [tCommon, tCognitive, tHome, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "cognitive" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.cognitive);
  const byDomain = new Map(summary.domains.map((entry) => [entry.domain, entry.accuracy0to100] as const));

  const bars: readonly DomainBarDatum[] = COGNITIVE_DOMAINS.map((domain) => {
    const accuracy = byDomain.get(domain) ?? 0;
    const correctCount = correctCountFromAccuracy(accuracy, ITEMS_PER_DOMAIN);
    return {
      domain,
      label: tCognitive(`domains.${domain}.label`),
      correctCount,
      fraction: Math.max(0, Math.min(1, accuracy / 100)),
      // Satori는 인접한 텍스트 노드를 각각 따로 배치하므로 미리 한 문자열로 합쳐 둔다.
      countText: `${correctCount} / ${ITEMS_PER_DOMAIN}`,
    };
  });

  const correctCount = correctCountFromAccuracy(summary.accuracy0to100, ITEM_COUNT);
  const kicker = tHome("hubCognitiveTitle");
  // 소수점을 붙이면 없는 정밀도를 주장하게 된다 — 결과 페이지(cognitiveModel.accuracyPercent)와 같은 반올림.
  const accuracyPercent = Math.round(summary.accuracy0to100);
  const headline = `${correctCount} / ${ITEM_COUNT}`;
  const correctLabel = tShare("cognitive.correctLabel");
  const accuracyLabel = tShare("cognitive.accuracyLabel", { percent: accuracyPercent });
  const domainsHeading = tShare("cognitive.domainsHeading");
  const topDomain = bars.reduce((top, bar) => (bar.fraction > top.fraction ? bar : top));
  const illustration = await loadOgPng(`og/cognitive/${topDomain.domain}.png`);

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1, gap: 24 }}>
        <div
          style={{
            display: "flex",
            width: ILLUSTRATION_WIDTH,
            height: ILLUSTRATION_HEIGHT,
            borderRadius: 20,
            overflow: "hidden",
            border: `1px solid ${INK_LINE}`,
          }}
        >
          {illustration ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og) requires a data URI image.
            <img
              src={illustration}
              alt=""
              width={ILLUSTRATION_WIDTH}
              height={ILLUSTRATION_HEIGHT}
              style={{ objectFit: "cover", width: ILLUSTRATION_WIDTH, height: ILLUSTRATION_HEIGHT }}
            />
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
            {kicker}
          </div>
          <div style={{ display: "flex", fontFamily: "Serif", fontSize: 72, lineHeight: 1.05, color: HOBUN }}>
            {headline}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "Sans" }}>
            <div style={{ display: "flex", color: HOBUN_DIM, fontSize: 22 }}>{correctLabel}</div>
            <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 20 }}>{accuracyLabel}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 3, fontFamily: "Sans" }}>
          {domainsHeading}
        </div>
        {bars.map((bar) => (
          <div key={bar.domain} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: LABEL_WIDTH, color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
              {bar.label}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: TRACK_WIDTH,
                height: 10,
                borderRadius: 5,
                background: INK_LINE,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: Math.max(2, bar.fraction * TRACK_WIDTH),
                  height: 10,
                  borderRadius: 5,
                  background: HOBUN,
                }}
              />
            </div>
            {/*
              막대 옆에 붙는 수는 "4문항 중 몇 문항"이지 점수가 아니다. 분모를 늘 함께 찍는 이유는,
              분모 없는 수가 곧바로 점수처럼 읽히기 때문이다.
            */}
            <div
              style={{
                display: "flex",
                width: COUNT_WIDTH,
                justifyContent: "flex-end",
                color: HOBUN_DIM,
                fontSize: 18,
                fontFamily: "Sans",
              }}
            >
              {bar.countText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("cognitive.footerNotice"),
    // 헤드라인의 숫자·슬래시·공백은 어떤 로케일의 문장에도 안 나오므로 세리프 서브셋에
    // 반드시 직접 넣어야 한다 — 빠지면 정답 수가 통째로 두부(tofu)로 렌더링된다.
    serifText: headline,
    // 산세리프도 마찬가지다. 막대 옆 "3 / 4"와 정답률의 "%"까지 전부 실어야 한다.
    sansText: `${kicker}${correctLabel}${accuracyLabel}${domainsHeading}${bars
      .map((bar) => `${bar.label}${bar.countText}`)
      .join("")}`,
  };
}

/** 이전 cognitive v2 공유 코드도 IQ·신뢰구간을 OG 카드에 복원하지 않는다. */
export async function buildCognitiveEstimateOgCard(summary: CognitiveSummaryV2): Promise<OgCard> {
  const [tCommon, tCognitive, tHome, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "cognitive" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.cognitive);
  const kicker = tHome("hubCognitiveTitle");
  const withheldLabel = tCognitive("pilotResultTitle");
  const withheldNotice = tCognitive("noScoreNotice");

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 64, lineHeight: 1.05, color: HOBUN }}>
          {withheldLabel}
        </div>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 20, lineHeight: 1.35, fontFamily: "Sans" }}>
          {withheldNotice}
        </div>
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("cognitive.footerNotice"),
    serifText: withheldLabel,
    sansText: `${kicker}${withheldLabel}${withheldNotice}`,
  };
}
