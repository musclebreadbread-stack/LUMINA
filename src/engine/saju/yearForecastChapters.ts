import type { Citation } from "@engine/shared/citation";
import type { LocalizedText } from "@engine/shared/explanation";
import type { SajuResult } from "./index";
import { TEN_GOD_LABEL } from "./constants";
import { SAJU_CALCULATION_CITATIONS, SAJU_TRADITION_CITATIONS } from "./citations";
import { branchRelationsOf } from "./relations";
import type { ElementRole } from "./elements";
import {
  NO_NATAL_RELATION_BLURB,
  PHASE_WELLBEING_BLURB,
  RELATION_KIND_BLURB,
  ROLE_GROWTH_BLURB,
  ROLE_WORK_BLURB,
  STAGE_PHASE,
  TEN_GOD_ROLE,
} from "./yearForecastChapterText";
import type {
  AnnualForecast,
  MonthForecast,
  NatalBranchRelation,
  NonEmptyYearForecastEvidenceRefs,
  YearForecastBlock,
} from "./yearForecast";

/**
 * Four life-domain chapters (일·재물/관계/몸과 리듬/배움·성장) built from data the
 * engine has already computed for the year forecast — no new predictions, only
 * a different, domain-oriented grouping of the same Ten Gods, Growth Stages,
 * and natal branch relations that yearForecastExplanations.ts already exposes
 * by calculation type. Returned blocks share YearForecastBlock's exact shape,
 * so buildYearForecast() can append them to the same `blocks` array with no
 * changes to how report/page.tsx renders them — this is also what keeps this
 * content visible when the AI narrative (src/server/ai) is off or fails: it
 * never depends on that pipeline at all.
 *
 * Content status: pending expert (명리) review, same as the rest of this
 * engine's cultural-tier text (see YearForecast.expertReviewStatus).
 */

interface ChapterInput {
  readonly year: number;
  readonly result: SajuResult;
  readonly annual: AnnualForecast;
  readonly months: readonly MonthForecast[];
  readonly natalBranchRelations: readonly NatalBranchRelation[];
}

const CITATIONS: readonly Citation[] = Object.freeze([
  ...SAJU_CALCULATION_CITATIONS,
  ...SAJU_TRADITION_CITATIONS,
]);

const PILLAR_LABEL: Readonly<Record<NatalBranchRelation["natalPillar"], LocalizedText>> = Object.freeze({
  year: Object.freeze({ ko: "연지", en: "Year Branch" }),
  month: Object.freeze({ ko: "월지", en: "Month Branch" }),
  day: Object.freeze({ ko: "일지", en: "Day Branch" }),
  hour: Object.freeze({ ko: "시지", en: "Hour Branch" }),
});

const RELATION_KIND_LABEL: Readonly<Record<NatalBranchRelation["relation"]["kind"], LocalizedText>> = Object.freeze({
  clash: Object.freeze({ ko: "충", en: "clash" }),
  combination: Object.freeze({ ko: "육합", en: "six-combination" }),
  trine: Object.freeze({ ko: "삼합", en: "trine" }),
  punishment: Object.freeze({ ko: "형", en: "punishment" }),
  harm: Object.freeze({ ko: "해", en: "harm" }),
  destruction: Object.freeze({ ko: "파", en: "destruction" }),
});

function chapterBlock(input: {
  readonly id: string;
  readonly kind: YearForecastBlock["kind"];
  readonly summary: LocalizedText;
  readonly detail: LocalizedText;
  readonly method: LocalizedText;
  readonly evidenceRefs: NonEmptyYearForecastEvidenceRefs;
  readonly factIds: readonly string[];
}): YearForecastBlock {
  return Object.freeze({
    id: input.id,
    kind: input.kind,
    summary: Object.freeze({ ...input.summary }),
    detail: Object.freeze({ ...input.detail }),
    method: Object.freeze({ ...input.method }),
    evidenceRefs: input.evidenceRefs,
    factIds: Object.freeze([...input.factIds]),
    citations: CITATIONS,
    tier: "cultural" as const,
  });
}

function monthFactSuffix(month: MonthForecast): string {
  return String(month.ordinal + 1).padStart(2, "0");
}

