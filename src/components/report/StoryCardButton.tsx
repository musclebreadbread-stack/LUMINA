"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { JUNGIAN_AXES, jungianAxisConfig } from "@engine/psychometrics/jungian";
import { FACTORS as BIGFIVE_FACTORS } from "@engine/psychometrics/items";
import { FACTOR_META } from "@engine/psychometrics/meta";
import { FACTORS as DARKTRIAD_FACTORS, type DarkTriadFactor } from "@engine/darktriad/items";
import { FACTORS as EQ_FACTORS, TOTAL_ITEM_COUNT as EQ_TOTAL_ITEM_COUNT, type EqFactor } from "@engine/eq/items";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEM_COUNT as COGNITIVE_ITEM_COUNT,
  type CognitiveDomain,
} from "@engine/cognitive/items";
import { classifyQuadrant } from "@engine/attachment/quadrants";
import type { AnalysisKey } from "@engine/shared/evidence";
import { AXIS_LABELS } from "@/lib/attachmentModel";
import { assetPath } from "@/lib/assets";
import { COGNITIVE_OVERVIEW_IMAGE, eqImagePath } from "@/lib/psychometricsAssets";
import { track } from "@/lib/analytics";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK, INK_LINE } from "@/lib/og/theme";
import { correctCountFromAccuracy, decodeShareCode, type ShareKind, type ShareSummaryV1 } from "@/lib/shareCode";

/**
 * 인스타그램 스토리형 세로 카드(1080×1920)를 클라이언트에서 캔버스로 그려 저장한다.
 *
 * Next.js의 메타데이터 파일 규약(opengraph-image 등)은 정해진 몇 가지 크기만 지원하고,
 * 임의 크기 이미지를 만들려면 API 라우트가 필요한데 이 프로젝트는 백엔드가 없다 — 그래서
 * 서버 라우트 대신 canvas로 그 자리에서 그린다. theme.ts는 순수 상수 파일(node:fs 등
 * 서버 전용 import가 없음을 확인)이라 그대로 가져다 쓴다.
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const MARGIN_X = 96;

type GenerateStatus = "idle" | "busy" | "error";

interface StoryCardButtonProps {
  readonly kind: ShareKind;
  readonly code: string;
  readonly className?: string;
  /** 있으면 이미지 생성이 실제로 성공했을 때만(취소가 아니라) share_image_saved를 보낸다. */
  readonly analysisKey?: AnalysisKey;
  /** 클릭 시점에 동기로 호출 — 실제 분석 신호 발송은 호출부(ShareBar)가 맡는다. */
  readonly onTrigger?: () => void;
}

interface CardBar {
  readonly label: string;
  readonly fraction: number; // 0..1
  /** true면 중심 기준 양방향 막대(융 축), false면 왼쪽 기준 단방향 막대. */
  readonly signed: boolean;
}

