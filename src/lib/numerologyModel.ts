import { DateTime } from "luxon";
import {
  computeNumerology,
  meaningOf,
  numerologyMethodExplanation,
  numberExplanation,
  type NumberMeaning,
} from "@engine/numerology";
import type { ExplanationBlock } from "@engine/shared/explanation";
import type { ReductionStep } from "@engine/numerology/reduce";
import type { Locale } from "@/i18n/locale";
import { assetPath } from "./assets";

/**
 * 수비학 결과 → 화면 전용 뷰 모델.
 * 계산은 전부 산술이라 서버 부담이 없지만, 다른 리포트와 같은 패턴을 유지하려고
 * 서버 컴포넌트에서만 조립한다.
 *
 * 이 파일은 로케일을 모른다. NUMBER_MEANINGS 처럼 이미 ko/en 짝을 가진 엔진 데이터는
 * 그 짝을 그대로 실어 보내고, 문장으로 엮어야 하는 부분(연+월+일 분해, 로마자 합)은
 * 조립하지 않은 채 구조화된 값으로 남겨 둔다 — 실제 문구 선택과 조립은 next-intl 을
 * 쓸 수 있는 서버 컴포넌트가 한다.
 */

export interface NumerologyDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** 숫자 카드 한 장. kind 가 생애수/운명수를 가르고, 그에 따라 분해값의 모양이 다르다. */
export type NumberCardView =
  | {
      readonly kind: "lifePath";
      readonly value: number;
      readonly isMaster: boolean;
      readonly meaning: NumberMeaning;
      /** 연·월·일을 각각 줄인 값 — breakdownFormat 문구에 그대로 끼운다 */
      readonly breakdown: { readonly year: number; readonly month: number; readonly day: number };
      readonly trace: Readonly<{
        readonly year: readonly ReductionStep[];
        readonly month: readonly ReductionStep[];
        readonly day: readonly ReductionStep[];
        readonly total: readonly ReductionStep[];
      }>;
      readonly explanation: ExplanationBlock;
      /** public/numerology/numbers/{value 2자리}.webp */
      readonly imageSrc: string;
    }
  | {
      readonly kind: "destiny";
      readonly value: number;
      readonly isMaster: boolean;
      readonly meaning: NumberMeaning;
      /** The public URL carries only this derived value, never the entered name. */
      readonly calculation: "private" | "public";
      /** 계산에 쓰인 로마자 개수 */
      readonly lettersUsed?: number;
      /** 문자값의 합(줄이기 전) */
      readonly rawSum?: number;
      readonly letterValues?: readonly { readonly letter: string; readonly value: number }[];
      readonly trace?: readonly ReductionStep[];
      readonly explanation: ExplanationBlock;
      /** public/numerology/numbers/{value 2자리}.webp */
      readonly imageSrc: string;
    };

function numberImageSrc(value: number): string {
  return assetPath("numerology/numbers", String(value).padStart(2, "0"));
}

export interface NumerologyView {
  readonly date: NumerologyDate;
  readonly name: string | null;
  readonly lifePath: NumberCardView;
  readonly destiny: NumberCardView | null;
  readonly method: ExplanationBlock;
  /** 이름에서 로마자가 아니라 계산에서 빠진 문자 수. 운명수가 없으면 0. */
  readonly ignoredCharacters: number;
}

const PUBLIC_DESTINY_VALUES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);

export function isPublicDestinyValue(value: number): boolean {
  return PUBLIC_DESTINY_VALUES.includes(value);
}

export function buildNumerologyView(
  date: NumerologyDate,
  name: string | null,
  publicDestinyValue?: number,
): NumerologyView {
  if (publicDestinyValue !== undefined && !isPublicDestinyValue(publicDestinyValue)) {
    throw new RangeError(`unsupported destiny value: ${publicDestinyValue}`);
  }

  const result = computeNumerology({ date, name: name ?? undefined });
  const publicDestiny =
    publicDestinyValue === undefined
      ? null
      : {
          kind: "destiny" as const,
          value: publicDestinyValue,
          isMaster: [11, 22, 33].includes(publicDestinyValue),
          meaning: meaningOf(publicDestinyValue),
          calculation: "public" as const,
          explanation: numberExplanation(publicDestinyValue, "destiny"),
          imageSrc: numberImageSrc(publicDestinyValue),
        };

  return {
    date,
    name: result.name,
    lifePath: {
      kind: "lifePath",
      value: result.lifePath.value,
      isMaster: result.lifePath.isMaster,
      meaning: result.lifePath.meaning,
      breakdown: result.lifePath.breakdown,
      trace: result.lifePath.trace,
      explanation: numberExplanation(result.lifePath.value, "lifePath"),
      imageSrc: numberImageSrc(result.lifePath.value),
    },
    destiny: result.destiny
      ? {
          kind: "destiny",
          value: result.destiny.value,
          isMaster: result.destiny.isMaster,
          meaning: result.destiny.meaning,
          calculation: "private",
          lettersUsed: result.destiny.lettersUsed,
          rawSum: result.destiny.rawSum,
          letterValues: result.destiny.letterValues,
          trace: result.destiny.trace,
          explanation: numberExplanation(result.destiny.value, "destiny"),
          imageSrc: numberImageSrc(result.destiny.value),
        }
      : publicDestiny,
    ignoredCharacters: result.destiny?.ignoredCharacters ?? 0,
    method: numerologyMethodExplanation(),
  };
}

/**
 * 표시용 생년월일 문구. 순수 포맷팅(날짜 토큰 선택)이라 메시지 카탈로그가 필요
 * 없다 — 로케일을 렌더 시점에 인자로 받아 화면(페이지·OG 메타데이터)에서 호출한다.
 */
export function formatNumerologyDate(date: NumerologyDate, locale: Locale): string {
  const dt = DateTime.fromObject({ year: date.year, month: date.month, day: date.day });
  return locale === "en" ? dt.toFormat("MMMM d, yyyy") : dt.toFormat("yyyy년 M월 d일");
}
