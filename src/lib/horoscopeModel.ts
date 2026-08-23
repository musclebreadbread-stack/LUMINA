import { DateTime } from "luxon";
import {
  computeDailyReading,
  type DailyReading,
  type DailyReadingOptions,
  type HoroscopeSign,
  type HoroscopeSystem,
  type ReadingEvidence,
} from "@engine/horoscope";
import type { EvidenceTier } from "@engine/shared/tier";
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

export interface HoroscopeView {
  readonly tier: EvidenceTier;
  readonly sign: HoroscopeSign;
  readonly mood: BilingualLine;
  readonly relationship: BilingualLine;
  readonly work: BilingualLine;
  readonly tip: BilingualLine;
  readonly reading: DailyReading;
  readonly evidence: readonly ReadingEvidence[];
  /**
   * public/horoscope/zodiac/{영문 별자리 키}.webp — 서양 별자리(zodiac)만 삽화가
   * 있다. 띠(chinese)는 사주 쪽 십이지 삽화와 개념이 겹쳐 따로 만들지 않았다.
   */
  readonly imageSrc: string | null;
}

export function buildHoroscopeView(
  system: HoroscopeSystem,
  signKey: string,
  date: string,
  options: DailyReadingOptions = {},
): HoroscopeView {
  const r = computeDailyReading(system, signKey, date, options);

  return {
    tier: r.tier,
    sign: r.sign,
    mood: r.lines.mood,
    relationship: r.lines.relationship,
    work: r.lines.work,
    tip: r.lines.tip,
    reading: r,
    evidence: r.evidence,
    imageSrc: system === "zodiac" ? assetPath("horoscope/zodiac", r.sign.key) : null,
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
