import type { Locale } from "@/i18n/locale";
import type {
  AttachmentSummaryV1,
  BigFiveSummaryV1,
  DarkTriadSummaryV1,
  EqSummaryV1,
  JungianSummaryV1,
} from "@/lib/shareCode";
import type { FiveElement } from "@engine/saju/constants";
import type {
  ConstructSignalV1,
  ResultSnapshotDraftV1,
  SignalValue,
  SnapshotBand,
} from "./contracts";
import { INTEGRATED_PORTRAIT_SCHEMA_VERSION } from "./contracts";
import { integrationRegistration } from "./registry";

const LOW_BAND_CUTOFF = 43;
const HIGH_BAND_CUTOFF = 57;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
}

function bandFromRelativePosition(value: number): SnapshotBand {
  assertFinite(value, "relative position");
  if (value < LOW_BAND_CUTOFF) return "low";
  if (value > HIGH_BAND_CUTOFF) return "high";
  return "mid";
}

function bandFromMean(value: number): SnapshotBand {
  assertFinite(value, "mean");
  if (value < 2.5) return "low";
  if (value > 3.5) return "high";
  return "mid";
}

function signal(
  constructId: string,
  value: SignalValue,
  limitationId: string,
  descriptorId: string,
): ConstructSignalV1 {
  return Object.freeze({
    constructId,
    value: Object.freeze(value),
    descriptorIds: Object.freeze([descriptorId]),
    limitationIds: Object.freeze([limitationId]),
  });
}

function bandSignal(constructId: string, band: SnapshotBand, limitationId: string): ConstructSignalV1 {
  return signal(constructId, { kind: "band", band }, limitationId, `relative-band.${band}`);
}

function categorySignal(constructId: string, code: string, limitationId: string): ConstructSignalV1 {
  if (!/^[a-z0-9._-]+$/u.test(code)) throw new RangeError(`invalid category code: ${code}`);
  return signal(constructId, { kind: "category", code }, limitationId, "symbolic.category");
}

function observationSignal(constructId: string, code: string, limitationId: string): ConstructSignalV1 {
  if (!/^[a-z0-9._-]+$/u.test(code)) throw new RangeError(`invalid observation code: ${code}`);
  return signal(constructId, { kind: "observation", code }, limitationId, "observation.flag");
}

