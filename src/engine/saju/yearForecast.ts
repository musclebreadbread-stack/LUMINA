import type { SajuResult } from "./index";
import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import type { TenGod } from "./constants";
import {
  computeYearlyLuck,
  type LuckPeriod,
  type YearlyLuck,
} from "./luck";
import {
  monthPillar,
  pillarLabel,
  twelveStageOf,
  type DayBoundaryRule,
  type Pillar,
} from "./pillars";
import { branchRelationsOf, type BranchRelation } from "./relations";
import {
  ipchunOf,
  majorTermsOfSajuYear,
  type SolarTermInstant,
} from "./solarTerms";
import { tenGodOf, tenGodOfBranch } from "./tenGods";
import { buildYearForecastExplanations } from "./yearForecastExplanations";

export type YearForecastEvidenceRef =
  | "annual-pillar"
  | "annual-ten-gods"
  | "annual-stage"
  | "ipchun-boundary"
  | "monthly-pillar"
  | "monthly-ten-gods"
  | "monthly-stage"
  | "solar-term-boundary"
  | "natal-branch-relations"
  | "major-luck-overlap"
  | "birth-time-precision"
  | "day-boundary-rule";

export type NonEmptyYearForecastEvidenceRefs = readonly [
  YearForecastEvidenceRef,
  ...YearForecastEvidenceRef[],
];

export interface YearForecastBlock extends Omit<ExplanationBlock, "evidenceRefs" | "method" | "tier"> {
  readonly kind: "annual" | "month" | "natal-relations" | "luck-overlap" | "birth-context";
  readonly evidenceRefs: NonEmptyYearForecastEvidenceRefs;
  readonly method: LocalizedText;
  readonly tier: "cultural";
}

export interface AnnualForecast {
  readonly year: number;
  readonly pillar: Pillar;
  readonly labelKo: string;
  readonly labelHanja: string;
  readonly labelEn: string;
  readonly stemTenGod: TenGod;
  readonly branchTenGod: TenGod;
  readonly stage: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly evidenceRefs: readonly [
    "annual-pillar",
    "annual-ten-gods",
    "annual-stage",
    "ipchun-boundary",
  ];
}

export interface MonthForecast {
  /** 0 = 인월, 11 = 축월. */
  readonly ordinal: number;
  readonly pillar: Pillar;
  readonly labelKo: string;
  readonly labelHanja: string;
  readonly labelEn: string;
  readonly stemTenGod: TenGod;
  readonly branchTenGod: TenGod;
  readonly stage: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly startTerm: SolarTermInstant;
  readonly endTerm: SolarTermInstant;
  readonly evidenceRefs: readonly [
    "monthly-pillar",
    "monthly-ten-gods",
    "monthly-stage",
    "solar-term-boundary",
  ];
}

export type NatalPillarKey = "year" | "month" | "day" | "hour";

export interface NatalBranchRelation {
  readonly natalPillar: NatalPillarKey;
  readonly natalBranch: number;
  readonly relation: BranchRelation;
  readonly evidenceRefs: readonly ["natal-branch-relations"];
}

export interface LuckOverlapAvailable {
  readonly status: "available";
  readonly year: number;
  readonly periods: readonly LuckPeriod[];
  /** Existing periods expose rounded Gregorian years, not exact annual overlap instants. */
  readonly basis: "rounded-calendar-year";
  readonly evidenceRefs: readonly ["major-luck-overlap", "birth-time-precision"];
}

export interface LuckOverlapUnavailable {
  readonly status: "unavailable-time-unknown";
  readonly year: number;
  readonly periods: readonly [];
  readonly basis: "birth-time-unknown";
  readonly evidenceRefs: readonly ["major-luck-overlap", "birth-time-precision"];
}

export type LuckOverlap = LuckOverlapAvailable | LuckOverlapUnavailable;

export interface BirthContext {
  readonly timeUnknown: boolean;
  readonly hasHourPillar: boolean;
  readonly inLateZiHour: boolean;
  readonly dayBoundaryRule: DayBoundaryRule;
  readonly evidenceRefs: readonly ["birth-time-precision", "day-boundary-rule"];
}

export interface YearForecast {
  readonly version: 1;
  readonly year: number;
  readonly annual: AnnualForecast;
  readonly months: readonly MonthForecast[];
  readonly natalBranchRelations: readonly NatalBranchRelation[];
  readonly luckOverlap: LuckOverlap;
  readonly birthContext: BirthContext;
  readonly blocks: readonly YearForecastBlock[];
  /** This local calculation core has not passed the planned expert-signoff gate. */
  readonly expertReviewStatus: "pending";
}

const ANNUAL_EVIDENCE = Object.freeze([
  "annual-pillar",
  "annual-ten-gods",
  "annual-stage",
  "ipchun-boundary",
] as const);

const MONTH_EVIDENCE = Object.freeze([
  "monthly-pillar",
  "monthly-ten-gods",
  "monthly-stage",
  "solar-term-boundary",
] as const);

function cloneTerm(term: SolarTermInstant): SolarTermInstant {
  const instant = term.instant.getTime();
  return Object.freeze({
    def: term.def,
    get instant() {
      return new Date(instant);
    },
  });
}

