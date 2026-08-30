import {
  DOMAINS,
  ITEMS,
  itemById,
  type CognitiveDomain,
  type CognitiveOption,
  type Item,
} from "@engine/cognitive/items";
import type { CognitiveResult, ItemResult } from "@engine/cognitive/scoring";

/**
 * 인지능력 탐색 결과 뷰모델.
 *
 * 엔진은 정답 수와 정답률만 낸다 — 영역 이름, 그 영역이 무엇을 묻는지, 문항의 규칙 설명처럼
 * 사람이 읽는 문장은 전부 여기와 messages/*.json에 있다.
 *
 * 여기서도 백분위·z점수·T점수·IQ 환산치는 만들지 않는다. 만들 수 있는데 참는 것이 아니라
 * 이 문항에 답한 규준 표본이 존재하지 않아 계산할 근거가 없다(engine/cognitive/provenance.ts).
 * 뷰모델이 조용히 "환산 점수" 같은 필드를 새로 만들면 그 결정이 무너지므로, 이 파일이 내는 수치는
 * 엔진이 준 정답 수·정답률과 그것을 사람이 읽기 좋게 자른 시간 표기뿐이다.
 */

export interface DomainMeta {
  readonly key: CognitiveDomain;
  readonly ko: string;
  readonly en: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
}

/** ko 라벨은 messages/*.json의 cognitive.domains.*.label과 같은 문구를 쓴다. */
const DOMAIN_META: Readonly<Record<CognitiveDomain, DomainMeta>> = Object.freeze({
  letterNumberSeries: {
    key: "letterNumberSeries",
    ko: "문자·숫자 수열",
    en: "Letter and Number Series",
    descriptionKo: "글자와 숫자가 함께 나아가는 규칙을 찾아 다음 자리에 올 값을 정하는 문항입니다.",
    descriptionEn:
      "Items that ask you to find the rule two interleaved sequences follow and name the next value.",
  },
  matrixReasoning: {
    key: "matrixReasoning",
    ko: "도형 행렬",
    en: "Matrix Reasoning",
    descriptionKo: "3×3 표에서 행과 열이 각각 무엇을 바꾸는지 읽어 내고 빈칸을 채우는 문항입니다.",
    descriptionEn:
      "Items that ask you to read what the rows and columns of a 3x3 grid each change, then fill the blank.",
  },
  verbalReasoning: {
    key: "verbalReasoning",
    ko: "언어 추론",
    en: "Verbal Reasoning",
    descriptionKo: "낱말과 문장이 담고 있는 관계를 따져 조건에 맞는 답을 고르는 문항입니다.",
    descriptionEn:
      "Items that ask you to weigh the relations carried by words and sentences and pick what follows.",
  },
  threeDimensionalRotation: {
    key: "threeDimensionalRotation",
    ko: "3차원 회전",
    en: "Three-Dimensional Rotation",
    descriptionKo: "정육면체로 만든 입체를 머릿속에서 돌려 같은 도형인지 가려내는 문항입니다.",
    descriptionEn:
      "Items that ask you to turn a cube figure in your head and decide which option is the same solid.",
  },
});

export interface DomainView extends DomainMeta {
  readonly correctCount: number;
  readonly itemCount: number;
  /** 0~100. 이 네 문항 안에서의 정답 비율이며 규준 백분위가 아니다. */
  readonly accuracy0to100: number;
  readonly elapsedMs: number | null;
}

/** 오답 복기 한 칸에 필요한 모든 것. 문항 데이터를 그대로 들고 있어 화면이 다시 조회하지 않는다. */
export interface ItemReview {
  readonly item: Item;
  /** 제시 순서(1부터). 문항 id와 값이 같더라도 의미가 다르므로 따로 둔다. */
  readonly position: number;
  readonly domain: CognitiveDomain;
  readonly chosenOptionIndex: number;
  readonly correctOptionIndex: number;
  readonly isCorrect: boolean;
  readonly chosenOption: CognitiveOption;
  readonly correctOption: CognitiveOption;
  /** 정답을 정답으로 만드는 규칙. "정답은 3번"이 아니라 왜 그런지를 말한다. */
  readonly explanationKo: string;
  readonly explanationEn: string;
  readonly recommendedSeconds: number;
}

export interface ElapsedView {
  readonly totalMs: number;
  readonly minutes: number;
  readonly seconds: number;
}

