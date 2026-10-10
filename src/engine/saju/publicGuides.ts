import type { BirthDate } from "@engine/shared/birth";
import { lunarToSolar } from "./lunar";
import { branchRelationsOf, type BranchRelation, type BranchRelationKind } from "./relations";
import { tenGodOf, tenGodOfBranch } from "./tenGods";
import { monthPillar, pillarFromSexagenary, twelveStageOf, type Pillar } from "./pillars";
import { majorTermsOfSajuYear, type SolarTermInstant } from "./solarTerms";
import { branchAt, stemAt, type TenGod } from "./constants";

/**
 * Deterministic, birth-data-free 2027 (丁未) reference facts for the public
 * `/saju/2027/**` guide pages. Every function here is a pure composition of
 * the existing saju engine's own primitives (`branchRelationsOf`, `tenGodOf`,
 * `twelveStageOf`, `monthPillar`, `majorTermsOfSajuYear`) — it never reads a
 * birth date and never calls `buildYearForecast` (which requires one). Do not
 * add anything here that needs a computed `SajuResult`; that belongs in
 * `yearForecast.ts` instead.
 */

/** 2027년 세운 간지 — 정미(丁未). stem index 3, branch index 7. */
export const YEAR_2027_PILLAR: Pillar = pillarFromSexagenary(43);

/** 2027년 전체 60갑자 일주 목록 — index 0..59, `pillarFromSexagenary`와 동일한 순서. */
export const ALL_ILJU_PILLARS: readonly Pillar[] = Object.freeze(
  Array.from({ length: 60 }, (_, index) => pillarFromSexagenary(index)),
);

/** 표시용 간지 영문 슬러그. 예: "ding-wei". `pillarLabel(p,"en")`는 공백이 있어 슬러그로 쓸 수 없다. */
export function iljuSlug(pillar: Pillar): string {
  return `${stemAt(pillar.stem).en}-${branchAt(pillar.branch).en}`.toLowerCase();
}

const ILJU_BY_SLUG: ReadonlyMap<string, Pillar> = new Map(
  ALL_ILJU_PILLARS.map((pillar) => [iljuSlug(pillar), pillar]),
);

/** 슬러그로 60갑자 일주를 찾는다. 없으면 null(유효하지 않은 URL 파라미터). */
export function findIljuBySlug(slug: string): Pillar | null {
  return ILJU_BY_SLUG.get(slug) ?? null;
}

export interface StemYearForecast {
  readonly stemIndex: number;
  /** 이 일간이 2027년 세운의 천간(丁)에 대해 갖는 십신. */
  readonly stemTenGod: TenGod;
  /** 이 일간이 2027년 세운의 지지(未)에 대해 갖는 십신(지장간 정기 기준). */
  readonly branchTenGod: TenGod;
  /** 이 일간이 2027년 세운 지지(未) 위에서 갖는 십이운성. */
  readonly stage: string;
}

/** 십간 하나가 2027년 세운과 맺는 관계. 개인 원국과 무관한, 일간 자체의 성질이다. */
export function stemYearForecast(stemIndex: number): StemYearForecast {
  return Object.freeze({
    stemIndex,
    stemTenGod: tenGodOf(stemIndex, YEAR_2027_PILLAR.stem),
    branchTenGod: tenGodOfBranch(stemIndex, YEAR_2027_PILLAR.branch),
    stage: twelveStageOf(stemIndex, YEAR_2027_PILLAR.branch),
  });
}

export interface MonthlyRelation {
  /** 0 = 인월(입춘 직후) … 11 = 축월(소한 이후) */
  readonly monthOrdinal: number;
  readonly monthPillar: Pillar;
  /** 이 달의 지지와 대상 지지 사이의 전통 지지 관계(충·합·삼합 등). 없으면 빈 배열. */
  readonly relations: readonly BranchRelation[];
}

/** 대상 지지(띠)가 2027년 12개 달의 지지와 맺는 관계를 달 순서대로 반환한다. */
export function monthlyRelationsFor2027(branchIndex: number): readonly MonthlyRelation[] {
  return Object.freeze(
    Array.from({ length: 12 }, (_, ordinal) => {
      const pillar = monthPillar(YEAR_2027_PILLAR.stem, ordinal);
      return Object.freeze({
        monthOrdinal: ordinal,
        monthPillar: pillar,
        relations: branchRelationsOf(branchIndex, pillar.branch),
      });
    }),
  );
}

