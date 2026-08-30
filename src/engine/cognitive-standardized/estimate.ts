import type { EstimatedDomainAccuracy, EstimatedIqBand, EstimatedScore } from "./types";

const MIN_IQ = 40;
const MAX_IQ = 160;
const IQ_MEAN = 100;
const IQ_SD = 15;

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function clampIq(iq: number): number {
  return Math.max(MIN_IQ, Math.min(MAX_IQ, iq));
}

/** Abramowitz-Stegun 7.1.26 approximation — same formula used by eq/norms.ts and norming.ts. */
function standardNormalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const absolute = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - polynomial * Math.exp(-absolute * absolute);
  return 0.5 * (1 + sign * erf);
}

export interface EstimateFromThetaInput {
  readonly theta: number;
  readonly sem: number;
  readonly answeredCount: number;
  readonly domains: readonly EstimatedDomainAccuracy[];
}

/**
 * θ~N(0,1) 이론 분포 가정만으로 IQ 추정치를 만든다. 실측 규준 표본을 쓰지 않으므로
 * 항상 `basis: "theoretical-prior"`로 표시되고, 승인된 규준(`thetaToStandardizedScore`,
 * norming.ts)과는 별개 경로다.
 */
export function estimateFromTheta(input: EstimateFromThetaInput): EstimatedScore {
  finite(input.theta, "theta");
  finite(input.sem, "standard error");
  if (input.sem < 0) throw new Error("standard error cannot be negative");
  if (!Number.isInteger(input.answeredCount) || input.answeredCount < 0) throw new Error("answeredCount must be a non-negative integer");

  const theta = Math.max(-4, Math.min(4, input.theta));
  const fullScaleIq = clampIq(Math.round(IQ_MEAN + IQ_SD * theta));
  const percentile = Math.max(1, Math.min(99, Math.round(standardNormalCdf(theta) * 100)));
  const margin = Math.round(1.96 * input.sem * IQ_SD);

  return Object.freeze({
    fullScaleIq,
    percentile,
    confidenceInterval95: [clampIq(fullScaleIq - margin), clampIq(fullScaleIq + margin)] as const,
    sem: input.sem,
    basis: "theoretical-prior",
    answeredCount: input.answeredCount,
    domains: input.domains,
  });
}

/** 6단계 서술 밴드(70/85/115/130/145 컷). 승인 규준 트랙의 5밴드(standardizedIqBand)와는 별개다. */
export function estimatedIqBand(iq: number): EstimatedIqBand {
  finite(iq, "IQ");
  if (iq < 70) return "well_below_average";
  if (iq < 85) return "below_average";
  if (iq < 115) return "average";
  if (iq < 130) return "above_average";
  if (iq < 145) return "well_above_average";
  return "exceptionally_high";
}
