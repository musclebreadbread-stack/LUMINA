import {
  scoreECR,
  type AttachmentResponse,
  type AxisScore,
} from "@engine/attachment/scoring";
import {
  classifyQuadrant,
  type QuadrantClassification,
} from "@engine/attachment/quadrants";
import { getPercentile } from "@engine/attachment/norms";

export interface AttachmentView {
  readonly anxiety: AxisView;
  readonly avoidance: AxisView;
  readonly classification: QuadrantClassification;
}

export interface AxisView extends AxisScore {
  readonly percentile: number;
  readonly labelKo: string;
  readonly labelEn: string;
}

const AXIS_LABELS = {
  anxiety: { ko: "불안", en: "Anxiety" },
  avoidance: { ko: "회피", en: "Avoidance" },
} as const;

export function buildAttachmentView(responses: AttachmentResponse): AttachmentView {
  const scores = scoreECR(responses);

  const anxietyPercentile = getPercentile("anxiety", scores.anxiety.mean);
  const avoidancePercentile = getPercentile("avoidance", scores.avoidance.mean);

  const classification = classifyQuadrant(scores.anxiety, scores.avoidance);

  return {
    anxiety: {
      ...scores.anxiety,
      percentile: anxietyPercentile,
      labelKo: AXIS_LABELS.anxiety.ko,
      labelEn: AXIS_LABELS.anxiety.en,
    },
    avoidance: {
      ...scores.avoidance,
      percentile: avoidancePercentile,
      labelKo: AXIS_LABELS.avoidance.ko,
      labelEn: AXIS_LABELS.avoidance.en,
    },
    classification,
  };
}
