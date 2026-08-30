import type { AnalysisKey } from "@engine/shared/evidence";
import type { ShareKind } from "@/lib/shareCode";

/**
 * 공유 코드 kind → analysisCatalog 키 매핑.
 *
 * ShareKind "bigfive"는 카탈로그에서 "psychometrics"로 불린다(빅파이브 본체
 * 분석의 실제 키) — 두 이름이 다르므로 이 표 없이는 여기저기서 잘못 매핑하기 쉽다.
 */
export const SHARE_KIND_ANALYSIS_KEY: Readonly<Record<ShareKind, AnalysisKey>> = Object.freeze({
  jungian: "jungian",
  bigfive: "psychometrics",
  darktriad: "darktriad",
  attachment: "attachment",
  eq: "eq",
  cognitive: "cognitive",
});

/** ShareKind → "home" 네임스페이스의 허브 카드 제목 키. 잠정 폴백 카드의 표시 이름에 쓴다. */
export const SHARE_KIND_HUB_TITLE_KEY: Readonly<Record<ShareKind, string>> = Object.freeze({
  jungian: "hubJungianTitle",
  bigfive: "hubPsychometricsTitle",
  darktriad: "hubDarkTriadTitle",
  attachment: "hubAttachmentTitle",
  eq: "hubEqTitle",
  cognitive: "hubCognitiveTitle",
});

export interface ShareMetaText {
  readonly title: string;
  readonly description: string;
}

/**
 * next-intl 번역기는 메시지 카탈로그에서 뽑은 리터럴 유니온 키만 받아 순수 함수로
 * 단위 테스트하기 어렵다 — 호출부에서 실제 번역기를 이 넓은 타입으로 캐스트해 넘긴다.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "share" 네임스페이스 번역기를 받아 jungian 공유 페이지의 title/description을 만든다. */
export function buildJungianShareMeta(typeCode: string, translate: Translate): ShareMetaText {
  return {
    title: translate("jungian.metaTitle", { code: typeCode }),
    description: translate("jungian.metaDescription", { code: typeCode }),
  };
}

/** jungian 외 kind(bigfive/darktriad/attachment/eq/cognitive)의 잠정 공유 페이지 title/description. */
export function buildFallbackShareMeta(kindTitle: string, translate: Translate): ShareMetaText {
  return {
    title: translate("fallback.metaTitle", { title: kindTitle }),
    description: translate("fallback.metaDescription", { title: kindTitle }),
  };
}

/** 코드가 없거나 손상된 공유 링크의 title/description. */
export function buildInvalidShareMeta(translate: Translate): ShareMetaText {
  return {
    title: translate("invalidTitle"),
    description: translate("invalidBody"),
  };
}
