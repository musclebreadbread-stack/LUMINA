import {
  JUNGIAN_AXIS_EXPLANATIONS,
  axisExplanation,
  typeExplanation,
  mbtiTypeProfile,
  type TypeVariantProfile,
} from "@engine/psychometrics/jungianExplanations";
import {
  computeJungianLenses,
  jungianAxisConfig,
  type AxisScore,
  type JungianAxis,
  type JungianPole,
} from "@engine/psychometrics/jungian";
import { computeFactorScores, type ResponseMap } from "@engine/psychometrics/scoring";
import { computeAspectScores } from "@engine/psychometrics/aspects";
import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { assetPath } from "./assets";

export interface JungianAxisView extends AxisScore {
  readonly negativePole: string;
  readonly positivePole: string;
  readonly negativeLabel: LocalizedText;
  readonly positiveLabel: LocalizedText;
  readonly explanation: ExplanationBlock | null;
  readonly imageSrc: string;
}

export interface JungianView {
  readonly itemCount: number;
  readonly axes: readonly JungianAxisView[];
  readonly typeCode: string | null;
  readonly typeCertainty: number;
  readonly typeExplanation: ExplanationBlock | null;
  /** 유형별 콘텐츠(별명·키워드·요약·강점·관계·진로·성장). 경계 코드(?)일 때는 null. */
  readonly typeProfile: TypeVariantProfile | null;
  readonly typeImageSrc: string | null;
}

function labelsFor(axis: JungianAxis): {
  readonly negativePole: string;
  readonly positivePole: string;
  readonly negativeLabel: LocalizedText;
  readonly positiveLabel: LocalizedText;
} {
  const config = jungianAxisConfig(axis);
  const negative = JUNGIAN_AXIS_EXPLANATIONS.find((item) => item.axis === axis && item.pole === config.negativePole);
  const positive = JUNGIAN_AXIS_EXPLANATIONS.find((item) => item.axis === axis && item.pole === config.positivePole);
  if (!negative || !positive) throw new Error(`missing Jungian labels for ${axis}`);
  return {
    negativePole: config.negativePole,
    positivePole: config.positivePole,
    negativeLabel: negative.label,
    positiveLabel: positive.label,
  };
}

const DEFAULT_AXIS_POLES: Readonly<Record<JungianAxis, JungianPole>> = Object.freeze({
  EI: "I",
  SN: "S",
  TF: "T",
  JP: "J",
  AT: "T",
  VW: "W",
});

function axisImageName(axis: JungianAxis, pole: AxisScore["pole"]): string {
  const resolvedPole = pole ?? DEFAULT_AXIS_POLES[axis];
  return `${axis.toLowerCase()}-${resolvedPole.toLowerCase()}`;
}

/** The type illustration set only covers the 16 base preference codes — strip the "-AV"/"-AW"/"-TV"/"-TW" suffix. */
function baseCodeOf(fullCode: string): string {
  return fullCode.split("-")[0] ?? fullCode;
}

export function buildJungianView(responses: ResponseMap): JungianView {
  const factorScores = computeFactorScores(responses);
  const aspectScores = computeAspectScores(responses);
  const result = computeJungianLenses(factorScores, aspectScores);
  const axes = result.axes.map((axis) => {
    const labels = labelsFor(axis.axis);
    return Object.freeze({
      ...axis,
      ...labels,
      explanation: axis.pole ? axisExplanation(axis.axis, axis.pole) : null,
      imageSrc: assetPath("psychometrics/types/axes", axisImageName(axis.axis, axis.pole)),
    });
  });

  const complete = Boolean(result.typeCode && !result.typeCode.includes("?"));

  return Object.freeze({
    itemCount: 50,
    axes: Object.freeze(axes),
    typeCode: result.typeCode,
    typeCertainty: result.typeCertainty,
    typeExplanation: complete ? typeExplanation(result.typeCode!) : null,
    typeProfile: complete ? mbtiTypeProfile(result.typeCode!) : null,
    typeImageSrc: complete
      ? assetPath("psychometrics/types", baseCodeOf(result.typeCode!).toLowerCase())
      : null,
  });
}
