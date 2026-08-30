import { getTranslations } from "next-intl/server";
import { classifyQuadrant, type AttachmentQuadrant } from "@engine/attachment/quadrants";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { AXIS_LABELS } from "@/lib/attachmentModel";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { ELEMENT_HEX, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import type { AttachmentSummaryV1 } from "@/lib/shareCode";

/**
 * Attachment 공유 카드의 가운데 콘텐츠 — 2축(불안·회피) 산점도 한 점 + 사분면 이름.
 *
 * QuadrantCard.tsx(본문 결과 화면)가 이미 사분면↔오행 색을 쓰고 있으므로
 * (secure=목, anxious=화, avoidant=금, fearful=수) 새 색을 만들지 않고 그대로
 * 가져온다 — 두 화면에서 같은 사분면이 다른 색으로 보이면 안 된다.
 */

const CHART_SIZE = 260;
const ILLUSTRATION_WIDTH = 170;
const ILLUSTRATION_HEIGHT = 130;
const ANXIETY_MIN = 1;
const ANXIETY_MAX = 5;

const QUADRANT_ELEMENT: Readonly<Record<AttachmentQuadrant, keyof typeof ELEMENT_HEX>> = Object.freeze({
  secure: "wood",
  anxious: "fire",
  avoidant: "metal",
  fearful: "water",
});

function axisPosition(value: number): number {
  const clamped = Math.min(ANXIETY_MAX, Math.max(ANXIETY_MIN, value));
  return ((clamped - ANXIETY_MIN) / (ANXIETY_MAX - ANXIETY_MIN)) * CHART_SIZE;
}

export async function buildAttachmentOgCard(summary: AttachmentSummaryV1): Promise<OgCard> {
  const [tCommon, tAttachment, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "attachment" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.attachment);
  const classification = classifyQuadrant(
    { rawSum: 0, mean: summary.anxiety },
    { rawSum: 0, mean: summary.avoidance },
  );
  const quadrantLabel = summary.locale === "en" ? classification.labelEn : classification.labelKo;
  const anxietyLabel = summary.locale === "en" ? AXIS_LABELS.anxiety.en : AXIS_LABELS.anxiety.ko;
  const avoidanceLabel = summary.locale === "en" ? AXIS_LABELS.avoidance.en : AXIS_LABELS.avoidance.ko;
  const markerColor = ELEMENT_HEX[QUADRANT_ELEMENT[classification.quadrant]];
  const kicker = tAttachment("kicker");

  // x = 회피(오른쪽일수록 큼), y = 불안(위쪽일수록 큼) — 화면 좌표는 아래로 자랄수록
  // 커지므로 불안 축만 CHART_SIZE에서 뺀다.
  const markerLeft = axisPosition(summary.avoidance);
  const markerTop = CHART_SIZE - axisPosition(summary.anxiety);
  const illustration = await loadOgPng(`og/attachment/${classification.quadrant}.png`);

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
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 72, lineHeight: 1.1, color: markerColor }}>
          {quadrantLabel}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "Sans", fontSize: 18, color: HOBUN_DIM }}>
          <div style={{ display: "flex" }}>{anxietyLabel} {summary.anxiety.toFixed(2)} / 5.00</div>
          <div style={{ display: "flex" }}>{avoidanceLabel} {summary.avoidance.toFixed(2)} / 5.00</div>
        </div>
      </div>

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

      <div
        style={{
          display: "flex",
          position: "relative",
          width: CHART_SIZE,
          height: CHART_SIZE,
          border: `1px solid ${INK_LINE}`,
          borderRadius: 16,
        }}
      >
        <div style={{ display: "flex", position: "absolute", left: CHART_SIZE / 2, top: 0, width: 1, height: CHART_SIZE, background: INK_LINE }} />
        <div style={{ display: "flex", position: "absolute", left: 0, top: CHART_SIZE / 2, width: CHART_SIZE, height: 1, background: INK_LINE }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: markerLeft - 9,
            top: markerTop - 9,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: markerColor,
          }}
        />
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("attachment.footerNotice"),
    serifText: quadrantLabel,
    // 숫자(anxiety/avoidance 값)는 어떤 로케일의 kicker/라벨에도 안 나올 수 있어,
    // 폰트 서브셋 선택이 놓치지 않도록 실제로 그리는 문자열을 그대로 넣는다.
    sansText: `${kicker}${anxietyLabel}${avoidanceLabel}${summary.anxiety.toFixed(2)}${summary.avoidance.toFixed(2)}/ 5.00`,
  };
}
