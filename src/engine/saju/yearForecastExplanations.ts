import type { Citation } from "@engine/shared/citation";
import {
  BRANCHES,
  TEN_GOD_LABEL,
  TWELVE_STAGE_EN,
  branchAt,
} from "./constants";
import type { TenGod } from "./constants";
import {
  SAJU_CALCULATION_CITATIONS,
  SAJU_TRADITION_CITATIONS,
} from "./citations";
import type { BranchRelationKind } from "./relations";
import type { ContentLocale } from "../shared/explanation";
import type {
  AnnualForecast,
  BirthContext,
  LuckOverlap,
  MonthForecast,
  NatalBranchRelation,
  YearForecastBlock,
  NonEmptyYearForecastEvidenceRefs,
} from "./yearForecast";

interface ExplanationInput {
  readonly year: number;
  readonly annual: AnnualForecast;
  readonly months: readonly MonthForecast[];
  readonly natalBranchRelations: readonly NatalBranchRelation[];
  readonly luckOverlap: LuckOverlap;
  readonly birthContext: BirthContext;
}

const CITATIONS: readonly Citation[] = Object.freeze([
  ...SAJU_CALCULATION_CITATIONS,
  ...SAJU_TRADITION_CITATIONS,
]);

const RELATION_LABELS: Readonly<Record<BranchRelationKind, { readonly ko: string; readonly en: string }>> =
  Object.freeze({
    clash: Object.freeze({ ko: "충", en: "clash" }),
    combination: Object.freeze({ ko: "육합", en: "six-combination" }),
    trine: Object.freeze({ ko: "삼합", en: "trine" }),
    punishment: Object.freeze({ ko: "형", en: "punishment" }),
    harm: Object.freeze({ ko: "해", en: "harm" }),
    destruction: Object.freeze({ ko: "파", en: "destruction" }),
  });

const PILLAR_LABELS = Object.freeze({
  year: Object.freeze({ ko: "연지", en: "Year Branch" }),
  month: Object.freeze({ ko: "월지", en: "Month Branch" }),
  day: Object.freeze({ ko: "일지", en: "Day Branch" }),
  hour: Object.freeze({ ko: "시지", en: "Hour Branch" }),
});

function stemGodLabel(god: TenGod, locale: ContentLocale): string {
  return TEN_GOD_LABEL[god][locale === "ko" ? "ko" : "en"];
}

function stageLabel(stage: string, locale: ContentLocale): string {
  return locale === "ko" ? stage : (TWELVE_STAGE_EN[stage] ?? stage);
}

function relationLines(relations: readonly NatalBranchRelation[], locale: ContentLocale): readonly string[] {
  return Object.freeze(
    relations.map((item) => {
      const natalBranch = branchAt(item.natalBranch);
      const relatedBranches = item.relation.branches
        .map((branch) => BRANCHES[branch]?.hanja ?? "")
        .filter(Boolean)
        .join("");
      const contentLocale = locale === "ko" ? "ko" : "en";
      const label = RELATION_LABELS[item.relation.kind][contentLocale];
      const pillar = PILLAR_LABELS[item.natalPillar][contentLocale];
      return locale === "ko"
        ? `${pillar} ${natalBranch.hanja} · ${label}(${relatedBranches})`
        : `${pillar} ${natalBranch.hanja} · ${label} (${relatedBranches})`;
    }),
  );
}

function block(input: {
  readonly id: string;
  readonly kind: YearForecastBlock["kind"];
  readonly summary: YearForecastBlock["summary"];
  readonly detail: YearForecastBlock["detail"];
  readonly method: YearForecastBlock["method"];
  readonly evidenceRefs: NonEmptyYearForecastEvidenceRefs;
}): YearForecastBlock {
  return Object.freeze({
    ...input,
    summary: Object.freeze({ ...input.summary }),
    detail: Object.freeze({ ...input.detail }),
    method: Object.freeze({ ...input.method }),
    evidenceRefs: input.evidenceRefs,
    citations: CITATIONS,
    tier: "cultural" as const,
  });
}

