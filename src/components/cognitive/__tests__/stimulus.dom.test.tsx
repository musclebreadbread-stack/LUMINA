import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveVoxels } from "@engine/cognitive/figures";
import { ITEMS, type MatrixItem, type RotationItem } from "@engine/cognitive/items";
import { MatrixStimulus } from "../MatrixStimulus";
import { RotationStimulus } from "../RotationStimulus";

/**
 * 자극 렌더러의 계약은 하나다 — 같은 데이터면 언제나 같은 그림이 나온다.
 * 그림 자체의 "예쁨"은 테스트할 수 없지만, 문항이 성립하려면 반드시 참이어야 하는
 * 구조적 사실(빈칸은 정확히 하나, 정육면체 수만큼 면이 그려진다)은 여기서 못 박아 둔다.
 */

const MATRIX_ITEMS = ITEMS.filter((item): item is MatrixItem => item.domain === "matrixReasoning");
const ROTATION_ITEMS = ITEMS.filter(
  (item): item is RotationItem => item.domain === "threeDimensionalRotation",
);

describe("matrix stimulus renderer", () => {
  it.each(MATRIX_ITEMS.map((item) => [item.id, item] as const))(
    "draws item %i identically on every render",
    (_id, item) => {
      const once = renderToStaticMarkup(
        <MatrixStimulus figure={item.stimulus} label="task" idPrefix="t" />,
      );
      const twice = renderToStaticMarkup(
        <MatrixStimulus figure={item.stimulus} label="task" idPrefix="t" />,
      );
      expect(once).toBe(twice);
    },
  );

  it.each(MATRIX_ITEMS.map((item) => [item.id, item] as const))(
    "marks exactly one blank cell in item %i",
    (_id, item) => {
      const markup = renderToStaticMarkup(
        <MatrixStimulus figure={item.stimulus} label="task" idPrefix="t" />,
      );
      expect(markup.match(/\?<\/text>/g)).toHaveLength(1);
      expect(markup.match(/stroke-dasharray="4 3"/g)).toHaveLength(1);
      expect(markup).toContain('role="img"');
      expect(markup).toContain('aria-label="task"');
    },
  );

  it("never leaks the answer into the text alternative", () => {
    const markup = renderToStaticMarkup(
      <MatrixStimulus figure={MATRIX_ITEMS[0]!.stimulus} label="task" idPrefix="t" />,
    );
    expect(markup).not.toContain("correct");
  });
});

describe("rotation stimulus renderer", () => {
  it.each(ROTATION_ITEMS.map((item) => [item.id, item] as const))(
    "draws item %i identically on every render",
    (_id, item) => {
      const once = renderToStaticMarkup(<RotationStimulus figure={item.stimulus} label="task" />);
      const twice = renderToStaticMarkup(<RotationStimulus figure={item.stimulus} label="task" />);
      expect(once).toBe(twice);
    },
  );

  it.each(ROTATION_ITEMS.map((item) => [item.id, item] as const))(
    "draws three visible faces per cube for item %i",
    (_id, item) => {
      const markup = renderToStaticMarkup(<RotationStimulus figure={item.stimulus} label="task" />);
      const cubeCount = resolveVoxels(item.stimulus.voxels, item.stimulus.rotation).length;
      expect(markup.match(/<polygon /g)).toHaveLength(cubeCount * 3);
      expect(markup).toContain('role="img"');
    },
  );

  it("projects the rotation the engine resolves, not the raw voxels", () => {
    const item = ROTATION_ITEMS.find((candidate) => candidate.stimulus.rotation.xDegrees !== 0);
    expect(item).toBeDefined();
    const rotated = renderToStaticMarkup(<RotationStimulus figure={item!.stimulus} label="task" />);
    const unrotated = renderToStaticMarkup(
      <RotationStimulus
        figure={{ ...item!.stimulus, rotation: { xDegrees: 0, yDegrees: 0, zDegrees: 0 } }}
        label="task"
      />,
    );
    expect(rotated).not.toBe(unrotated);
  });
});