function makeMonthForecast(
  result: SajuResult,
  yearStem: number,
  ordinal: number,
  startTerm: SolarTermInstant,
  endTerm: SolarTermInstant,
): MonthForecast {
  const startsAt = startTerm.instant.getTime();
  const endsAt = endTerm.instant.getTime();
  const pillar = monthPillar(yearStem, ordinal);
  const labelKo = pillarLabel(pillar, "ko");
  const labelHanja = pillarLabel(pillar, "hanja");
  const labelEn = pillarLabel(pillar, "en");

  return Object.freeze({
    ordinal,
    pillar,
    labelKo,
    labelHanja,
    labelEn,
    stemTenGod: tenGodOf(result.pillars.day.stem, pillar.stem),
    branchTenGod: tenGodOfBranch(result.pillars.day.stem, pillar.branch),
    stage: twelveStageOf(result.pillars.day.stem, pillar.branch),
    get startsAt() {
      return new Date(startsAt);
    },
    get endsAt() {
      return new Date(endsAt);
    },
    startTerm: cloneTerm(startTerm),
    endTerm: cloneTerm(endTerm),
    evidenceRefs: MONTH_EVIDENCE,
  });
}

function natalRelations(result: SajuResult, annualBranch: number): readonly NatalBranchRelation[] {
  const natalBranches: readonly { readonly key: NatalPillarKey; readonly branch: number }[] = [
    { key: "year", branch: result.pillars.year.branch },
    { key: "month", branch: result.pillars.month.branch },
    { key: "day", branch: result.pillars.day.branch },
    ...(result.pillars.hour ? [{ key: "hour" as const, branch: result.pillars.hour.branch }] : []),
  ];

  const found: NatalBranchRelation[] = [];
  for (const natal of natalBranches) {
    for (const relation of branchRelationsOf(annualBranch, natal.branch)) {
      found.push(
        Object.freeze({
          natalPillar: natal.key,
          natalBranch: natal.branch,
          relation,
          evidenceRefs: Object.freeze(["natal-branch-relations"] as const),
        }),
      );
    }
  }
  return Object.freeze(found);
}

function luckOverlap(result: SajuResult, year: number): LuckOverlap {
  const evidenceRefs = Object.freeze(["major-luck-overlap", "birth-time-precision"] as const);
  if (result.time.timeUnknown) {
    return Object.freeze({
      status: "unavailable-time-unknown",
      year,
      periods: Object.freeze([]) as readonly [],
      basis: "birth-time-unknown",
      evidenceRefs,
    });
  }

  return Object.freeze({
    status: "available",
    year,
    periods: Object.freeze(
      result.luck.periods.filter((period) => period.fromYear <= year && year < period.toYear),
    ),
    basis: "rounded-calendar-year",
    evidenceRefs,
  });
}

/**
 * Build one solar-term year of deterministic Saju data for reflection content.
 * `result` must come from the existing birth-input calculation so its time, rule,
 * natal-pillar and luck-period limits stay visible in the output.
 */
export function buildYearForecast(result: SajuResult, year = 2027): YearForecast {
  if (year !== 2027) throw new RangeError(`only the 2027 forecast is supported, got ${year}`);

  const yearlyLuck: YearlyLuck = computeYearlyLuck(result.pillars, year);
  const startsAt = yearlyLuck.startsAt.getTime();
  const endsAt = ipchunOf(year + 1).getTime();
  const annual: AnnualForecast = Object.freeze({
    year,
    pillar: yearlyLuck.pillar,
    labelKo: pillarLabel(yearlyLuck.pillar, "ko"),
    labelHanja: pillarLabel(yearlyLuck.pillar, "hanja"),
    labelEn: pillarLabel(yearlyLuck.pillar, "en"),
    stemTenGod: yearlyLuck.stemTenGod,
    branchTenGod: yearlyLuck.branchTenGod,
    stage: yearlyLuck.stage,
    get startsAt() {
      return new Date(startsAt);
    },
    get endsAt() {
      return new Date(endsAt);
    },
    evidenceRefs: ANNUAL_EVIDENCE,
  });

  const terms = majorTermsOfSajuYear(year);
  const nextYearFirstTerm = majorTermsOfSajuYear(year + 1)[0];
  if (terms.length !== 12 || !terms[0] || !nextYearFirstTerm) {
    throw new Error(`solar-term data is incomplete for forecast year ${year}`);
  }

  const months = Object.freeze(
    terms.map((term, ordinal) => {
      const nextTerm = terms[ordinal + 1] ?? nextYearFirstTerm;
      if (!nextTerm) throw new Error(`missing next solar term for ordinal ${ordinal}`);
      return makeMonthForecast(result, yearlyLuck.pillar.stem, ordinal, term, nextTerm);
    }),
  );
  const relations = natalRelations(result, yearlyLuck.pillar.branch);
  const overlap = luckOverlap(result, year);
  const birthContext: BirthContext = Object.freeze({
    timeUnknown: result.time.timeUnknown,
    hasHourPillar: result.pillars.hour !== null,
    inLateZiHour: result.boundary.inLateZiHour,
    dayBoundaryRule: result.options.dayBoundaryRule,
    evidenceRefs: Object.freeze(["birth-time-precision", "day-boundary-rule"] as const),
  });

  const blocks = buildYearForecastExplanations({
    year,
    annual,
    months,
    natalBranchRelations: relations,
    luckOverlap: overlap,
    birthContext,
  });

  return Object.freeze({
    version: 1,
    year,
    annual,
    months,
    natalBranchRelations: relations,
    luckOverlap: overlap,
    birthContext,
    blocks,
    expertReviewStatus: "pending",
  });
}
