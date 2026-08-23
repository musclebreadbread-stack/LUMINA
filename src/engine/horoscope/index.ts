import { daysInGregorianMonth } from "@engine/shared/birth";
import type { PlanetKey } from "@engine/astro/constants";
import { hashSeed, pick, rngFromSeed } from "@engine/shared/random";
import type { EvidenceTier } from "@engine/shared/tier";
import { findSign, type HoroscopeSign, type HoroscopeSystem } from "./constants";
import { computeDayFortune } from "./dayFortune";
import { createHoroscopeReference } from "./reference";
import { fragmentFor, type ReadingFragment, type ReadingSlot } from "./lexicon/variants";
import {
  computeHoroscopeSignals,
  contextEvidence,
  rankSignals,
  type HoroscopeSignal,
  type ReadingEvidence,
  type SignalId,
} from "./signals";
import { computeDailySky, computeDailySkyAtTimeZone } from "./sky";
import { MOOD_LINES, RELATIONSHIP_LINES, TIP_LINES, WORK_LINES } from "./phrases";

export type { ReadingSlot } from "./lexicon/variants";

export * from "./constants";
export * from "./dayFortune";
export * from "./reference";
export * from "./signals";
export * from "./sky";
export * from "./transit";
export * from "./phrases";
export * from "./citations";

export class HoroscopeInputError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "HoroscopeInputError";
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "오늘"이 무슨 날짜인지는 엔진이 정하지 않는다.
 * 서버 시계가 아니라 보는 사람의 현지 자정을 기준으로 날짜가 넘어가야 하므로,
 * 호출부(클라이언트)가 자기 타임존의 오늘 날짜를 만들어 넘긴다 — 사주가
 * referenceDate 를 밖에서 받는 것과 같은 이유다.
 */