export interface CognitiveView {
  readonly correctCount: number;
  readonly itemCount: number;
  readonly accuracy0to100: number;
  /** 화면에 그대로 찍는 정수 정답률. 소수점을 붙이면 없는 정밀도를 주장하게 된다. */
  readonly accuracyPercent: number;
  readonly domains: readonly DomainView[];
  /**
   * 정답률이 가장 높은/낮은 영역. 네 영역이 모두 같으면 둘 다 null이다 —
   * 차이가 없는데 순위를 말하지 않기 위해서다.
   *
   * 영역당 4문항이라 정답률은 0·25·50·75·100 다섯 값뿐이고, 한 문항 차이가 곧 25%p 차이다.
   * 이 값은 "어느 형식이 편했는지 돌아볼 실마리"이지 능력의 상대적 강약이 아니다.
   */
  readonly strongestDomain: CognitiveDomain | null;
  readonly weakestDomain: CognitiveDomain | null;
  readonly reviews: readonly ItemReview[];
  /** 엔진에 시간이 주입되지 않았으면 null. 채점과는 무관한 서술값이다. */
  readonly elapsed: ElapsedView | null;
}

export function domainMeta(domain: CognitiveDomain): DomainMeta {
  return DOMAIN_META[domain];
}

export function localizeDomain(domain: CognitiveDomain, locale: "ko" | "en"): string {
  const meta = DOMAIN_META[domain];
  return locale === "en" ? meta.en : meta.ko;
}

export function localizeDomainDescription(domain: CognitiveDomain, locale: "ko" | "en"): string {
  const meta = DOMAIN_META[domain];
  return locale === "en" ? meta.descriptionEn : meta.descriptionKo;
}

export function localizeExplanation(review: ItemReview, locale: "ko" | "en"): string {
  return locale === "en" ? review.explanationEn : review.explanationKo;
}

/** 밀리초를 분·초로 자른다. 없으면 null 그대로 — 0분 0초는 "재지 않았다"와 다르다. */
export function formatElapsedMs(totalMs: number | null): ElapsedView | null {
  if (totalMs === null || !Number.isFinite(totalMs) || totalMs < 0) return null;
  const wholeSeconds = Math.round(totalMs / 1000);
  return Object.freeze({
    totalMs,
    minutes: Math.floor(wholeSeconds / 60),
    seconds: wholeSeconds % 60,
  });
}

function extremeDomains(domains: readonly DomainView[]): {
  readonly strongestDomain: CognitiveDomain | null;
  readonly weakestDomain: CognitiveDomain | null;
} {
  const accuracies = domains.map((domain) => domain.accuracy0to100);
  const highest = Math.max(...accuracies);
  const lowest = Math.min(...accuracies);
  if (highest === lowest) return { strongestDomain: null, weakestDomain: null };

  // 동점이면 엔진의 고정 영역 순서가 앞선 쪽을 고른다 — 같은 입력이 항상 같은 화면을 내야 한다.
  const strongest = domains.find((domain) => domain.accuracy0to100 === highest);
  const weakest = domains.find((domain) => domain.accuracy0to100 === lowest);
  return {
    strongestDomain: strongest?.key ?? null,
    weakestDomain: weakest?.key ?? null,
  };
}

function toReview(result: ItemResult, position: number): ItemReview | null {
  const item = itemById(result.itemId);
  if (!item) return null;
  const chosenOption = item.options[result.chosenOptionIndex];
  const correctOption = item.options[result.correctOptionIndex];
  if (!chosenOption || !correctOption) return null;

  return Object.freeze({
    item,
    position,
    domain: result.domain,
    chosenOptionIndex: result.chosenOptionIndex,
    correctOptionIndex: result.correctOptionIndex,
    isCorrect: result.isCorrect,
    chosenOption,
    correctOption,
    explanationKo: item.explanationKo,
    explanationEn: item.explanationEn,
    recommendedSeconds: item.recommendedSeconds,
  });
}

export function buildCognitiveView(result: CognitiveResult): CognitiveView {
  const domains = DOMAINS.map((domain) => {
    const score = result.domains.find((candidate) => candidate.domain === domain);
    const meta = DOMAIN_META[domain];
    return Object.freeze({
      ...meta,
      correctCount: score?.correctCount ?? 0,
      itemCount: score?.itemCount ?? 0,
      accuracy0to100: score?.accuracy0to100 ?? 0,
      elapsedMs: score?.elapsedMs ?? null,
    }) satisfies DomainView;
  });

  const reviews = result.itemResults
    .map((itemResult, index) => toReview(itemResult, index + 1))
    .filter((review): review is ItemReview => review !== null);

  return Object.freeze({
    correctCount: result.correctCount,
    itemCount: result.itemCount,
    accuracy0to100: result.accuracy0to100,
    accuracyPercent: Math.round(result.accuracy0to100),
    domains: Object.freeze(domains),
    ...extremeDomains(domains),
    reviews: Object.freeze(reviews),
    elapsed: formatElapsedMs(result.totalElapsedMs),
  });
}

/** 화면이 영역 순서를 임의로 바꾸지 않도록 엔진의 고정 순서를 그대로 다시 내보낸다. */
export const COGNITIVE_DOMAIN_ORDER: readonly CognitiveDomain[] = DOMAINS;

/** 결과 화면이 "16문항"을 하드코딩하지 않도록 문항 수도 여기서 넘겨준다. */
export const COGNITIVE_ITEM_COUNT = ITEMS.length;