interface CardData {
  readonly headline: string;
  readonly bars: readonly CardBar[];
  readonly illustrationSrc: string | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function jungianCardData(summary: Extract<ShareSummaryV1, { kind: "jungian" }>): CardData {
  const byAxis = new Map(summary.axes.map((entry) => [entry.axis, entry] as const));
  const bars: readonly CardBar[] = JUNGIAN_AXES.map((axis) => {
    const entry = byAxis.get(axis);
    const config = jungianAxisConfig(axis);
    return {
      label: `${config.negativePole} · ${config.positivePole}`,
      fraction: clamp01(((entry?.continuous ?? 0) + 100) / 200),
      signed: true,
    };
  });
  // 삽화는 기본 16유형뿐이라 대시 앞부분만 본다. 그 4글자에 경계 축("?")이 섞여 있으면
  // 16종 삽화 중 어느 것과도 안 맞으므로 없음으로 둔다.
  const baseCode = summary.typeCode.split("-")[0] ?? summary.typeCode;
  const isCompleteType = /^[A-Za-z]{4}$/.test(baseCode);
  return {
    headline: summary.typeCode,
    bars,
    illustrationSrc: isCompleteType ? assetPath("psychometrics/types", baseCode.toLowerCase()) : null,
  };
}

function bigFiveCardData(summary: Extract<ShareSummaryV1, { kind: "bigfive" }>): CardData {
  const byFactor = new Map(summary.factors.map((entry) => [entry.factor, entry.tScore] as const));
  const topFactor = BIGFIVE_FACTORS.reduce((top, factor) =>
    (byFactor.get(factor) ?? 50) > (byFactor.get(top) ?? 50) ? factor : top,
  );
  const bars: readonly CardBar[] = BIGFIVE_FACTORS.map((factor) => ({
    label: summary.locale === "en" ? FACTOR_META[factor].en : FACTOR_META[factor].ko,
    fraction: clamp01((byFactor.get(factor) ?? 50) / 100),
    signed: false,
  }));
  return {
    headline: summary.locale === "en" ? FACTOR_META[topFactor].en : FACTOR_META[topFactor].ko,
    bars,
    illustrationSrc: assetPath("psychometrics/factors", topFactor),
  };
}

function darkTriadCardData(
  summary: Extract<ShareSummaryV1, { kind: "darktriad" }>,
  labelFor: (subscale: DarkTriadFactor) => string,
): CardData {
  const bySubscale = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));
  const topSubscale = DARKTRIAD_FACTORS.reduce((top, subscale) =>
    (bySubscale.get(subscale) ?? 50) > (bySubscale.get(top) ?? 50) ? subscale : top,
  );
  const bars: readonly CardBar[] = DARKTRIAD_FACTORS.map((subscale) => ({
    label: labelFor(subscale),
    fraction: clamp01((bySubscale.get(subscale) ?? 50) / 100),
    signed: false,
  }));
  // darktriad는 OG 카드도 전용 삽화가 없다(psychometrics/factors는 Big Five 전용) — 없는 그림을 억지로 채우지 않는다.
  return {
    headline: labelFor(topSubscale),
    bars,
    illustrationSrc: assetPath("psychometrics/darktriad", topSubscale),
  };
}

function attachmentCardData(summary: Extract<ShareSummaryV1, { kind: "attachment" }>): CardData {
  const classification = classifyQuadrant(
    { rawSum: 0, mean: summary.anxiety },
    { rawSum: 0, mean: summary.avoidance },
  );
  const bars: readonly CardBar[] = [
    {
      label: summary.locale === "en" ? AXIS_LABELS.anxiety.en : AXIS_LABELS.anxiety.ko,
      fraction: clamp01((summary.anxiety - 1) / 4),
      signed: false,
    },
    {
      label: summary.locale === "en" ? AXIS_LABELS.avoidance.en : AXIS_LABELS.avoidance.ko,
      fraction: clamp01((summary.avoidance - 1) / 4),
      signed: false,
    },
  ];
  return {
    headline: summary.locale === "en" ? classification.labelEn : classification.labelKo,
    bars,
    illustrationSrc: assetPath("psychometrics/attachment", classification.quadrant),
  };
}

/**
 * SSEIT는 원저자가 단일 총점을 전제로 만든 척도라 헤드라인을 총점 원점수로 잡는다 —
 * 규준 없는 하위요인 이름을 표제로 올리면 카드가 먼저 과잉 해석을 부추긴다.
 */
function eqCardData(
  summary: Extract<ShareSummaryV1, { kind: "eq" }>,
  labelFor: (factor: EqFactor) => string,
): CardData {
  const byFactor = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));
  const topFactor = EQ_FACTORS.reduce((top, factor) =>
    (byFactor.get(factor) ?? 50) > (byFactor.get(top) ?? 50) ? factor : top,
  );
  const bars: readonly CardBar[] = EQ_FACTORS.map((factor) => ({
    label: labelFor(factor),
    fraction: clamp01((byFactor.get(factor) ?? 50) / 100),
    signed: false,
  }));
  return {
    headline: `${summary.totalRawSum} / ${EQ_TOTAL_ITEM_COUNT * 5}`,
    bars,
    // EQ 전용 삽화가 아직 없어 /eq 결과 화면과 같은 대체 아트를 그대로 쓴다(Stage D에서 교체).
    illustrationSrc: eqImagePath(topFactor),
  };
}