function natalBranchesOf(result: SajuResult): readonly number[] {
  return Object.freeze([
    result.pillars.year.branch,
    result.pillars.month.branch,
    result.pillars.day.branch,
    ...(result.pillars.hour ? [result.pillars.hour.branch] : []),
  ]);
}

function roleAnnualBlock(input: {
  readonly year: number;
  readonly annual: AnnualForecast;
  readonly kind: "work" | "growth";
  readonly summary: LocalizedText;
  readonly roleBlurb: Readonly<Record<ElementRole, LocalizedText>>;
  readonly method: LocalizedText;
  /** Must match the ids buildYearForecastFacts() (src/server/ai/facts.ts) actually emits for this lane. */
  readonly factIds: readonly string[];
}): YearForecastBlock {
  const { annual } = input;
  const stemRole = TEN_GOD_ROLE[annual.stemTenGod];
  const branchRole = TEN_GOD_ROLE[annual.branchTenGod];
  const stemGod = TEN_GOD_LABEL[annual.stemTenGod];
  const branchGod = TEN_GOD_LABEL[annual.branchTenGod];
  const stemBlurb = input.roleBlurb[stemRole];
  const branchBlurb = branchRole === stemRole ? null : input.roleBlurb[branchRole];

  return chapterBlock({
    id: `saju-year-forecast-${input.year}-${input.kind}-annual`,
    kind: input.kind,
    summary: input.summary,
    detail: {
      ko: `${input.year}년 세운의 천간 십신은 ${stemGod.ko}, 지지 정기 십신은 ${branchGod.ko}입니다. ${stemBlurb.ko}${branchBlurb ? ` ${branchBlurb.ko}` : ""}`,
      en: `The ${input.year} annual pillar's stem Ten God is ${stemGod.en} and its branch's principal Ten God is ${branchGod.en}. ${stemBlurb.en}${branchBlurb ? ` ${branchBlurb.en}` : ""}`,
    },
    method: input.method,
    evidenceRefs: Object.freeze(["annual-ten-gods"] as const),
    factIds: Object.freeze([...input.factIds]),
  });
}

function roleNotableMonthBlock(input: {
  readonly year: number;
  readonly kind: "work" | "growth";
  readonly month: MonthForecast | null;
  readonly foundSummary: LocalizedText;
  readonly foundDetail: LocalizedText;
  readonly absentSummary: LocalizedText;
  readonly absentDetail: LocalizedText;
  readonly method: LocalizedText;
}): YearForecastBlock {
  const { month } = input;
  if (!month) {
    return chapterBlock({
      id: `saju-year-forecast-${input.year}-${input.kind}-notable-month-none`,
      kind: input.kind,
      summary: input.absentSummary,
      detail: input.absentDetail,
      method: input.method,
      evidenceRefs: Object.freeze(["monthly-ten-gods"] as const),
      factIds: Object.freeze([]),
    });
  }
  return chapterBlock({
    id: `saju-year-forecast-${input.year}-${input.kind}-notable-month-${month.ordinal + 1}`,
    kind: input.kind,
    summary: input.foundSummary,
    detail: input.foundDetail,
    method: input.method,
    evidenceRefs: Object.freeze(["monthly-ten-gods"] as const),
    factIds: Object.freeze([`month.${monthFactSuffix(month)}.stem-god`, `month.${monthFactSuffix(month)}.branch-god`]),
  });
}

const WORK_MONTH_METHOD: LocalizedText = Object.freeze({
  ko: "12개월 중 십신 역할이 재성 또는 관성 계열인 첫 번째 달을 절입 순서대로 선택했습니다. 여러 달이 해당해도 하나만 제시하며, 이는 우선순위가 아니라 단순화한 표기 규칙입니다.",
  en: "Among the twelve months, this selects the first (in solar-term order) whose Ten God role is Wealth or Officer. When several months qualify, only the first is shown; this is a simplification rule, not a claim of priority.",
});

function isWorkRole(role: ElementRole): boolean {
  return role === "wealth" || role === "officer";
}

