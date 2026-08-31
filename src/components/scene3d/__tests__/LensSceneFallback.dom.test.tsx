import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LensSceneFallback } from "../LensSceneFallback";

describe("LensSceneFallback", () => {
  it("renders a visible CSS scene for every preset without WebGL", () => {
    for (const preset of ["result", "relationship", "evidence"] as const) {
      const markup = renderToStaticMarkup(<LensSceneFallback preset={preset} />);

      expect(markup).toContain(`lens-orbit-fallback-${preset}`);
      expect(markup).toContain("lens-orbit-fallback-ring-a");
      expect(markup).toContain("lens-orbit-fallback-ring-b");
      expect(markup).toContain("lens-orbit-fallback-ring-c");
      expect(markup).toContain("lens-orbit-fallback-core");
    }
  });
});
