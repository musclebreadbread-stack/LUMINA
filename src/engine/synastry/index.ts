import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import { CONTROLS, GENERATES, stemAt, type FiveElement } from "@engine/saju/constants";
import { SAJU_TRADITION_CITATIONS } from "@engine/saju/citations";
import { branchRelationsOf, type BranchRelationKind } from "@engine/saju/relations";
import type { FourPillars, Pillar } from "@engine/saju/pillars";

export type SynastryPillarKey = "year" | "month" | "day" | "hour";
export type StemRelationKind =
  | "same-element"
  | "generates"
  | "controls"
  | "receives-generation"
  | "receives-control"
  | "different";
export type SynastryTone = "supportive" | "challenging" | "mixed" | "quiet";

export interface SynastryPillarLabel {
  readonly key: SynastryPillarKey;
  readonly ko: string;
  readonly en: string;
}

export interface SynastryBranchRelation {
  readonly leftPillar: SynastryPillarKey;
  readonly rightPillar: SynastryPillarKey;
  readonly leftBranch: number;
  readonly rightBranch: number;
  readonly kind: BranchRelationKind;
  readonly branches: readonly number[];
}

export interface SynastryStemRelation {
  readonly leftPillar: SynastryPillarKey;
  readonly rightPillar: SynastryPillarKey;
  readonly leftStem: number;
  readonly rightStem: number;
  readonly kind: StemRelationKind;
  readonly leftElement: FiveElement;
  readonly rightElement: FiveElement;
}

export interface SynastrySummary {
  readonly branchRelationCount: number;
  readonly supportiveCount: number;
  readonly challengingCount: number;
  readonly stemRelationCount: number;
  readonly tone: SynastryTone;
}

export interface SynastryResult {
  readonly engine: "synastry";
  readonly tier: "cultural";
  readonly version: 1;
  readonly pillars: readonly SynastryPillarLabel[];
  readonly branchRelations: readonly SynastryBranchRelation[];
  readonly stemRelations: readonly SynastryStemRelation[];
  readonly dayMaster: SynastryStemRelation;
  readonly summary: SynastrySummary;
  readonly explanation: ExplanationBlock;
}

const PILLARS: readonly SynastryPillarLabel[] = Object.freeze([
  Object.freeze({ key: "year" as const, ko: "년주", en: "Year Pillar" }),
  Object.freeze({ key: "month" as const, ko: "월주", en: "Month Pillar" }),
  Object.freeze({ key: "day" as const, ko: "일주", en: "Day Pillar" }),
  Object.freeze({ key: "hour" as const, ko: "시주", en: "Hour Pillar" }),
]);

const BRANCH_RELATION_LABELS: Readonly<Record<BranchRelationKind, LocalizedText>> = Object.freeze({
  clash: Object.freeze({ ko: "충", en: "Clash" }),
  combination: Object.freeze({ ko: "합", en: "Combination" }),
  trine: Object.freeze({ ko: "삼합", en: "Trine" }),
  punishment: Object.freeze({ ko: "형", en: "Punishment" }),
  harm: Object.freeze({ ko: "해", en: "Harm" }),
  destruction: Object.freeze({ ko: "파", en: "Destruction" }),
});

const SUPPORTIVE_RELATIONS: ReadonlySet<BranchRelationKind> = new Set(["combination", "trine"]);
const CHALLENGING_RELATIONS: ReadonlySet<BranchRelationKind> = new Set([
  "clash",
  "punishment",
  "harm",
  "destruction",
]);

function visiblePillar(
  pillars: FourPillars,
  key: SynastryPillarKey,
): Pillar | null {
  return key === "hour" ? pillars.hour : pillars[key];
}

function stemRelation(left: Pillar, right: Pillar): StemRelationKind {
  const leftElement = stemAt(left.stem).element;
  const rightElement = stemAt(right.stem).element;
  if (leftElement === rightElement) return "same-element";
  if (GENERATES[leftElement] === rightElement) return "generates";
  if (CONTROLS[leftElement] === rightElement) return "controls";
  if (GENERATES[rightElement] === leftElement) return "receives-generation";
  if (CONTROLS[rightElement] === leftElement) return "receives-control";
  return "different";
}

function stemRelationLabel(kind: StemRelationKind): LocalizedText {
  const labels: Readonly<Record<StemRelationKind, LocalizedText>> = {
    "same-element": { ko: "같은 오행", en: "Same element" },
    generates: { ko: "생하는 관계", en: "Left generates right" },
    controls: { ko: "극하는 관계", en: "Left controls right" },
    "receives-generation": { ko: "생을 받는 관계", en: "Left receives generation" },
    "receives-control": { ko: "극을 받는 관계", en: "Left receives control" },
    different: { ko: "다른 오행", en: "Different elements" },
  };
  return labels[kind];
}

function toneOf(supportiveCount: number, challengingCount: number): SynastryTone {
  if (supportiveCount === 0 && challengingCount === 0) return "quiet";
  if (supportiveCount > 0 && challengingCount > 0) return "mixed";
  return supportiveCount > challengingCount ? "supportive" : "challenging";
}

function relationText(kind: BranchRelationKind): LocalizedText {
  return BRANCH_RELATION_LABELS[kind];
}

