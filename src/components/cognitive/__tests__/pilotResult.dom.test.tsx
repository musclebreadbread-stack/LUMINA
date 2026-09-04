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
  it("withholds an unapproved theoretical estimate from the public result", () => {
    const markup = renderToStaticMarkup(
      <PilotResult result={ESTIMATED_RESULT} locale="en" imageAlt="Cognitive result illustration" />,
    );

    expect(markup).toContain("Pilot participation recorded");
    expect(markup).toContain("IQ, percentile, sub-scores, item answers and explanations are withheld during the pilot.");
    expect(markup).not.toMatch(/>108</);
    expect(markup).not.toContain("Percentile 70");
  });
});