function workChapterBlocks(input: ChapterInput): readonly YearForecastBlock[] {
  const annualBlock = roleAnnualBlock({
    year: input.year,
    annual: input.annual,
    kind: "work",
    summary: Object.freeze({
      ko: `${input.year}년 세운 십신으로 보는 일·재물`,
      en: `${input.year} annual Ten Gods, read for work and wealth`,
    }),
    roleBlurb: ROLE_WORK_BLURB,
    method: Object.freeze({
      ko: "세운 십신을 비겁·식상·재성·관성·인성 다섯 계열로 묶어 일·재물 맥락으로 재구성했습니다. 이 재구성은 이 구현의 편집 선택이며 특정 유파의 표준 해석이 아닙니다.",
      en: "The annual Ten Gods are regrouped into five traditional families (Companion/Output/Wealth/Officer/Resource) and reframed for a work-and-wealth lens. This regrouping is this implementation's editorial choice, not one school's standard interpretation.",
    }),
    factIds: Object.freeze(["work.stem-god", "work.branch-god"]),
  });

  const notableMonth = input.months.find((month) => (
    isWorkRole(TEN_GOD_ROLE[month.stemTenGod]) || isWorkRole(TEN_GOD_ROLE[month.branchTenGod])
  )) ?? null;

  const monthBlock = roleNotableMonthBlock({
    year: input.year,
    kind: "work",
    month: notableMonth,
    foundSummary: Object.freeze({
      ko: `주목할 달 · ${notableMonth?.labelHanja ?? ""}`,
      en: `Notable month · ${notableMonth?.labelEn ?? ""}`,
    }),
    foundDetail: Object.freeze({
      ko: `${notableMonth?.startTerm.def.ko ?? ""} 절입부터 시작하는 월운은 ${notableMonth?.labelHanja ?? ""}이며, 천간·지지 십신 중 재성·관성 계열이 나타나 일과 재물의 맥락에서 특히 주목할 만합니다. 이 시기의 계획이나 지출 결정을 이 해석만으로 확정하지 마세요.`,
      en: `The solar-term month beginning at ${notableMonth?.startTerm.def.en ?? ""}, pillar ${notableMonth?.labelEn ?? ""}, shows a Wealth- or Officer-group Ten God in its stem or branch, making it worth noting for work and money. Do not finalize plans or spending decisions from this reading alone.`,
    }),
    absentSummary: Object.freeze({ ko: "일·재물 계열의 주목할 달 없음", en: "No notable month for work and wealth" }),
    absentDetail: Object.freeze({
      ko: "이번 12개월 중 재성·관성 계열의 십신이 나타나는 달은 확인되지 않았습니다. 이는 이 구현이 적용한 분류 규칙 기준의 결과이며, 실제로 일·재물과 무관한 해라는 뜻은 아닙니다.",
      en: "No month among the twelve shows a Wealth- or Officer-group Ten God under this implementation's classification rule. This does not mean the year is actually unrelated to work or money.",
    }),
    method: WORK_MONTH_METHOD,
  });

  return Object.freeze([annualBlock, monthBlock]);
}

function isGrowthRole(role: ElementRole): boolean {
  return role === "resource" || role === "output";
}

