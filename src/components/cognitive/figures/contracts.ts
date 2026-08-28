import type { CognitiveStimulus, MatrixCell, Voxel } from "@engine/cognitive-standardized/types";

export interface MatrixBoardProps {
  readonly figure: Readonly<{ kind: "matrix"; cells: readonly MatrixCell[] }>;
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

export interface SpatialSolidProps {
  readonly cubes: readonly Voxel[];
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

export interface OptionFigureProps {
  readonly figure: CognitiveStimulus;
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}
