import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScientificScorePlot, type ScientificScorePlotLabels } from "../ScientificScorePlot";

const labels: ScientificScorePlotLabels = {
  observed: "관측값",
  interval: "95% 구간",
  reference: "참고 평균 ± 1 SD",
  noReference: "규준 없음",
  range: "범위",
  low: "낮음",
  high: "높음",
  table: "표로 보기",
  value: "값",
  percentile: "백분위",
  tScore: "T점수",
  sample: "표본",
};

describe("ScientificScorePlot", () => {
  it("keeps the interval visible and states when a reference norm is unavailable", () => {
    const markup = renderToStaticMarkup(
      <ScientificScorePlot
        title="요인 점수"
        description="척도 안에서 읽습니다."
        labels={labels}
        points={[
          {
            key: "with-norm",
            label: "규준 있음",
            value: 34,
            minimum: 10,
            maximum: 50,
            interval: [30, 38],
            reference: { mean: 30, standardDeviation: 5, percentile: 70, tScore: 55, sampleSize: 1000 },
          },
          {
            key: "without-norm",
            label: "규준 없음",
            value: 3.4,
            minimum: 1,
            maximum: 5,
            interval: [3, 3.8],
          },
        ]}
      />,
    );

    expect(markup).toContain('data-testid="scientific-score-plot"');
    expect(markup).toContain("95% 구간");
    expect(markup).toContain("규준 없음");
    expect(markup).toContain("<table");
    expect(markup).toContain("참고 평균 ± 1 SD");
  });
});