function growthChapterBlocks(input: ChapterInput): readonly YearForecastBlock[] {
  const annualBlock = roleAnnualBlock({
    year: input.year,
    annual: input.annual,
    kind: "growth",
    summary: Object.freeze({
      ko: `${input.year}년 세운 십신으로 보는 배움·성장`,
      en: `${input.year} annual Ten Gods, read for learning and growth`,
    }),
    roleBlurb: ROLE_GROWTH_BLURB,
    method: Object.freeze({
      ko: "세운 십신을 비겁·식상·재성·관성·인성 다섯 계열로 묶어 배움·성장 맥락으로 재구성했습니다. 이 재구성은 이 구현의 편집 선택이며 특정 유파의 표준 해석이 아닙니다.",
      en: "The annual Ten Gods are regrouped into five traditional families (Companion/Output/Wealth/Officer/Resource) and reframed for a learning-and-growth lens. This regrouping is this implementation's editorial choice, not one school's standard interpretation.",
    }),
    factIds: Object.freeze(["growth.annual-gods"]),
  });

  const notableMonth = input.months.find((month) => (
    isGrowthRole(TEN_GOD_ROLE[month.stemTenGod]) || isGrowthRole(TEN_GOD_ROLE[month.branchTenGod])
  )) ?? null;

  const monthBlock = roleNotableMonthBlock({
    year: input.year,
    kind: "growth",
    month: notableMonth,
    foundSummary: Object.freeze({
      ko: `주목할 달 · ${notableMonth?.labelHanja ?? ""}`,
      en: `Notable month · ${notableMonth?.labelEn ?? ""}`,
    }),
    foundDetail: Object.freeze({
      ko: `${notableMonth?.startTerm.def.ko ?? ""} 절입부터 시작하는 월운 ${notableMonth?.labelHanja ?? ""}에는 인성·식상 계열의 십신이 나타나 배움과 성장의 맥락에서 특히 눈여겨볼 만합니다. 새로운 학습을 시작하거나 점검하기 좋은 계기로 참고하세요.`,
      en: `The solar-term month beginning at ${notableMonth?.startTerm.def.en ?? ""}, pillar ${notableMonth?.labelEn ?? ""}, shows a Resource- or Output-group Ten God, worth noting for learning and growth. Consider it a prompt to start or review a learning effort.`,
    }),
    absentSummary: Object.freeze({ ko: "배움·성장 계열의 주목할 달 없음", en: "No notable month for learning and growth" }),
    absentDetail: Object.freeze({
      ko: "이번 12개월 중 인성·식상 계열의 십신이 나타나는 달은 확인되지 않았습니다. 이는 이 구현이 적용한 분류 규칙 기준의 결과이며, 실제로 배움·성장과 무관한 해라는 뜻은 아닙니다.",
      en: "No month among the twelve shows a Resource- or Output-group Ten God under this implementation's classification rule. This does not mean the year is actually unrelated to learning or growth.",
    }),
    method: Object.freeze({
      ko: "12개월 중 십신 역할이 인성 또는 식상 계열인 첫 번째 달을 절입 순서대로 선택했습니다. 여러 달이 해당해도 하나만 제시하며, 이는 우선순위가 아니라 단순화한 표기 규칙입니다.",
      en: "Among the twelve months, this selects the first (in solar-term order) whose Ten God role is Resource or Output. When several months qualify, only the first is shown; this is a simplification rule, not a claim of priority.",
    }),
  });

  return Object.freeze([annualBlock, monthBlock]);
}

