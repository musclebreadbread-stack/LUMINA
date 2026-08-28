import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StandardizedResult } from "../StandardizedResult";

describe("StandardizedResult", () => {
  it("renders score, interval and non-clinical limitation without item data", () => {
    const markup = renderToStaticMarkup(
      <StandardizedResult
        locale="ko"
        score={{ fullScaleIq: 108, percentile: 70, confidenceInterval95: [101, 115], normVersion: "ko-adult-v1" }}
      />,
    );
    expect(markup).toContain("108");
    expect(markup).toContain("평균에 가까운 점수 범위");
    expect(markup).toContain("95% 신뢰구간");
    expect(markup).toContain("임상 진단");
    expect(markup).not.toContain("correctOptionId");
    expect(markup).not.toContain("theta");
  });
});
