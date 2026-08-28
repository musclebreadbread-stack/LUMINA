import type { CognitiveStimulus } from "@engine/cognitive-standardized/types";

import { MatrixBoard } from "./MatrixBoard";
import { SpatialSolid } from "./SpatialSolid";
import type { OptionFigureProps } from "./contracts";

/** 연습·표준화 문항 모두에서 동일한 선언형 도형 자극을 사용한다. */
export function OptionFigure({ figure, label, idPrefix, maxWidth, className }: OptionFigureProps) {
  if (figure.kind === "matrix") {
    return <MatrixBoard figure={figure} label={label} idPrefix={idPrefix} maxWidth={maxWidth} className={className} />;
  }
  if (figure.kind === "spatial") {
    return <SpatialSolid cubes={figure.cubes} label={label} idPrefix={idPrefix} maxWidth={maxWidth} className={className} />;
  }
  return null;
}