function annualBlock(year: number, annual: AnnualForecast): YearForecastBlock {
  const stemGodKo = stemGodLabel(annual.stemTenGod, "ko");
  const stemGodEn = stemGodLabel(annual.stemTenGod, "en");
  const branchGodKo = stemGodLabel(annual.branchTenGod, "ko");
  const branchGodEn = stemGodLabel(annual.branchTenGod, "en");
  const stageKo = stageLabel(annual.stage, "ko");
  const stageEn = stageLabel(annual.stage, "en");

  return block({
    id: `saju-year-forecast-${year}-annual`,
    kind: "annual",
    summary: {
      ko: `${year}년 세운 ${annual.labelHanja} (${annual.labelKo})`,
      en: `${year} annual pillar ${annual.labelEn} (${annual.labelHanja})`,
    },
    detail: {
      ko: `입춘 경계를 기준으로 계산한 ${year}년 세운은 ${annual.labelHanja}입니다. 일간 기준 천간 십신은 ${stemGodKo}, 지지 정기 십신은 ${branchGodKo}, 십이운성은 ${stageKo}로 산출됩니다. 전통 분류를 자기성찰의 질문에 참고할 수 있지만, 특정 사건이나 결과를 확정하지는 않습니다.`,
      en: `At the Ipchun boundary, the ${year} annual pillar is ${annual.labelEn} (${annual.labelHanja}). The Day-Master-relative stem Ten God is ${stemGodEn}, the branch's principal Hidden-Stem Ten God is ${branchGodEn}, and the Twelve Stage is ${stageEn}. These traditional labels can support reflection; they do not determine specific events or outcomes.`,
    },
    method: {
      ko: "세운은 기존 입춘 기준 연주 계산을 재사용합니다. 십신은 일간과 천간·지지 정기의 관계로, 십이운성은 일간과 지지의 위치로 산출합니다. 참고 고전은 용어의 계보 표지이며 결과를 검증하거나 보장하는 근거가 아닙니다.",
      en: "This reuses the engine's Ipchun-based year-pillar calculation. Ten Gods are derived from the Day Master's relation to the stem and principal Hidden Stem; the Twelve Stage is derived from the Day Master and branch. Classical references mark interpretive lineage and do not validate or guarantee an outcome.",
    },
    evidenceRefs: annual.evidenceRefs,
  });
}

function monthBlock(year: number, month: MonthForecast): YearForecastBlock {
  const stemGodKo = stemGodLabel(month.stemTenGod, "ko");
  const stemGodEn = stemGodLabel(month.stemTenGod, "en");
  const branchGodKo = stemGodLabel(month.branchTenGod, "ko");
  const branchGodEn = stemGodLabel(month.branchTenGod, "en");
  const stageKo = stageLabel(month.stage, "ko");
  const stageEn = stageLabel(month.stage, "en");
  const monthName = branchAt(month.pillar.branch);

  return block({
    id: `saju-year-forecast-${year}-month-${month.ordinal + 1}`,
    kind: "month",
    summary: {
      ko: `${month.startTerm.def.ko} 절입부터 · ${month.labelHanja} (${monthName.ko}월)`,
      en: `Month ${month.ordinal + 1} from ${month.startTerm.def.en} · ${month.labelEn} (${month.labelHanja})`,
    },
    detail: {
      ko: `이 월운은 ${month.startTerm.def.ko} 절입부터 다음 절입 직전까지의 구간에 해당하며, 월주는 ${month.labelHanja}입니다. 일간 기준 천간 십신 ${stemGodKo}, 지지 정기 십신 ${branchGodKo}, 십이운성 ${stageKo}는 계산된 전통 분류입니다. 달마다 특정 사건이 일어난다고 예측하지 않으며, 해당 시기의 역할·자원·생활 리듬을 돌아보는 참고 표식으로 제시합니다.`,
      en: `This solar-term month runs from ${month.startTerm.def.en} up to, but not including, the next term; its Month Pillar is ${month.labelEn} (${month.labelHanja}). The Day-Master-relative stem Ten God is ${stemGodEn}, the branch's principal Hidden-Stem Ten God is ${branchGodEn}, and the Twelve Stage is ${stageEn}. These are calculated traditional labels, not predictions of specific monthly events; use them only as prompts to reflect on roles, resources, and pace.`,
    },
    method: {
      ko: "각 월은 입춘부터 시작하는 사주년의 12개 절(節)로 나누며, 시작 절입은 포함하고 다음 절입은 포함하지 않습니다. 월간은 세운 연간에서 오호둔 규칙으로 계산합니다.",
      en: "Each Saju year is divided by its twelve major solar terms, starting at Ipchun; a month includes its start term and excludes the next. The Month Stem follows the existing Five-Tiger Escape rule from the annual stem.",
    },
    evidenceRefs: month.evidenceRefs,
  });
}

