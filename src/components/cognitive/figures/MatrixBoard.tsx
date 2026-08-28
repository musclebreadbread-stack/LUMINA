import type { MatrixCell } from "@engine/cognitive-standardized/types";

import type { MatrixBoardProps } from "./contracts";

const BOARD_SIZE = 300;
const CELL_SIZE = 88;
const CELL_GAP = 12;
const PADDING = 10;
const PATTERN_SIZE = 8;

function cellOrigin(index: number): readonly [number, number] {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return [PADDING + column * (CELL_SIZE + CELL_GAP), PADDING + row * (CELL_SIZE + CELL_GAP)];
}

function polygon(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function shapePoints(shape: Exclude<MatrixCell["shape"], "circle" | "square" | null>): string {
  switch (shape) {
    case "triangle":
      return polygon([
        [0, -28],
        [26, 22],
        [-26, 22],
      ]);
    case "diamond":
      return polygon([
        [0, -30],
        [28, 0],
        [0, 30],
        [-28, 0],
      ]);
    case "arrow":
      return polygon([
        [0, -32],
        [26, -4],
        [10, -4],
        [10, 30],
        [-10, 30],
        [-10, -4],
        [-26, -4],
      ]);
  }
}

function FigureGlyph({ cell, hatchId }: { readonly cell: MatrixCell; readonly hatchId: string }) {
  if (cell.kind === "blank" || cell.shape === null) return null;

  const fill =
    cell.fill === "none"
      ? "none"
      : cell.fill === "hatch"
        ? `url(#${hatchId})`
        : "currentColor";
  const common = {
    fill,
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
  };

  return (
    <g transform={`rotate(${cell.rotationDegrees ?? 0})`}>
      {cell.shape === "circle" ? (
        <circle cx={0} cy={0} r={27} {...common} />
      ) : cell.shape === "square" ? (
        <rect x={-25} y={-25} width={50} height={50} {...common} />
      ) : (
        <polygon points={shapePoints(cell.shape)} {...common} />
      )}
    </g>
  );
}

function MatrixCellView({ cell, index, hatchId }: { readonly cell: MatrixCell; readonly index: number; readonly hatchId: string }) {
  const [x, y] = cellOrigin(index);
  const center = CELL_SIZE / 2;
  const isBlank = cell.kind === "blank";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={CELL_SIZE}
        height={CELL_SIZE}
        fill="none"
        stroke="currentColor"
        strokeOpacity={isBlank ? 0.8 : 0.3}
        strokeWidth={2}
        strokeDasharray={isBlank ? "8 6" : undefined}
      />
      {isBlank ? (
        <text
          x={x + center}
          y={y + center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize={32}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          ?
        </text>
      ) : (
        <g transform={`translate(${x + center} ${y + center})`}>
          <FigureGlyph cell={cell} hatchId={hatchId} />
        </g>
      )}
    </g>
  );
}

/** 색상에 의존하지 않는 3×3 도형 행렬 SVG. 서버 컴포넌트에서 바로 렌더링할 수 있다. */
export function MatrixBoard({ figure, label, idPrefix, maxWidth = 320, className }: MatrixBoardProps) {
  const titleId = `${idPrefix}-title`;
  const hatchId = `${idPrefix}-hatch`;

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      role="img"
      aria-label={label}
      aria-labelledby={titleId}
      className={className}
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      <title id={titleId}>{label}</title>
      <defs>
        <pattern id={hatchId} width={PATTERN_SIZE} height={PATTERN_SIZE} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={PATTERN_SIZE} stroke="currentColor" strokeWidth={2} />
        </pattern>
      </defs>
      {figure.cells.slice(0, 9).map((cell, index) => (
        <MatrixCellView key={index} cell={cell} index={index} hatchId={hatchId} />
      ))}
    </svg>
  );
}