/**
 * 인지능력 탐색 카드. 헤드라인은 "16문항 중 몇 문항"이며, IQ 환산치·백분위·등수는 어디에도 없다 —
 * 이 문항에 답한 규준 표본이 존재하지 않아 계산할 근거가 없다(engine/cognitive/provenance.ts).
 * 삽화는 아직 전용 그림이 없어 /cognitive 결과 화면과 같은 대체 아트를 쓴다(Stage D에서 교체).
 */
function cognitiveCardData(
  summary: Extract<ShareSummaryV1, { kind: "cognitive"; version: 1 }>,
  labelFor: (domain: CognitiveDomain) => string,
): CardData {
  const byDomain = new Map(summary.domains.map((entry) => [entry.domain, entry.accuracy0to100] as const));
  const bars: readonly CardBar[] = COGNITIVE_DOMAINS.map((domain) => ({
    label: labelFor(domain),
    fraction: clamp01((byDomain.get(domain) ?? 0) / 100),
    signed: false,
  }));
  return {
    headline: `${correctCountFromAccuracy(summary.accuracy0to100, COGNITIVE_ITEM_COUNT)} / ${COGNITIVE_ITEM_COUNT}`,
    bars,
    illustrationSrc: COGNITIVE_OVERVIEW_IMAGE,
  };
}

/** 승인 전 legacy cognitive v2 카드도 IQ·영역 점수를 이미지에 복원하지 않는다. */
function cognitiveWithheldCardData(): CardData {
  return {
    headline: "WITHHELD",
    bars: [],
    illustrationSrc: COGNITIVE_OVERVIEW_IMAGE,
  };
}

interface CardLabelResolvers {
  readonly darkTriad: (subscale: DarkTriadFactor) => string;
  readonly eq: (factor: EqFactor) => string;
  readonly cognitive: (domain: CognitiveDomain) => string;
}

function buildCardData(summary: ShareSummaryV1, labels: CardLabelResolvers): CardData {
  switch (summary.kind) {
    case "jungian":
      return jungianCardData(summary);
    case "bigfive":
      return bigFiveCardData(summary);
    case "darktriad":
      return darkTriadCardData(summary, labels.darkTriad);
    case "attachment":
      return attachmentCardData(summary);
    case "eq":
      return eqCardData(summary, labels.eq);
    case "cognitive":
      return summary.version === 2
        ? cognitiveWithheldCardData()
        : cognitiveCardData(summary, labels.cognitive);
  }
}

