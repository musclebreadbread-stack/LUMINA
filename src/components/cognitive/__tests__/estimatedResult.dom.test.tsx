import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EstimatedResult } from "../EstimatedResult";

const SCORE = {
  fullScaleIq: 108,
  percentile: 70,
  confidenceInterval95: [95, 121] as const,
  sem: 0.3,
  basis: "theoretical-prior" as const,
  answeredCount: 20,
  domains: [
    { domain: "gf" as const, correctCount: 3, itemCount: 4 },
    { domain: "gc" as const, correctCount: 2, itemCount: 4 },
    { domain: "gv" as const, correctCount: 4, itemCount: 4 },
    { domain: "gwm" as const, correctCount: 1, itemCount: 4 },
    { domain: "gs" as const, correctCount: 2, itemCount: 4 },
  ],
};

describe("EstimatedResult", () => {
  it("renders the IQ estimate alongside its theoretical-estimate label, CI, band, and domain rows", () => {
    const markup = renderToStaticMarkup(<EstimatedResult score={SCORE} locale="ko" imageAlt="인지능력 결과 삽화" />);
    expect(markup).toContain("108");
    expect(markup).toContain("이론 분포 기반 추정치");
    expect(markup).toContain("95% 신뢰구간");
    expect(markup).toContain("평균에 가까운 범위");
    expect(markup).toContain("임상 진단");
    expect(markup).toContain("3 / 4");
    expect(markup).not.toContain("correctOptionId");
    expect(markup).not.toContain('"theta"');
  });

  it("never renders the bare IQ number without the theoretical-estimate label next to it", () => {
    const markup = renderToStaticMarkup(<EstimatedResult score={SCORE} locale="en" imageAlt="Cognitive result illustration" />);
    expect(markup).toContain("theoretical-distribution estimate");
    expect(markup).toContain("not a clinical diagnosis");
  });

  it("labels the percentile as theoretical, not a rank within a real population", () => {
    const en = renderToStaticMarkup(<EstimatedResult score={SCORE} locale="en" imageAlt="Cognitive result illustration" />);
    expect(en).toContain("Percentile 70 on the theoretical distribution (not a rank in a real population)");
    const ko = renderToStaticMarkup(<EstimatedResult score={SCORE} locale="ko" imageAlt="인지능력 결과 삽화" />);
    expect(ko).toContain("이론 분포 기준 백분위 70 (실제 집단 안의 순위가 아님)");
  });

  it("classifies an exceptionally high score into the top band", () => {
    const highScore = { ...SCORE, fullScaleIq: 148, confidenceInterval95: [135, 160] as const };
    const markup = renderToStaticMarkup(<EstimatedResult score={highScore} locale="ko" imageAlt="인지능력 결과 삽화" />);
    expect(markup).toContain("매우 드물게 높은 범위");
  });
});