/** 공개 스냅샷 코드에는 대문자·원 타입 이름을 그대로 노출하지 않는다. */
function constructCode(value: string): string {
  return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

function draft(
  analysisKey: ResultSnapshotDraftV1["analysisKey"],
  locale: Locale,
  signals: readonly ConstructSignalV1[],
): ResultSnapshotDraftV1 {
  const registration = integrationRegistration(analysisKey);
  if (!registration || !registration.includeInPortrait) {
    throw new RangeError(`analysis is not eligible for portrait: ${analysisKey}`);
  }

  return Object.freeze({
    schemaVersion: INTEGRATED_PORTRAIT_SCHEMA_VERSION,
    analysisKey,
    provenanceGroup: registration.provenanceGroup,
    lane: registration.lane,
    instrumentVersion: registration.instrumentVersion,
    scoringModelVersion: registration.scoringModelVersion,
    locale,
    signals: Object.freeze([...signals]),
    referenceIds: Object.freeze([...registration.referenceIds]),
  });
}

export function toBigFiveSnapshot(summary: BigFiveSummaryV1): ResultSnapshotDraftV1 {
  const signals = summary.factors.map((factor) =>
    bandSignal(`bigfive.${constructCode(factor.factor)}`, bandFromRelativePosition(factor.tScore), "limitation.psychometrics"),
  );
  return draft("psychometrics", summary.locale, signals);
}

export function toJungianSnapshot(summary: JungianSummaryV1): ResultSnapshotDraftV1 {
  const signals = summary.axes.map((axis) =>
    categorySignal(
      `jungian.${axis.axis.toLowerCase()}`,
      axis.isBoundary ? "boundary" : axis.continuous < 0 ? "negative" : "positive",
      "limitation.jungian-derived",
    ),
  );
  return draft("jungian", summary.locale, signals);
}

export function toDarkTriadSnapshot(summary: DarkTriadSummaryV1): ResultSnapshotDraftV1 {
  const signals = summary.subscales.map((subscale) =>
    bandSignal(
      `darktriad.${constructCode(subscale.subscale)}`,
      bandFromRelativePosition(subscale.tScore),
      "limitation.darktriad-translation",
    ),
  );
  return draft("darktriad", summary.locale, signals);
}

export function toAttachmentSnapshot(summary: AttachmentSummaryV1): ResultSnapshotDraftV1 {
  const signals = [
    bandSignal("attachment.anxiety", bandFromMean(summary.anxiety), "limitation.attachment-experimental"),
    bandSignal("attachment.avoidance", bandFromMean(summary.avoidance), "limitation.attachment-experimental"),
    categorySignal("attachment.style", summary.quadrant, "limitation.attachment-experimental"),
  ];
  return draft("attachment", summary.locale, signals);
}

export function toEqSnapshot(summary: EqSummaryV1): ResultSnapshotDraftV1 {
  const signals = summary.subscales.map((subscale) =>
    bandSignal(`eq.${constructCode(subscale.subscale)}`, bandFromRelativePosition(subscale.tScore), "limitation.eq-self-report"),
  );
  return draft("eq", summary.locale, signals);
}

export interface SajuSnapshotInput {
  readonly locale: Locale;
  readonly dominantElement: FiveElement;
  readonly dayMasterElement: FiveElement;
  readonly strength: "strong" | "balanced" | "weak";
  readonly timeUnknown: boolean;
}

export function toSajuSnapshot(input: SajuSnapshotInput): ResultSnapshotDraftV1 {
  const signals = [
    categorySignal("saju.dominant-element", input.dominantElement, "symbolic-lens"),
    categorySignal("saju.day-master-element", input.dayMasterElement, "symbolic-lens"),
    categorySignal("saju.strength", input.strength, "symbolic-lens"),
    ...(input.timeUnknown ? [observationSignal("saju.time", "time-unknown", "symbolic-lens")] : []),
  ];
  return draft("saju", input.locale, signals);
}

export type AstroSnapshotNote = "timeUnknown" | "moonSignAmbiguous" | "houseFallback";

export interface AstroSnapshotInput {
  readonly locale: Locale;
  readonly sunSignIndex: number;
  readonly moonSignIndex: number;
  readonly risingSignIndex: number | null;
  readonly notes: readonly AstroSnapshotNote[];
}

function zodiacCode(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 11) {
    throw new RangeError("zodiac sign index must be an integer from 0 to 11");
  }
  return `sign-${index}`;
}

export function toAstroSnapshot(input: AstroSnapshotInput): ResultSnapshotDraftV1 {
  const signals = [
    categorySignal("astro.sun-sign", zodiacCode(input.sunSignIndex), "symbolic-lens"),
    categorySignal("astro.moon-sign", zodiacCode(input.moonSignIndex), "symbolic-lens"),
    ...(input.risingSignIndex === null
      ? [observationSignal("astro.rising-sign", "unavailable", "symbolic-lens")]
      : [categorySignal("astro.rising-sign", zodiacCode(input.risingSignIndex), "symbolic-lens")]),
    ...input.notes.map((note) => observationSignal("astro.note", note.toLowerCase(), "symbolic-lens")),
  ];
  return draft("astro", input.locale, signals);
}

export interface NumerologySnapshotInput {
  readonly locale: Locale;
  readonly lifePath: number;
  readonly destinyPresent: boolean;
}

function numerologyNumberCode(value: number): string {
  const allowed = value >= 1 && value <= 9 || value === 11 || value === 22 || value === 33;
  if (!Number.isInteger(value) || !allowed) throw new RangeError("life path must be a valid numerology number");
  return String(value);
}

export function toNumerologySnapshot(input: NumerologySnapshotInput): ResultSnapshotDraftV1 {
  const signals = [
    categorySignal("numerology.life-path", numerologyNumberCode(input.lifePath), "symbolic-lens"),
    observationSignal(
      "numerology.destiny",
      input.destinyPresent ? "present" : "absent",
      "symbolic-lens",
    ),
  ];
  return draft("numerology", input.locale, signals);
}
