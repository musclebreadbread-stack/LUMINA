"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import type { AnalysisKey } from "@engine/shared/evidence";
import { track } from "@/lib/analytics";
import {
  shareIntentUrl,
  shareMethodFor,
  shareUtmFor,
  withUtm,
  type ShareTargetId,
} from "@/lib/shareTargets";

/**
 * SNS 공유 버튼 묶음.
 *
 * X·Threads·Facebook은 공개 인텐트 URL을 새 창으로 열 뿐이라 SDK도 키도 없다.
 * 카카오만 JS SDK가 필요해서 `NEXT_PUBLIC_KAKAO_JS_KEY`가 있을 때만 버튼이 나온다 —
 * 키 없이 버튼만 보여 주면 눌러도 아무 일도 안 일어나므로 아예 렌더하지 않는다.
 *
 * 강제 공유(공유해야 결과를 보여 주는 식)는 하지 않는다. 전부 선택이다.
 */

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

interface KakaoShareApi {
  readonly init: (key: string) => void;
  readonly isInitialized: () => boolean;
  readonly Share: { readonly sendDefault: (settings: Record<string, unknown>) => void };
}

type WindowWithKakao = Window & { Kakao?: KakaoShareApi };

/** SDK를 한 번만 불러온다. 이미 붙어 있으면 그 태그의 로드를 기다린다. */
function loadKakaoSdk(): Promise<KakaoShareApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const existing = (window as WindowWithKakao).Kakao;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const previous = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_SDK_SRC}"]`);
    const script = previous ?? document.createElement("script");

    script.addEventListener("load", () => resolve((window as WindowWithKakao).Kakao ?? null), { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });

    if (!previous) {
      script.src = KAKAO_SDK_SRC;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });
}

const buttonClass =
  "inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim transition-colors " +
  "hover:border-ink-600 hover:text-hobun";

export function ShareTargets({
  url,
  text,
  analysisKey,
  campaign,
}: {
  /** 공유할 URL(절대·상대 모두 가능). 없으면 현재 주소를 쓴다. UTM은 이 컴포넌트가 붙인다. */
  readonly url?: string;
  /** 공유 문구. Facebook은 이 값을 무시하고 링크의 OG 태그를 쓴다. */
  readonly text: string;
  readonly analysisKey?: AnalysisKey;
  readonly campaign?: string;
}) {
  const t = useTranslations("common");
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const openTarget = useCallback(
    (target: ShareTargetId) => {
      // 상대 경로("/s/kind/code")로 넘어와도, 아예 안 넘어와도 절대 URL로 맞춘다.
      const absolute = new URL(url ?? window.location.href, window.location.origin).toString();
      const shareUrl = withUtm(absolute, shareUtmFor(target, campaign));
      if (analysisKey) track("share_open", { analysis: analysisKey, method: shareMethodFor(target) });

      const intent = shareIntentUrl(target, shareUrl, text);
      if (intent !== null) {
        window.open(intent, "_blank", "noopener,noreferrer");
        return;
      }

      // 카카오만 남는 경로 — SDK를 불러온 뒤 기본 공유 시트를 띄운다.
      void loadKakaoSdk().then((kakao) => {
        if (!kakao || !kakaoKey) return;
        try {
          if (!kakao.isInitialized()) kakao.init(kakaoKey);
          kakao.Share.sendDefault({
            objectType: "text",
            text,
            link: { webUrl: shareUrl, mobileWebUrl: shareUrl },
          });
        } catch {
          /* 키가 잘못됐거나 도메인이 등록되지 않은 경우 — 다른 공유 수단은 그대로 남아 있다. */
        }
      });
    },
    [analysisKey, campaign, kakaoKey, text, url],
  );

  return (
    <div className="no-print flex flex-wrap items-center gap-2" role="group" aria-label={t("shareTargetsLabel")}>
      <button type="button" onClick={() => openTarget("x")} className={buttonClass}>
        {t("shareX")}
      </button>
      <button type="button" onClick={() => openTarget("threads")} className={buttonClass}>
        {t("shareThreads")}
      </button>
      <button type="button" onClick={() => openTarget("facebook")} className={buttonClass}>
        {t("shareFacebook")}
      </button>
      {kakaoKey && (
        <button type="button" onClick={() => openTarget("kakao")} className={buttonClass}>
          {t("shareKakao")}
        </button>
      )}
    </div>
  );
}
