import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PilotResult } from "../PilotResult";

const ESTIMATED_RESULT = {
  status: "estimated_scored" as const,
  score: {
    fullScaleIq: 108,
    percentile: 70,
    confidenceInterval95: [95, 121] as const,
    sem: 0.3,
    basis: "theoretical-prior" as const,
    answeredCount: 20,
    domains: [],
  },
};

describe("PilotResult", () => {
  it("shows the labelled theoretical estimate when no approved norm exists", () => {
    const markup = renderToStaticMarkup(
      <PilotResult result={ESTIMATED_RESULT} locale="en" imageAlt="Cognitive result illustration" />,
    );

    expect(markup).toContain("Estimated result");
    expect(markup).toContain("theoretical-distribution estimate");
    expect(markup).toContain("95% confidence interval 95–121");
    expect(markup).toContain("not derived from an actual Korean adult norm sample");
    expect(markup).not.toContain("Pilot participation recorded");
  });

  it("keeps the participation record when a run cannot be scored", () => {
    const markup = renderToStaticMarkup(
      <PilotResult
        result={{ status: "pilot_withheld", score: null }}
        locale="en"
        imageAlt="Cognitive result illustration"
      />,
    );

    expect(markup).toContain("Pilot participation recorded");
    expect(markup).toContain("IQ, percentile, sub-scores, item answers and explanations are withheld during the pilot.");
    expect(markup).not.toContain("theoretical-distribution estimate");
  });
});