function wellbeingChapterBlocks(input: ChapterInput): readonly YearForecastBlock[] {
  const annualPhase = STAGE_PHASE[input.annual.stage];
  const phaseBlurb = annualPhase ? PHASE_WELLBEING_BLURB[annualPhase] : null;

  const annualBlock = chapterBlock({
    id: `saju-year-forecast-${input.year}-wellbeing-annual`,
    kind: "wellbeing",
    summary: Object.freeze({
      ko: `${input.year}년 세운 십이운성으로 보는 몸과 리듬`,
      en: `${input.year} annual Growth Stage, read for body and rhythm`,
    }),
    detail: phaseBlurb ?? Object.freeze({
      ko: `${input.year}년 세운의 십이운성은 ${input.annual.stage}입니다.`,
      en: `The ${input.year} annual pillar's Growth Stage is ${input.annual.stage}.`,
    }),
    method: Object.freeze({
      ko: "십이운성 12단계를 성장기(장생·목욕·관대)·전성기(건록·제왕)·쇠퇴기(쇠·병·사)·준비기(묘·절·태·양) 네 국면으로 묶었습니다. 이 그룹핑은 접근성을 위한 이 구현의 단순화이며 유파 표준이 아닙니다.",
      en: "The twelve Growth Stages are grouped into four phases: rising (Growth/Bath/Cap), peak (Prosperity/Peak), declining (Decline/Illness/Death), and resting (Tomb/Extinction/Gestation/Nurture). This grouping is a simplification for accessibility, not a school standard.",
    }),
    evidenceRefs: Object.freeze(["annual-stage"] as const),
    factIds: Object.freeze(["wellbeing.annual-stage"]),
  });

  const notableMonth = input.months.find((month) => STAGE_PHASE[month.stage] !== annualPhase) ?? null;

  const monthBlock = notableMonth
    ? chapterBlock({
        id: `saju-year-forecast-${input.year}-wellbeing-notable-month-${notableMonth.ordinal + 1}`,
        kind: "wellbeing",
        summary: Object.freeze({ ko: `주목할 달 · ${notableMonth.labelHanja}`, en: `Notable month · ${notableMonth.labelEn}` }),
        detail: Object.freeze({
          ko: `${notableMonth.startTerm.def.ko} 절입부터 시작하는 월운 ${notableMonth.labelHanja}은 세운의 십이운성 국면과 다른 국면으로 분류되어, 그 해 안에서 리듬이 바뀌는 시점을 살피는 참고 표식이 됩니다.`,
          en: `The solar-term month beginning at ${notableMonth.startTerm.def.en}, pillar ${notableMonth.labelEn}, falls into a different Growth Stage phase than the annual pillar, marking a point worth watching for a shift in rhythm during the year.`,
        }),
        method: Object.freeze({
          ko: "12개월 중 십이운성 국면이 세운과 다른 첫 번째 달을 절입 순서대로 선택했습니다. 국면 전환 자체를 좋고 나쁨으로 판정하지 않습니다.",
          en: "Among the twelve months, this selects the first (in solar-term order) whose Growth Stage phase differs from the annual pillar's. The phase change itself is not rated good or bad.",
        }),
        evidenceRefs: Object.freeze(["monthly-stage"] as const),
        factIds: Object.freeze([`month.${monthFactSuffix(notableMonth)}.stage`]),
      })
    : chapterBlock({
        id: `saju-year-forecast-${input.year}-wellbeing-notable-month-none`,
        kind: "wellbeing",
        summary: Object.freeze({ ko: "몸과 리듬 계열의 주목할 달 없음", en: "No notable month for body and rhythm" }),
        detail: Object.freeze({
          ko: "이번 12개월의 십이운성은 모두 세운과 같은 국면으로 분류되어, 국면이 뚜렷하게 전환되는 달은 확인되지 않았습니다.",
          en: "All twelve months' Growth Stages fall into the same phase as the annual pillar, so no month marks a clear phase transition.",
        }),
        method: Object.freeze({
          ko: "12개월 중 십이운성 국면이 세운과 다른 달을 찾는 규칙을 적용한 결과, 해당하는 달이 없었습니다.",
          en: "Applying the rule that looks for a month whose Growth Stage phase differs from the annual pillar's, no month matched.",
        }),
        evidenceRefs: Object.freeze(["monthly-stage"] as const),
        factIds: Object.freeze([]),
      });

  return Object.freeze([annualBlock, monthBlock]);
}

