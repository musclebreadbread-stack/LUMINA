import type { Aspect } from "@engine/astro/aspects";
import type { PlanetKey } from "@engine/astro/constants";
import { aspectSignalId } from "./lexicon/aspects";
import { BRANCH_RELATION_SIGNAL_BY_KIND, DAY_STAGE_SIGNAL, DAY_VOID_SIGNAL } from "./lexicon/ganji";
import type { ReadingSlot } from "./lexicon/variants";
import type { DayFortune } from "./dayFortune";
import type { HoroscopeReference } from "./reference";
import {
  computeNatalTransitAspects,
  computeTransits,
  type TransitSnapshot,
} from "./transit";
import type { DailySky } from "./sky";

export type SignalId =
  | "reference"
  | "moon-sign-match"
  | "sun-sign-match"
  | "mercury-retrograde"
  | "mars-sign-tension"
  | "moon-mars-square"
  | "sun-moon-conjunction"
  | "mercury-saturn-square"
  | "natal-transit-aspect"
  | "day-branch-clash"
  | "day-branch-combination"
  | "day-branch-trine"
  | "day-branch-punishment"
  | "day-branch-harm"
  | "day-branch-destruction"
  | "day-branch-void"
  | "day-stage";

export type EvidenceSource = "reference" | "sky" | "day";

export interface ReadingEvidence {
  readonly id: string;
  readonly source: EvidenceSource;
  readonly subject: string;
  readonly value: string;
  readonly numericValue: number | null;
}

export interface HoroscopeSignal {
  readonly id: SignalId;
  readonly slot: ReadingSlot;
  /** The unweighted strength supplied by the calculation that produced the signal. */
  readonly baseScore: number;
  /** The editorial relevance weight for this reading slot. */
  readonly slotWeight: number;
  readonly score: number;
  readonly evidence: ReadingEvidence;
}

const SLOTS: readonly ReadingSlot[] = Object.freeze([
  "mood",
  "relationship",
  "work",
  "tip",
]);

const RELATION_SCORE: Readonly<Record<string, number>> = Object.freeze({
  clash: 0.94,
  punishment: 0.86,
  combination: 0.82,
  trine: 0.8,
  harm: 0.76,
  destruction: 0.74,
});

type SlotWeights = Readonly<Record<ReadingSlot, number>>;

const DEFAULT_SLOT_WEIGHTS: SlotWeights = Object.freeze({
  mood: 1,
  relationship: 1,
  work: 1,
  tip: 1,
});

/**
 * A single sky/day signal can be relevant to several parts of a reading, but
 * it should not dominate every part equally. These weights are presentation
 * relevance, not a claim that one symbolic tradition is more predictive.
 */
const SLOT_WEIGHTS: Readonly<Record<SignalId, SlotWeights>> = Object.freeze({
  reference: Object.freeze({ mood: 0.45, relationship: 0.5, work: 0.45, tip: 0.7 }),
  "moon-sign-match": Object.freeze({ mood: 1, relationship: 0.82, work: 0.45, tip: 0.75 }),
  "sun-sign-match": Object.freeze({ mood: 0.78, relationship: 0.5, work: 1, tip: 0.62 }),
  "mercury-retrograde": Object.freeze({ mood: 0.42, relationship: 0.68, work: 1, tip: 0.94 }),
  "mars-sign-tension": Object.freeze({ mood: 0.7, relationship: 0.86, work: 1, tip: 0.82 }),
  "moon-mars-square": Object.freeze({ mood: 0.98, relationship: 1, work: 0.58, tip: 0.84 }),
  "sun-moon-conjunction": Object.freeze({ mood: 1, relationship: 0.84, work: 0.62, tip: 0.78 }),
  "mercury-saturn-square": Object.freeze({ mood: 0.62, relationship: 0.48, work: 1, tip: 0.86 }),
  "natal-transit-aspect": Object.freeze({ mood: 0.76, relationship: 1, work: 0.92, tip: 0.86 }),
  "day-branch-clash": Object.freeze({ mood: 0.82, relationship: 1, work: 0.64, tip: 0.9 }),
  "day-branch-combination": Object.freeze({ mood: 0.72, relationship: 1, work: 0.72, tip: 0.86 }),
  "day-branch-trine": Object.freeze({ mood: 0.8, relationship: 0.96, work: 0.78, tip: 0.84 }),
  "day-branch-punishment": Object.freeze({ mood: 0.88, relationship: 0.94, work: 0.7, tip: 0.98 }),
  "day-branch-harm": Object.freeze({ mood: 0.78, relationship: 0.94, work: 0.68, tip: 0.95 }),
  "day-branch-destruction": Object.freeze({ mood: 0.76, relationship: 0.9, work: 0.72, tip: 0.94 }),
  "day-branch-void": Object.freeze({ mood: 0.58, relationship: 0.62, work: 0.78, tip: 1 }),
  "day-stage": Object.freeze({ mood: 0.7, relationship: 0.58, work: 0.9, tip: 0.92 }),
});

function evidence(
  id: string,
  source: EvidenceSource,
  subject: string,
  value: string,
  numericValue: number | null = null,
): ReadingEvidence {
  return Object.freeze({ id, source, subject, value, numericValue });
}

function addSignal(
  target: HoroscopeSignal[],
  id: SignalId,
  baseScore: number,
  item: ReadingEvidence,
): void {
  const weights = SLOT_WEIGHTS[id] ?? DEFAULT_SLOT_WEIGHTS;
  for (const slot of SLOTS) {
    const slotWeight = weights[slot];
    target.push(
      Object.freeze({
        id,
        slot,
        baseScore,
        slotWeight,
        score: Math.min(0.99, baseScore * slotWeight),
        evidence: item,
      }),
    );
  }
}