function makeExplanation(
  summary: SynastrySummary,
  dayMaster: SynastryStemRelation,
): ExplanationBlock {
  const relation = relationText(
    summary.supportiveCount > summary.challengingCount ? "combination" : "clash",
  );
  const stem = stemRelationLabel(dayMaster.kind);
  const toneKo = summary.tone === "quiet" ? "뚜렷한 분류 신호가 적은" : summary.tone === "mixed" ? "서로 다른 신호가 함께 있는" : `${relation.ko} 신호가 더 많은`;
  const toneEn = summary.tone === "quiet" ? "few named branch signals" : summary.tone === "mixed" ? "both supportive and challenging signals" : summary.tone === "supportive" ? "more supportive signals" : "more challenging signals";

  return freezeExplanationBlock({
    id: "saju-synastry",
    summary: Object.freeze({
      ko: `두 차트에는 ${toneKo} 흐름이 보입니다. 일간 관계는 ${stem.ko}입니다.`,
      en: `The two charts show ${toneEn}. The Day Master relationship is ${stem.en}.`,
    }),
    detail: Object.freeze({
      ko: `두 사람의 네 기둥에서 가능한 지지 관계를 서로 비교해 합·충·삼합·형·해·파를 나열했습니다. 이 결과는 ${summary.branchRelationCount}개의 지지 관계와 ${summary.stemRelationCount}개의 천간 관계를 보여 줍니다. 일간은 ${stemAt(dayMaster.leftStem).ko}와 ${stemAt(dayMaster.rightStem).ko}의 오행을 비교한 값입니다. 관계의 이름은 대화에서 서로 편안하게 맞물리는 장면이나 조정이 필요한 장면을 찾는 질문으로만 사용하며, 잘 맞는다·안 맞는다는 운명 판정이나 관계의 성공 확률을 뜻하지 않습니다.`,
      en: `The engine compares visible branches across the two four-pillar charts and lists named combinations, clashes, trines, punishments, harms, and destructions. This result contains ${summary.branchRelationCount} branch relations and ${summary.stemRelationCount} stem comparisons. The Day Master row compares the elements of ${stemAt(dayMaster.leftStem).en} and ${stemAt(dayMaster.rightStem).en}. Use the labels as prompts for noticing moments of ease or adjustment in an actual relationship; they are not a destiny verdict, a compatibility score, or a probability of success.`,
    }),
    method: Object.freeze({
      ko: "지지 관계는 LUMINA 사주 엔진의 전통 관계표를 두 프로필의 모든 보이는 지지 쌍에 적용합니다. 천간 관계는 오행의 동일·생·극 방향을 별도로 기록합니다. 두 체계를 하나의 과학적 점수로 합산하지 않습니다.",
      en: "Branch relations apply the Saju engine's traditional relation table to every visible branch pair across the two profiles. Stem relations separately record same-element, generating, and controlling directions. The two systems are not collapsed into a scientific score.",
    }),
    evidenceRefs: Object.freeze(["saju-synastry-branches", "saju-synastry-stems"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
    tier: "cultural",
  });
}

export function computeSynastry(left: FourPillars, right: FourPillars): SynastryResult {
  const branchRelations: SynastryBranchRelation[] = [];
  const stemRelations: SynastryStemRelation[] = [];

  for (const leftLabel of PILLARS) {
    const leftPillar = visiblePillar(left, leftLabel.key);
    if (!leftPillar) continue;
    for (const rightLabel of PILLARS) {
      const rightPillar = visiblePillar(right, rightLabel.key);
      if (!rightPillar) continue;
      for (const relation of branchRelationsOf(leftPillar.branch, rightPillar.branch)) {
        branchRelations.push(
          Object.freeze({
            leftPillar: leftLabel.key,
            rightPillar: rightLabel.key,
            leftBranch: leftPillar.branch,
            rightBranch: rightPillar.branch,
            kind: relation.kind,
            branches: relation.branches,
          }),
        );
      }
      if (leftLabel.key === rightLabel.key) {
        const kind = stemRelation(leftPillar, rightPillar);
        stemRelations.push(
          Object.freeze({
            leftPillar: leftLabel.key,
            rightPillar: rightLabel.key,
            leftStem: leftPillar.stem,
            rightStem: rightPillar.stem,
            kind,
            leftElement: stemAt(leftPillar.stem).element,
            rightElement: stemAt(rightPillar.stem).element,
          }),
        );
      }
    }
  }

  const dayLeft = left.day;
  const dayRight = right.day;
  const dayMaster: SynastryStemRelation = Object.freeze({
    leftPillar: "day",
    rightPillar: "day",
    leftStem: dayLeft.stem,
    rightStem: dayRight.stem,
    kind: stemRelation(dayLeft, dayRight),
    leftElement: stemAt(dayLeft.stem).element,
    rightElement: stemAt(dayRight.stem).element,
  });
  if (!stemRelations.some((item) => item.leftPillar === "day" && item.rightPillar === "day")) {
    stemRelations.push(dayMaster);
  }

  const supportiveCount = branchRelations.filter((item) => SUPPORTIVE_RELATIONS.has(item.kind)).length;
  const challengingCount = branchRelations.filter((item) => CHALLENGING_RELATIONS.has(item.kind)).length;
  const summary: SynastrySummary = Object.freeze({
    branchRelationCount: branchRelations.length,
    supportiveCount,
    challengingCount,
    stemRelationCount: stemRelations.length,
    tone: toneOf(supportiveCount, challengingCount),
  });

  return Object.freeze({
    engine: "synastry" as const,
    tier: "cultural" as const,
    version: 1 as const,
    pillars: PILLARS,
    branchRelations: Object.freeze(branchRelations),
    stemRelations: Object.freeze(stemRelations),
    dayMaster,
    summary,
    explanation: makeExplanation(summary, dayMaster),
  });
}

export { BRANCH_RELATION_LABELS, PILLARS, stemRelationLabel };