function relationshipsChapterBlocks(input: ChapterInput): readonly YearForecastBlock[] {
  const primary = input.natalBranchRelations[0] ?? null;
  const extraCount = Math.max(0, input.natalBranchRelations.length - 1);

  const annualBlock = chapterBlock({
    id: `saju-year-forecast-${input.year}-relationships-annual`,
    kind: "relationships",
    summary: Object.freeze({
      ko: `${input.year}년 세운 지지 관계로 보는 관계`,
      en: `${input.year} annual branch relations, read for relationships`,
    }),
    detail: primary
      ? Object.freeze({
          ko: `${input.year}년 세운 지지와 원국 ${PILLAR_LABEL[primary.natalPillar].ko} 사이에서 ${RELATION_KIND_LABEL[primary.relation.kind].ko} 관계가 확인됩니다. ${RELATION_KIND_BLURB[primary.relation.kind].ko}${extraCount > 0 ? ` 이 외에도 ${extraCount}건의 관계가 더 확인되었으며, 전체 목록은 이 리포트의 세운·원국 지지 관계 항목에서 볼 수 있습니다.` : ""}`,
          en: `A ${RELATION_KIND_LABEL[primary.relation.kind].en} relation is found between the ${input.year} annual branch and the natal ${PILLAR_LABEL[primary.natalPillar].en}. ${RELATION_KIND_BLURB[primary.relation.kind].en}${extraCount > 0 ? ` ${extraCount} more relation${extraCount === 1 ? "" : "s"} were also found; see this report's annual-to-natal branch relations item for the full list.` : ""}`,
        })
      : NO_NATAL_RELATION_BLURB,
    method: Object.freeze({
      ko: "원국 관계 여섯 종류(충·육합·삼합·형·해·파)를 관계 맥락으로 재구성했습니다. 여러 관계가 확인되면 첫 번째 관계만 이 챕터에서 설명하며, 전체 목록은 별도 항목에 있습니다.",
      en: "The six traditional relation kinds (clash, combination, trine, punishment, harm, destruction) are reframed for a relationships lens. When several relations are found, only the first is described in this chapter; the full list appears in a separate item.",
    }),
    evidenceRefs: Object.freeze(["natal-branch-relations"] as const),
    factIds: Object.freeze(primary ? ["relationship.relation-1"] : ["relationship.none-found"]),
  });

  const natalBranches = natalBranchesOf(input.result);
  const notableMonth = input.months.find((month) => (
    natalBranches.some((branch) => branchRelationsOf(month.pillar.branch, branch).length > 0)
  )) ?? null;

  const monthBlock = notableMonth
    ? chapterBlock({
        id: `saju-year-forecast-${input.year}-relationships-notable-month-${notableMonth.ordinal + 1}`,
        kind: "relationships",
        summary: Object.freeze({ ko: `주목할 달 · ${notableMonth.labelHanja}`, en: `Notable month · ${notableMonth.labelEn}` }),
        detail: Object.freeze({
          ko: `${notableMonth.startTerm.def.ko} 절입부터 시작하는 월운 ${notableMonth.labelHanja}의 지지는 입력된 원국 지지와 전통 관계표상의 조합을 이룹니다. 이는 그 시기에 관계를 특별히 의식해 보는 참고 표식일 뿐, 사건을 예고하지 않습니다.`,
          en: `The branch of the solar-term month beginning at ${notableMonth.startTerm.def.en}, pillar ${notableMonth.labelEn}, forms a traditional relation-table combination with a supplied natal branch. Treat it only as a cue to be mindful of relationships during that period, not a forecast of an event.`,
        }),
        method: Object.freeze({
          ko: "12개월 중 월지가 원국의 연지·월지·일지(및 시지가 있으면 시지)와 관계표 조합을 이루는 첫 번째 달을 절입 순서대로 선택했습니다.",
          en: "Among the twelve months, this selects the first (in solar-term order) whose branch forms a relation-table combination with the natal Year, Month, or Day branch (and Hour branch when available).",
        }),
        evidenceRefs: Object.freeze(["monthly-pillar"] as const),
        factIds: Object.freeze([`month.${monthFactSuffix(notableMonth)}.pillar`]),
      })
    : chapterBlock({
        id: `saju-year-forecast-${input.year}-relationships-notable-month-none`,
        kind: "relationships",
        summary: Object.freeze({ ko: "관계 계열의 주목할 달 없음", en: "No notable month for relationships" }),
        detail: Object.freeze({
          ko: "이번 12개월의 월지 중 원국 지지와 관계표 조합을 이루는 달은 확인되지 않았습니다.",
          en: "No month's branch among the twelve forms a relation-table combination with a natal branch.",
        }),
        method: Object.freeze({
          ko: "12개월 중 월지가 원국 지지와 관계표 조합을 이루는 달을 찾는 규칙을 적용한 결과, 해당하는 달이 없었습니다.",
          en: "Applying the rule that looks for a month branch forming a relation-table combination with a natal branch, no month matched.",
        }),
        evidenceRefs: Object.freeze(["monthly-pillar"] as const),
        factIds: Object.freeze([]),
      });

  return Object.freeze([annualBlock, monthBlock]);
}

/** Build the four domain chapters from already-calculated year-forecast data. */
export function buildYearForecastChapters(input: ChapterInput): readonly YearForecastBlock[] {
  return Object.freeze([
    ...workChapterBlocks(input),
    ...relationshipsChapterBlocks(input),
    ...wellbeingChapterBlocks(input),
    ...growthChapterBlocks(input),
  ]);
}
