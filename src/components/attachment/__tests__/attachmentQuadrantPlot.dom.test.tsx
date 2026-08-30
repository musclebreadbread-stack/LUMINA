import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AttachmentQuadrantPlot } from "../AttachmentQuadrantPlot";

describe("AttachmentQuadrantPlot", () => {
  it("renders both exploratory axes, the classification boundary and the no-norm caveat", () => {
    const markup = renderToStaticMarkup(
      <AttachmentQuadrantPlot
        anxiety={4.1}
        avoidance={2.2}
        title="불안과 회피의 위치"
        description="두 축의 평균 위치입니다."
        scaleLabel="탐색용 1~5 평균 척도"
        boundaryLabel="탐색 분류 경계 3.5"
        selectedLabel="현재 위치"
        noNormLabel="한국인 규준·백분위 없음"
        anxietyLabel="불안"
        avoidanceLabel="회피"
        lowLabel="낮음"
        highLabel="높음"
        quadrantLabels={{ secure: "안정형", anxious: "불안형", avoidant: "회피형", fearful: "두려움형" }}
        classificationLabel="불안형"
      />,
    );

    expect(markup).toContain('data-testid="attachment-quadrant-plot"');
    expect(markup).toContain("3.5");
    expect(markup).toContain("불안");
    expect(markup).toContain("회피");
    expect(markup).toContain("한국인 규준·백분위 없음");
  });
});
