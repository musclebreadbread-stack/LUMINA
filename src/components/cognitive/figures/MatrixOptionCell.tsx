import type { MatrixCell } from "@engine/cognitive-standardized/types";

import { CELL_SIZE, FigureGlyph, HatchPattern, PADDING } from "./MatrixBoard";
import type { MatrixBoardProps } from "./contracts";

const OPTION_SIZE = CELL_SIZE + PADDING * 2;

interface MatrixOptionCellProps {
  readonly figure: MatrixBoardProps["figure"];
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

function firstFigureCell(cells: readonly MatrixCell[]): MatrixCell | null {
  return cells.find((cell) => cell.kind === "figure" && cell.shape !== null) ?? null;
}

/** 표준화 선택지의 단일 도형을 3×3 행렬 없이 렌더링한다. */
export function MatrixOptionCell({ figure, label, idPrefix, maxWidth = OPTION_SIZE, className }: MatrixOptionCellProps) {
  const titleId = `${idPrefix}-title`;
  const hatchId = `${idPrefix}-hatch`;
  const cell = firstFigureCell(figure.cells);
  const center = OPTION_SIZE / 2;

  return (
    <svg
      viewBox={`0 0 ${OPTION_SIZE} ${OPTION_SIZE}`}
      role="img"
      aria-label={label}
      aria-labelledby={titleId}
      className={className}
      shapeRendering="geometricPrecision"
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      <title id={titleId}>{label}</title>
      <defs>
        <HatchPattern id={hatchId} />
      </defs>
      <rect
        x={PADDING}
        y={PADDING}
        width={CELL_SIZE}
        height={CELL_SIZE}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.64}
        strokeWidth={2.4}
        vectorEffect="non-scaling-stroke"
      />
      {cell !== null && (
        <g transform={`translate(${center} ${center})`}>
          <FigureGlyph cell={cell} hatchId={hatchId} />
        </g>
      )}
    </svg>
  );
}