/** next/font/google이 globals.css에 심어 둔 실제 적용 서체명을 읽는다 — 못 읽으면 시스템 폴백. */
function resolveFontFamily(cssVarName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
  return value || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`story card: failed to load ${src}`));
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** object-fit: cover와 같은 효과 — 캔버스엔 내장 API가 없어 직접 계산한다. */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  data: CardData,
  illustration: HTMLImageElement | null,
  fonts: { readonly serif: string; readonly sans: string },
): void {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const contentWidth = CARD_WIDTH - MARGIN_X * 2;
  let cursorY = 140;

  if (illustration) {
    const illustrationHeight = 920;
    ctx.save();
    roundRectPath(ctx, MARGIN_X, cursorY, contentWidth, illustrationHeight, 32);
    ctx.clip();
    drawImageCover(ctx, illustration, MARGIN_X, cursorY, contentWidth, illustrationHeight);
    ctx.restore();
    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, MARGIN_X, cursorY, contentWidth, illustrationHeight, 32);
    ctx.stroke();
    cursorY += illustrationHeight + 72;
  }

  ctx.fillStyle = HOBUN;
  ctx.font = `900 128px ${fonts.serif}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(data.headline, MARGIN_X, cursorY + 116);
  cursorY += 116 + 64;

  const barGap = 58;
  ctx.font = `500 30px ${fonts.sans}`;
  data.bars.forEach((bar, index) => {
    const trackY = cursorY + index * barGap;
    ctx.fillStyle = HOBUN_DIM;
    ctx.fillText(bar.label, MARGIN_X, trackY - 14);

    ctx.fillStyle = INK_LINE;
    roundRectPath(ctx, MARGIN_X, trackY, contentWidth, 14, 7);
    ctx.fill();

    if (bar.signed) {
      const center = MARGIN_X + contentWidth / 2;
      const position = MARGIN_X + bar.fraction * contentWidth;
      const left = Math.min(center, position);
      const width = Math.max(6, Math.abs(position - center));
      ctx.fillStyle = HOBUN_FAINT;
      roundRectPath(ctx, left, trackY, width, 14, 7);
      ctx.fill();
    } else {
      const width = Math.max(6, bar.fraction * contentWidth);
      ctx.fillStyle = HOBUN;
      roundRectPath(ctx, MARGIN_X, trackY, width, 14, 7);
      ctx.fill();
    }
  });

  const footerY = CARD_HEIGHT - 96;
  ctx.strokeStyle = INK_LINE;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, footerY - 44);
  ctx.lineTo(CARD_WIDTH - MARGIN_X, footerY - 44);
  ctx.stroke();

  ctx.fillStyle = HOBUN_FAINT;
  ctx.font = `500 26px ${fonts.sans}`;
  ctx.fillText("LUMINA", MARGIN_X, footerY);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StoryCardButton({ kind, code, className, analysisKey, onTrigger }: StoryCardButtonProps) {
  const t = useTranslations("common");
  const tDarkTriad = useTranslations("darktriad");
  const tEq = useTranslations("eq");
  const tCognitive = useTranslations("cognitive");
  const [status, setStatus] = useState<GenerateStatus>("idle");

  async function generateAndShare() {
    onTrigger?.();
    setStatus("busy");
    try {
      const summary = decodeShareCode(code, kind);
      if (!summary) throw new Error("story card: invalid share code");

      const data = buildCardData(summary, {
        darkTriad: (subscale) => tDarkTriad(`factors.${subscale}.label`),
        eq: (factor) => tEq(`factors.${factor}.label`),
        cognitive: (domain) => tCognitive(`domains.${domain}.label`),
      });
      const illustration = data.illustrationSrc ? await loadImage(data.illustrationSrc).catch(() => null) : null;

      const serifFamily = resolveFontFamily("--font-noto-serif-kr", "serif");
      const sansFamily = resolveFontFamily("--font-plex-kr", "sans-serif");
      await Promise.all([
        document.fonts.load(`900 128px ${serifFamily}`, data.headline),
        document.fonts.load(`500 30px ${sansFamily}`),
      ]);

      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("story card: canvas unsupported");

      drawCard(ctx, data, illustration, { serif: serifFamily, sans: sansFamily });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("story card: toBlob failed");

      const fileName = `lumina-${kind}-${code}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const canShareFile = navigator.canShare?.({ files: [file] });

      if (canShareFile) {
        try {
          await navigator.share({ files: [file], title: "LUMINA", text: data.headline });
        } catch {
          /* 사용자가 공유 시트를 닫은 경우 — 이미지 생성 자체는 성공했으므로 오류로 취급하지 않는다. */
        }
      } else {
        downloadBlob(blob, fileName);
      }
      // 이미지 생성까지가 "성공"이다 — 공유 시트를 취소해도 카드 자체는 만들어졌으므로 오류로 세지 않는다.
      if (analysisKey) track("share_image_saved", { analysis: analysisKey, method: canShareFile ? "file-share" : "download" });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const busy = status === "busy";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void generateAndShare()}
        disabled={busy}
        aria-busy={busy}
        className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy ? t("saveImageBusy") : t("saveImage")}
      </button>
      {status === "error" && <span className="text-xs text-hobun-faint">{t("saveImageFailed")}</span>}
    </div>
  );
}
