"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import { track } from "@/lib/analytics";
import type { ShareKind } from "@/lib/shareCode";
import { ShareTargets } from "./ShareTargets";
import { StoryCardButton } from "./StoryCardButton";

/**
 * 결과 공유.
 *
 * 링크에 입력값이 통째로 담겨 있어 서버에 저장할 것이 없다.
 * 같은 링크는 언제 열어도 같은 원국을 낸다.
 */

const buttonClass =
  "inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim transition-colors " +
  "hover:border-ink-600 hover:text-hobun";

/** 이미지 저장 버튼이 필요로 하는 최소 정보 — src/lib/shareCode.ts의 kind+code 그대로. */
interface ShareBarImageCard {
  readonly kind: ShareKind;
  readonly code: string;
}

type ShareSurface = "share" | "copyLink" | "saveImage";

export function ShareBar({
  title,
  restartHref = "/",
  restartLabel,
  shareUrl,
  shareText,
  imageCard,
  analysisKey,
  onShare,
}: {
  readonly title: string;
  readonly restartHref?: string;
  readonly restartLabel?: string;
  /** 있으면 window.location.href 대신 이 URL로 공유·복사한다("/s/<kind>/<code>" 같은 짧은 링크용). */
  readonly shareUrl?: string;
  /** navigator.share의 text 필드 — 없으면(기존 호출부) 그냥 생략돼 지금과 동일하게 동작한다. */
  readonly shareText?: string;
  /** 있을 때만 "이미지 저장" 버튼을 렌더한다 — 없는 호출부는 화면이 그대로다. */
  readonly imageCard?: ShareBarImageCard;
  /** 나중에 분석 이벤트를 붙일 때 쓸 키 — onShare 콜백에 그대로 실어 넘긴다. */
  readonly analysisKey?: AnalysisKey;
  /** 공유류 버튼을 누른 시점에 동기 호출 — 실제 트래킹 호출은 이후 과제가 붙인다. */
  readonly onShare?: (surface: ShareSurface, analysisKey?: AnalysisKey) => void;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    onShare?.("copyLink", analysisKey);
    if (analysisKey) track("share_open", { analysis: analysisKey, method: "clipboard" });
    try {
      await navigator.clipboard.writeText(shareUrl ?? window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 주소창을 쓰라고 알린다.
      setCopied(false);
    }
  }

  async function share() {
    if (!navigator.share) {
      void copyLink();
      return;
    }
    onShare?.("share", analysisKey);
    if (analysisKey) track("share_open", { analysis: analysisKey, method: "web-share" });
    try {
      await navigator.share({ title, text: shareText, url: shareUrl ?? window.location.href });
    } catch {
      /* 사용자가 공유 시트를 닫은 경우 — 아무 일도 일어나지 않는다. */
    }
  }

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={share} className={buttonClass}>
          {t("share")}
        </button>
        <button type="button" onClick={copyLink} className={buttonClass}>
          {copied ? t("copyLinkDone") : t("copyLink")}
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          {t("savePdf")}
        </button>
        {imageCard && (
          <StoryCardButton
            kind={imageCard.kind}
            code={imageCard.code}
            className={buttonClass}
            analysisKey={analysisKey}
            onTrigger={() => onShare?.("saveImage", analysisKey)}
          />
        )}
        <Link href={restartHref} className={buttonClass}>
          {restartLabel ?? t("restartDefault")}
        </Link>
      </div>
      <ShareTargets url={shareUrl} text={shareText ?? title} analysisKey={analysisKey} />
    </div>
  );
}