const NOTABLE_MONTH_RELATION_KINDS: ReadonlySet<BranchRelationKind> = new Set(["clash", "combination", "trine"]);

/** `monthlyRelationsFor2027` 결과 중 충·합·삼합처럼 눈에 띄는 관계가 있는 달만 남긴다. */
export function notableMonthlyRelations(monthly: readonly MonthlyRelation[]): readonly MonthlyRelation[] {
  return Object.freeze(
    monthly
      .map((entry) => Object.freeze({
        ...entry,
        relations: Object.freeze(entry.relations.filter((r) => NOTABLE_MONTH_RELATION_KINDS.has(r.kind))),
      }))
      .filter((entry) => entry.relations.length > 0),
  );
}

export interface SignYearGuide {
  readonly signBranch: number;
  /** 이 띠(지지)와 2027년 세운 지지(未) 사이의 관계. */
  readonly yearRelations: readonly BranchRelation[];
  readonly monthlyRelations: readonly MonthlyRelation[];
  readonly notableMonths: readonly MonthlyRelation[];
}

/** 12지신(띠) 하나가 2027년 세운과 맺는 관계 전체를 모은다. `branchIndex`는 0(子)..11(亥). */
export function signYearGuideFor(branchIndex: number): SignYearGuide {
  const monthlyRelations = monthlyRelationsFor2027(branchIndex);
  return Object.freeze({
    signBranch: branchIndex,
    yearRelations: branchRelationsOf(branchIndex, YEAR_2027_PILLAR.branch),
    monthlyRelations,
    notableMonths: notableMonthlyRelations(monthlyRelations),
  });
}

export interface IljuGuide {
  readonly pillar: Pillar;
  readonly slug: string;
  /** 일지(日支) 십이운성 — 이 일주 고유의 "앉은 자리" 성질. */
  readonly seatedStage: string;
  /** 이 일주의 일간이 2027년 세운과 맺는 관계(원국과 무관, 일간 자체 기준). */
  readonly yearForecast: StemYearForecast;
  /** 이 일주의 지지가 2027년 세운 지지(未)와 맺는 관계. */
  readonly yearBranchRelations: readonly BranchRelation[];
}

/** 60갑자 일주 하나의 공개 가이드용 요약. */
export function iljuGuideFor(pillar: Pillar): IljuGuide {
  return Object.freeze({
    pillar,
    slug: iljuSlug(pillar),
    seatedStage: twelveStageOf(pillar.stem, pillar.branch),
    yearForecast: stemYearForecast(pillar.stem),
    yearBranchRelations: branchRelationsOf(pillar.branch, YEAR_2027_PILLAR.branch),
  });
}

/** 60갑자 순서에서 앞/뒤 일주(순환, mod 60). ilju 페이지의 이전/다음 탐색 링크에 쓴다. */
export function adjacentIlju(pillar: Pillar): { readonly previous: Pillar; readonly next: Pillar } {
  return Object.freeze({
    previous: pillarFromSexagenary(pillar.sexagenary - 1),
    next: pillarFromSexagenary(pillar.sexagenary + 1),
  });
}

export interface MonthlyPillarRow {
  readonly monthOrdinal: number;
  readonly pillar: Pillar;
  readonly term: SolarTermInstant;
}

/** 2027년 12개월 절기·월주 전체표 — 허브 페이지 전용(다른 페이지에서는 반복하지 않는다). */
export function monthlyPillarTable2027(): readonly MonthlyPillarRow[] {
  const terms = majorTermsOfSajuYear(2027);
  return Object.freeze(
    terms.map((term, ordinal) => Object.freeze({
      monthOrdinal: ordinal,
      pillar: monthPillar(YEAR_2027_PILLAR.stem, ordinal),
      term,
    })),
  );
}

/** 특정 연도의 음력 설날(1월 1일)을 양력으로 환산한다. 입춘과의 차이를 설명하는 데 쓴다. */
export function seollalOf(year: number): BirthDate {
  return lunarToSolar(year, 1, 1);
}
