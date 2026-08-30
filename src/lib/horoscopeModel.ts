import { DateTime } from "luxon";
import {
  computeDailyReading,
  computeDayFortune,
  type DailyReading,
  type DailyReadingOptions,
  type HoroscopeSign,
  type HoroscopeSystem,
  type ReadingEvidence,
} from "@engine/horoscope";
import type { EvidenceTier } from "@engine/shared/tier";
import type { FiveElement } from "@engine/saju";
import type { Locale } from "@/i18n/locale";
import { assetPath } from "./assets";

/**
 * 엔진 결과(DailyReading) → 화면 전용 뷰 모델.
 *
 * 이 파일은 로케일을 모른다. 계산 신호가 고른 문장은 엔진에서 이미 ko/en 쌍으로
 * 반환되므로, 화면은 렌더 시점의 로케일에 따라 한쪽만 선택한다.
 */

export interface BilingualLine {
  readonly id: string;
  readonly ko: string;
  readonly en: string;
}

/**
 * 오늘의 일진(day pillar) 지지가 지닌 오행 — 별자리·띠 체계와 무관하게 항상 존재한다.
 * src/engine/horoscope/dayFortune.ts가 이미 계산해 둔 값(사주 엔진의 지지 오행)을
 * 그대로 재사용한다 — 점성술의 4원소(fire/earth/air/water)와는 다른 체계라 섞지 않는다.
 */
export interface HoroscopeDayElement {
  readonly element: FiveElement;
  readonly branchKo: string;
  readonly branchEn: string;
  readonly branchHanja: string;
  readonly zodiacKo: string;
  readonly zodiacEn: string;
}

export interface HoroscopeView {
  readonly tier: EvidenceTier;
  readonly sign: HoroscopeSign;
  readonly mood: BilingualLine;
  readonly relationship: BilingualLine;
  readonly work: BilingualLine;
  readonly tip: BilingualLine;
  readonly reading: DailyReading;
  readonly evidence: readonly ReadingEvidence[];
  /** 선택한 체계에 맞는 서양 별자리 또는 기존 사주 띠 삽화. */
  readonly imageSrc: string | null;
  readonly dayElement: HoroscopeDayElement;
}

export function buildHoroscopeView(
  system: HoroscopeSystem,
  signKey: string,
  date: string,
  options: DailyReadingOptions = {},
): HoroscopeView {
  const r = computeDailyReading(system, signKey, date, options);
  // r.evidence 안의 일진 정보는 이미 문자열로 굳어 있어(day-pillar:${sexagenary}) 다시
  // 파싱하기보다, 같은 순수 함수를 한 번 더 불러 지지 오행을 직접 얻는다 — dayFortune.ts가
  // 이미 계산해 둔 값을 그대로 재사용하는 것이지 새 매핑을 만드는 게 아니다.
  const fortune = computeDayFortune(date);

  return {
    tier: r.tier,
    sign: r.sign,
    mood: r.lines.mood,
    relationship: r.lines.relationship,
    work: r.lines.work,
    tip: r.lines.tip,
    reading: r,
    evidence: r.evidence,
    imageSrc:
      system === "zodiac"
        ? assetPath("horoscope/zodiac", r.sign.key)
        : assetPath("saju/zodiac", r.sign.key),
    dayElement: {
      element: fortune.branch.element,
      branchKo: fortune.branch.ko,
      branchEn: fortune.branch.en,
      branchHanja: fortune.branch.hanja,
      zodiacKo: fortune.branch.zodiacKo,
      zodiacEn: fortune.branch.zodiacEn,
    },
  };
}

/**
 * 표시용 날짜 문구. 순수 포맷팅(날짜 토큰 선택)이라 메시지 카탈로그가 필요 없다 —
 * 로케일을 렌더 시점에 인자로 받아 화면(페이지·OG 이미지)에서 호출한다.
 */
export function formatHoroscopeDate(date: string, locale: Locale): string {
  const dt = DateTime.fromISO(date);
  if (!dt.isValid) return date;
  return locale === "en"
    ? dt.setLocale("en").toFormat("MMMM d, yyyy (ccc)")
    : dt.setLocale("ko").toFormat("yyyy년 M월 d일 (ccc)");
}

/** 서버 기본값 — UTC 오늘. 클라이언트가 곧바로 방문자의 현지 날짜로 고쳐 부른다. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string | undefined): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}
