import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MatrixBoard } from "../figures/MatrixBoard";
import { OptionFigure } from "../figures/OptionFigure";
import { SpatialSolid } from "../figures/SpatialSolid";

const matrixFixture = {
  kind: "matrix" as const,
  cells: [
    { kind: "figure" as const, shape: "circle" as const, fill: "solid" as const, rotationDegrees: 0 },
    { kind: "figure" as const, shape: "square" as const, fill: "hatch" as const, rotationDegrees: 45 },
    { kind: "blank" as const, shape: null, fill: null, rotationDegrees: null },
  ],
};

const matrixOptionFixture = {
  kind: "matrix" as const,
  cells: [
    { kind: "blank" as const, shape: null, fill: null, rotationDegrees: null },
    { kind: "figure" as const, shape: "arrow" as const, fill: "none" as const, rotationDegrees: 90 },
  ],
};

describe("standardized figure renderers", () => {
  it("renders a labelled high-contrast matrix with a non-colour pattern", () => {
    const markup = renderToStaticMarkup(
      <MatrixBoard figure={matrixFixture} label="3×3 도형 행렬, 빈칸 하나" idPrefix="matrix-test" />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="3×3 도형 행렬, 빈칸 하나"');
    expect(markup).toContain("<pattern");
    expect(markup).toContain("stroke-dasharray");
  });

  it("renders every cube with three visible isometric faces", () => {
    const markup = renderToStaticMarkup(
      <SpatialSolid
        cubes={[
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
        ]}
        label="두 정육면체 입체 보기"
        idPrefix="solid-test"
      />,
    );

    expect(markup).toContain('role="img"');
    expect(markup.match(/<polygon /g)).toHaveLength(6);
  });

  it("renders a matrix option as one figure cell without placeholder marks", () => {
    const markup = renderToStaticMarkup(
      <OptionFigure figure={matrixOptionFixture} label="matrix option" idPrefix="matrix-option-test" />,
    );

    expect(markup).toContain('viewBox="0 0 108 108"');
    expect(markup).toContain('transform="rotate(90)"');
    expect(markup.match(/<rect /g)).toHaveLength(1);
    expect(markup).not.toContain("?");
  });
});