function natalRelationsBlock(
  year: number,
  annual: AnnualForecast,
  relations: readonly NatalBranchRelation[],
): YearForecastBlock {
  const koLines = relationLines(relations, "ko");
  const enLines = relationLines(relations, "en");
  const annualBranch = branchAt(annual.pillar.branch);
  const koDetail = koLines.length > 0
    ? `${year}년 세운 지지 ${annualBranch.hanja}와 입력된 원국 지지에서 확인된 관계 조합은 다음과 같습니다: ${koLines.join("; ")}. 이는 전통 관계표에 따른 조합 표기일 뿐, 관계의 성패나 사건을 판정하지 않습니다.`
    : `${year}년 세운 지지 ${annualBranch.hanja}와 입력된 원국 지지 사이에서 현재 엔진의 관계표에 정의된 조합은 확인되지 않았습니다. 이 결과는 해당 관계 규칙의 조회 결과이며, 실제 관계나 사건에 대한 판단은 아닙니다.`;
  const enDetail = enLines.length > 0
    ? `The engine found these traditional relation-table matches between the ${year} annual branch ${annualBranch.en} (${annualBranch.hanja}) and the supplied natal branches: ${enLines.join("; ")}. They name symbolic combinations only and do not determine relationship outcomes or events.`
    : `No relation-table combination defined by the current engine was found between the ${year} annual branch ${annualBranch.en} (${annualBranch.hanja}) and the supplied natal branches. This reports only the lookup result for those rules; it makes no claim about real relationships or events.`;

  return block({
    id: `saju-year-forecast-${year}-natal-relations`,
    kind: "natal-relations",
    summary: {
      ko: `${year}년 세운 지지와 원국 지지 관계`,
      en: `${year} annual-to-natal branch relations`,
    },
    detail: { ko: koDetail, en: enDetail },
    method: {
      ko: "연지·월지·일지와 시각이 입력된 경우 시지를 각각 세운 지지와 비교해 기존 branchRelationsOf 규칙으로 조회했습니다. 관계 그룹은 전통 명리 용어의 분류이며, 결과를 확정하는 인과 모형이 아닙니다.",
      en: "The annual branch is compared with the supplied Year, Month, and Day branches, plus the Hour branch when a birth time is available, using the existing branchRelationsOf rules. These are traditional categories, not a causal model that establishes outcomes.",
    },
    evidenceRefs: Object.freeze(["natal-branch-relations"] as const),
  });
}

function luckBlock(year: number, overlap: LuckOverlap): YearForecastBlock {
  let detailKo: string;
  let detailEn: string;

  if (overlap.status === "unavailable-time-unknown") {
    detailKo = `출생 시각이 미상이라 ${year}년과 겹치는 대운을 제시하지 않습니다. 기존 대운 시작 나이는 시각과 절입 사이의 거리를 사용하므로, 시각 미상 입력의 대운 구간을 정확한 겹침으로 표시하면 과도한 확정이 됩니다.`;
    detailEn = `No Major Luck overlap is shown for ${year} because the birth time is unknown. The existing starting-age calculation uses the distance from birth time to a solar-term boundary, so presenting an exact overlap from an unknown-time chart would overstate precision.`;
  } else if (overlap.periods.length > 0) {
    const descriptions = overlap.periods.map((period) => `${period.fromYear}–${period.toYear} (${period.fromAge}–${period.toAge}세)`).join(", ");
    const descriptionsEn = overlap.periods.map((period) => `${period.fromYear}–${period.toYear} (ages ${period.fromAge}–${period.toAge})`).join(", ");
    detailKo = `기존 엔진이 계산한 대운 목록에서 ${year}년과 겹치는 후보 구간은 ${descriptions}입니다. 이 겹침은 반올림된 그레고리력 연도 범위를 사용하므로 정확한 절입 시점의 경계를 뜻하지 않습니다. 대운은 자기성찰용 문화 분류이며 그 해의 결과를 예언하지 않습니다.`;
    detailEn = `The existing Major Luck list marks ${descriptionsEn} as overlapping ${year}. This lookup uses rounded Gregorian-year bounds and does not identify an exact solar-term boundary. Major Luck is a cultural reflection framework, not a prediction of that year's outcomes.`;
  } else {
    detailKo = `현재 계산된 대운 목록에는 ${year}년의 그레고리력 연도 범위와 겹치는 구간이 없습니다. 이는 제공된 대운 목록과 그 반올림 연도 범위만 조회한 결과입니다.`;
    detailEn = `No period in the currently calculated Major Luck list overlaps the Gregorian year range for ${year}. This reflects only the supplied list and its rounded year bounds.`;
  }

  return block({
    id: `saju-year-forecast-${year}-luck-overlap`,
    kind: "luck-overlap",
    summary: {
      ko: `${year}년과 대운 구간의 겹침`,
      en: `${year} Major Luck overlap`,
    },
    detail: { ko: detailKo, en: detailEn },
    method: {
      ko: "기존 대운 데이터의 fromYear ≤ 대상 연도 < toYear 규칙만 사용합니다. fromYear와 toYear는 시작 나이를 정수로 환산한 달력 연도이므로, 정확한 기간 경계로 읽지 않습니다.",
      en: "This checks only the existing period rule fromYear ≤ target year < toYear. Those Gregorian years derive from the rounded integer starting age and are not exact period boundaries.",
    },
    evidenceRefs: overlap.evidenceRefs,
  });
}