function aspectSignal(aspect: Aspect): SignalId | null {
  return aspectSignalId(aspect.a, aspect.b, aspect.def) as SignalId | null;
}

function addZodiacSignals(
  target: HoroscopeSignal[],
  reference: HoroscopeReference,
  sky: DailySky,
  transits: TransitSnapshot,
): void {
  if (transits.moonSignIndex === reference.signIndex) {
    addSignal(
      target,
      "moon-sign-match",
      0.9,
      evidence("sky-moon-sign", "sky", "moon", `zodiac-sign:${transits.moonSignIndex}`),
    );
  }
  if (transits.sunSignIndex === reference.signIndex) {
    addSignal(
      target,
      "sun-sign-match",
      0.72,
      evidence("sky-sun-sign", "sky", "sun", `zodiac-sign:${transits.sunSignIndex}`),
    );
  }
  if ((transits.marsSignIndex + 6) % 12 === reference.signIndex) {
    addSignal(
      target,
      "mars-sign-tension",
      0.84,
      evidence("sky-mars-tension", "sky", "mars", `zodiac-sign:${transits.marsSignIndex}`),
    );
  }
  if (transits.mercuryRetrograde) {
    addSignal(
      target,
      "mercury-retrograde",
      0.58,
      evidence("sky-mercury-retrograde", "sky", "mercury", "retrograde", -1),
    );
  }

  for (const aspect of sky.aspects) {
    const id = aspectSignal(aspect);
    if (!id) continue;
    addSignal(
      target,
      id,
      Math.max(0.45, Math.min(0.86, aspect.strength)),
      evidence(
        `sky-aspect:${aspect.a}:${aspect.b}:${aspect.def.key}`,
        "sky",
        `${aspect.a}-${aspect.b}`,
        `aspect:${aspect.def.key}`,
        aspect.orb,
      ),
    );
  }
}

function addChineseSignals(target: HoroscopeSignal[], fortune: DayFortune): void {
  for (const relation of fortune.targetRelations) {
    const signalId = BRANCH_RELATION_SIGNAL_BY_KIND[relation.kind] as SignalId;
    addSignal(
      target,
      signalId,
      RELATION_SCORE[relation.kind] ?? 0.5,
      evidence(
        `day-relation:${relation.kind}`,
        "day",
        "branch-relation",
        `relation:${relation.kind}`,
      ),
    );
  }

  if (fortune.targetBranch !== null && fortune.voidBranches.includes(fortune.targetBranch)) {
    addSignal(
      target,
      DAY_VOID_SIGNAL as SignalId,
      0.63,
      evidence(
        "day-void-branch",
        "day",
        "void-branches",
        `branches:${fortune.voidBranches.join(",")}`,
      ),
    );
  }

  if (fortune.targetStage) {
    addSignal(
      target,
      DAY_STAGE_SIGNAL as SignalId,
      0.42,
      evidence("day-stage", "day", "twelve-stage", `stage:${fortune.targetStage}`),
    );
  }
}

function addNatalSignals(
  target: HoroscopeSignal[],
  sky: DailySky,
  natalPositions: readonly { readonly key: PlanetKey; readonly longitude: number }[],
): void {
  const aspects = computeNatalTransitAspects(sky, natalPositions).slice(0, 3);
  for (const aspect of aspects) {
    addSignal(
      target,
      "natal-transit-aspect",
      Math.max(0.5, Math.min(0.92, aspect.strength)),
      evidence(
        `natal-aspect:${aspect.transit}:${aspect.natal}:${aspect.def.key}`,
        "sky",
        `${aspect.transit}-${aspect.natal}`,
        `natal-aspect:${aspect.def.key}`,
        aspect.orb,
      ),
    );
  }
}

export function computeHoroscopeSignals(
  reference: HoroscopeReference,
  sky: DailySky,
  fortune: DayFortune,
  natalPositions: readonly { readonly key: PlanetKey; readonly longitude: number }[] = [],
): readonly HoroscopeSignal[] {
  const signals: HoroscopeSignal[] = [];
  addSignal(
    signals,
    "reference",
    0.05,
    evidence("reference-sign", "reference", "sign", `${reference.system}:${reference.sign.key}`),
  );

  const transits = computeTransits(sky);
  if (reference.system === "zodiac") {
    addZodiacSignals(signals, reference, sky, transits);
  } else {
    addChineseSignals(signals, fortune);
  }
  if (natalPositions.length > 0) addNatalSignals(signals, sky, natalPositions);

  return Object.freeze(signals);
}

/**
 * 선택된 문장과 별개로 항상 표시할 관측 맥락이다. 상징 문장을 고른 신호가 하나뿐인
 * 날에도 달·태양의 실제 계산 구간과 일진을 숨기지 않기 위해 별도로 보존한다.
 * 이 항목들은 점수를 올리거나 문장을 선택하지 않는다.
 */
export function contextEvidence(
  sky: DailySky,
  fortune: DayFortune,
): readonly ReadingEvidence[] {
  const transits = computeTransits(sky);
  return Object.freeze([
    evidence("sky-context-sun", "sky", "sun", `zodiac-sign:${transits.sunSignIndex}`),
    evidence("sky-context-moon", "sky", "moon", `zodiac-sign:${transits.moonSignIndex}`),
    evidence("day-context-pillar", "day", "sign", `day-pillar:${fortune.pillar.sexagenary}`),
  ]);
}

export function rankSignals(
  signals: readonly HoroscopeSignal[],
  slot: ReadingSlot,
): readonly HoroscopeSignal[] {
  return Object.freeze(
    signals
      .filter((signal) => signal.slot === slot)
      .slice()
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)),
  );
}