export function assertValidDateString(date: string): { year: number; month: number; day: number } {
  const match = DATE_RE.exec(date);
  if (!match) {
    throw new HoroscopeInputError(`date must be in YYYY-MM-DD format, got "${date}"`, "date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) {
    throw new HoroscopeInputError(`year must be 1900..2100, got ${year}`, "date");
  }
  if (month < 1 || month > 12) {
    throw new HoroscopeInputError(`month must be 1..12, got ${month}`, "date");
  }
  if (day < 1 || day > daysInGregorianMonth(year, month)) {
    throw new HoroscopeInputError(`invalid day ${day} for ${year}-${month}`, "date");
  }
  return { year, month, day };
}

export interface DailyHoroscope {
  readonly engine: "horoscope";
  readonly tier: EvidenceTier;
  readonly version: 1;
  readonly date: string;
  readonly sign: HoroscopeSign;
  readonly mood: string;
  readonly relationship: string;
  readonly work: string;
  readonly tip: string;
}

/** The quick, phrase-bank horoscope is explicitly entertainment-tier content. */
export const DAILY_HOROSCOPE_TIER: EvidenceTier = "entertainment";

/** The calculated daily-reading route is cultural-tier, not a validated forecast. */
export const DAILY_READING_TIER: EvidenceTier = "cultural";

export interface DailyReadingLine extends ReadingFragment {
  readonly slot: ReadingSlot;
  readonly signalId: SignalId;
  readonly baseScore: number;
  readonly slotWeight: number;
  readonly score: number;
  readonly evidenceId: string;
}

export interface ReadingNote {
  readonly id:
    | "utcNoonReference"
    | "wholeSignPrecision"
    | "degreeTransitPrecision"
    | "culturalTier";
}

export interface DailyReading {
  readonly engine: "horoscope";
  readonly tier: "cultural";
  readonly version: 2;
  readonly date: string;
  readonly sign: HoroscopeSign;
  readonly basis: "sign" | "natal";
  readonly precision: "whole-sign" | "degree";
  readonly lines: Readonly<Record<ReadingSlot, DailyReadingLine>>;
  readonly evidence: readonly ReadingEvidence[];
  readonly signals: readonly HoroscopeSignal[];
  readonly notes: readonly ReadingNote[];
}

export interface DailyReadingOptions {
  readonly timeZone?: string;
  readonly personalized?: boolean;
  readonly natalPositions?: readonly { readonly key: PlanetKey; readonly longitude: number }[];
}

const READING_SLOTS: readonly ReadingSlot[] = Object.freeze([
  "mood",
  "relationship",
  "work",
  "tip",
]);

function makeReadingLine(
  signal: HoroscopeSignal,
  slot: ReadingSlot,
  variantSeed: string,
): DailyReadingLine {
  const fragment = fragmentFor(signal.id, slot, hashSeed(variantSeed) % 4);
  return Object.freeze({
    ...fragment,
    slot,
    signalId: signal.id,
    baseScore: signal.baseScore,
    slotWeight: signal.slotWeight,
    score: signal.score,
    evidenceId: signal.evidence.id,
  });
}

/**
 * Keep a strong signal available for more than one slot, while allowing a
 * nearby, slot-relevant signal to provide a second lens. The tolerance avoids
 * inventing a different story when the runner-up is materially weaker.
 */
function selectSignalForSlot(
  signals: readonly HoroscopeSignal[],
  slot: ReadingSlot,
  usedSignalIds: ReadonlySet<SignalId>,
): HoroscopeSignal | undefined {
  const ranked = rankSignals(signals, slot);
  const top = ranked[0];
  if (!top || usedSignalIds.has(top.id)) {
    const alternative = ranked.find(
      (candidate) =>
        !usedSignalIds.has(candidate.id) && candidate.score >= (top?.score ?? 0) * 0.55,
    );
    if (alternative) return alternative;
  }
  return top;
}

/**
 * Compute a deterministic daily reading from astronomical positions and day-pillar relations.
 * No wall clock, random picker, or prose selection is used here.
 */
export function computeDailyReading(
  system: HoroscopeSystem,
  signKey: string,
  date: string,
  options: DailyReadingOptions = {},
): DailyReading {
  assertValidDateString(date);
  const reference = createHoroscopeReference(system, signKey, date, {
    personalized: options.personalized,
  });
  const sky = options.timeZone ? computeDailySkyAtTimeZone(date, options.timeZone) : computeDailySky(date);
  const fortune = computeDayFortune(date, system === "chinese" ? reference.signIndex : null);
  const signals = computeHoroscopeSignals(reference, sky, fortune, options.natalPositions ?? []);
  const usedSignalIds = new Set<SignalId>();
  const selected = Object.fromEntries(
    READING_SLOTS.map((slot) => {
      const top = selectSignalForSlot(signals, slot, usedSignalIds);
      if (!top) throw new Error(`missing horoscope signal for ${slot}`);
      usedSignalIds.add(top.id);
      return [slot, makeReadingLine(top, slot, `${date}:${reference.sign.key}:${slot}:${top.id}`)];
    }),
  ) as Readonly<Record<ReadingSlot, DailyReadingLine>>;

  const evidence = Object.freeze(
    [
      ...READING_SLOTS.map((slot) => selected[slot].evidenceId)
        .map((id) => signals.find((signal) => signal.evidence.id === id)?.evidence ?? null)
        .filter((item): item is ReadingEvidence => item !== null),
      ...contextEvidence(sky, fortune),
    ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index),
  );
  const notes: readonly ReadingNote[] = Object.freeze([
    Object.freeze({ id: "utcNoonReference" as const }),
    Object.freeze({
      id: reference.precision === "whole-sign" ? "wholeSignPrecision" : "degreeTransitPrecision",
    }),
    Object.freeze({ id: "culturalTier" as const }),
  ]);

  return Object.freeze({
    engine: "horoscope" as const,
    tier: "cultural" as const,
    version: 2 as const,
    date,
    sign: reference.sign,
    basis: reference.basis,
    precision: reference.precision,
    lines: Object.freeze(selected),
    evidence,
    signals,
    notes: Object.freeze(notes),
  });
}

/**
 * 오늘의 운세 산출.
 *
 * (체계, 별자리/띠, 날짜) 가 곧 시드다. 같은 조합이면 하루 종일, 몇 번을 다시
 * 열어도 같은 문장이 나온다. 서버에 저장하는 배치 결과가 없다 — 이 함수 자체가
 * 매번 그 자리에서 결정론적으로 다시 계산하는 배치다.
 */
export function computeDailyHoroscope(
  system: HoroscopeSystem,
  signKey: string,
  date: string,
): DailyHoroscope {
  assertValidDateString(date);

  const sign = findSign(system, signKey);
  if (!sign) {
    throw new HoroscopeInputError(`unknown ${system} sign: "${signKey}"`, "sign");
  }

  const rng = rngFromSeed(`${system}:${signKey}:${date}`);

  return Object.freeze({
    engine: "horoscope" as const,
    tier: DAILY_HOROSCOPE_TIER,
    version: 1 as const,
    date,
    sign,
    mood: pick(MOOD_LINES, rng),
    relationship: pick(RELATIONSHIP_LINES, rng),
    work: pick(WORK_LINES, rng),
    tip: pick(TIP_LINES, rng),
  });
}