function birthContextBlock(year: number, context: BirthContext): YearForecastBlock {
  let detailKo: string;
  let detailEn: string;

  if (context.timeUnknown) {
    detailKo = `출생 시각이 미상이라 시주를 계산하지 않았습니다. 따라서 23시 야자시 경계 여부도 입력만으로 확인할 수 없으며, 날짜 기준 계산에 포함되지 않은 시각 정보가 결과에 영향을 줄 수 있습니다. ${year}년 세운·월운의 입춘·절입 경계는 출생 시각과 별도로 계산됩니다.`;
    detailEn = `The birth time is unknown, so no Hour Pillar was calculated. The input cannot establish whether the late-Zi boundary at 23:00 applies, and omitted time information may affect the natal result. The ${year} annual and monthly Ipchun/solar-term boundaries are calculated separately from the birth time.`;
  } else if (context.inLateZiHour) {
    const ruleKo = context.dayBoundaryRule === "zi23" ? "23시 야자시론" : "자정 경계론";
    const ruleEn = context.dayBoundaryRule === "zi23" ? "the 23:00 late-Zi rule" : "the midnight-boundary rule";
    detailKo = `입력된 출생 시각은 23시 자시 구간이며, 선택된 ${ruleKo}을 원국의 일주 산출에 적용했습니다. 다른 경계 학설을 선택하면 일주와 그에 따른 십신·대운 계산이 달라질 수 있습니다. 이 선택은 ${year}년의 입춘 기준 세운 경계를 바꾸지 않습니다.`;
    detailEn = `The supplied birth time falls in the 23:00 Zi hour, and ${ruleEn} was applied to the natal Day Pillar. Choosing the other convention can change the Day Pillar and derived Ten-God/Major-Luck calculations. This choice does not change the ${year} Ipchun boundary for the annual pillar.`;
  } else {
    const ruleKo = context.dayBoundaryRule === "zi23" ? "23시 야자시론" : "자정 경계론";
    const ruleEn = context.dayBoundaryRule === "zi23" ? "the 23:00 late-Zi rule" : "the midnight-boundary rule";
    detailKo = `출생 시각을 알고 있으며 원국에는 ${ruleKo}을 적용했습니다. 이 입력은 23시 경계 구간이 아니므로, 현재 엔진의 두 일주 경계 규칙은 이 차트의 일주를 다르게 만들지 않습니다.`;
    detailEn = `The birth time is known and the natal chart uses ${ruleEn}. This input is outside the 23:00 boundary interval, so the engine's two Day-Pillar boundary conventions do not produce different Day Pillars for this chart.`;
  }

  return block({
    id: `saju-year-forecast-${year}-birth-context`,
    kind: "birth-context",
    summary: {
      ko: "출생 시각과 일주 경계 적용",
      en: "Birth-time precision and Day-Pillar boundary",
    },
    detail: { ko: detailKo, en: detailEn },
    method: {
      ko: "이 블록은 원국 엔진이 기록한 timeUnknown, 시주 유무, inLateZiHour, dayBoundaryRule 값을 그대로 설명합니다. 미상 입력에 대해서는 시각을 추정하지 않습니다.",
      en: "This block reports the natal engine's timeUnknown, Hour-Pillar availability, inLateZiHour, and dayBoundaryRule fields. It does not infer a missing birth time.",
    },
    evidenceRefs: context.evidenceRefs,
  });
}

/** Build culturally scoped, bilingual text blocks from already-calculated data. */
export function buildYearForecastExplanations(input: ExplanationInput): readonly YearForecastBlock[] {
  return Object.freeze([
    annualBlock(input.year, input.annual),
    ...input.months.map((month) => monthBlock(input.year, month)),
    natalRelationsBlock(input.year, input.annual, input.natalBranchRelations),
    luckBlock(input.year, input.luckOverlap),
    birthContextBlock(input.year, input.birthContext),
  ]);
}
