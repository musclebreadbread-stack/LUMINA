import type { MatrixCell, MatrixCellContent, MatrixFigure } from "@engine/cognitive/items";
import { CELL_SIZE, HatchPattern, MatrixGlyphs } from "./shapes";

/**
 * 행렬 추론 문항의 자극과 보기를 그리는 인라인 SVG.
 *
 * 같은 데이터가 들어오면 언제나 같은 SVG가 나온다 — 난수도, 시계도, 외부 에셋도 쓰지 않는다.
 * 색은 currentColor 하나뿐이라 감싼 쪽의 글자색을 그대로 따라가고, 굵기는 hairline 한 단계로 통일한다.
 *
 * "use client"를 붙이지 않은 것은 의도다(shapes.tsx 주석 참고).
 */

const GAP = 10;
const PAD = 4;
const BOARD = PAD * 2 + CELL_SIZE * 3 + GAP * 2;

function cellOrigin(index: number): readonly [number, number] {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return [PAD + column * (CELL_SIZE + GAP), PAD + row * (CELL_SIZE + GAP)];
}

/** 칸의 테두리. 값이 아니라 격자를 알리는 선이므로 가장 옅게 둔다. */
function CellFrame({ x, y, blank }: { readonly x: number; readonly y: number; readonly blank: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={CELL_SIZE}
      height={CELL_SIZE}
      fill="none"
      stroke="currentColor"
      strokeOpacity={blank ? 0.55 : 0.22}
      strokeWidth={1}
      strokeDasharray={blank ? "4 3" : undefined}
    />
  );
}

function GridCell({
  cell,
  index,
  hatchId,
}: {
  readonly cell: MatrixCell;
  readonly index: number;
  readonly hatchId: string;
}) {
  const [x, y] = cellOrigin(index);
  const centreX = x + CELL_SIZE / 2;
  const centreY = y + CELL_SIZE / 2;

  return (
    <g>
      <CellFrame x={x} y={y} blank={cell.kind === "blank"} />
      {cell.kind === "blank" ? (
        // 빠진 칸임을 점선만으로 알리면 인쇄나 저대비 화면에서 사라진다. 물음표를 함께 새긴다.
        <text
          className="font-mono"
          x={centreX}
          y={centreY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
          fill="currentColor"
          fillOpacity={0.5}
        >
          ?
        </text>
      ) : (
        <g transform={`translate(${centreX} ${centreY})`}>
          <MatrixGlyphs content={cell.content} hatchId={hatchId} />
        </g>
      )}
    </g>
  );
}

interface MatrixStimulusProps {
  readonly figure: MatrixFigure;
  /** 이 그림이 무엇을 묻는지 알리는 문장. **정답을 담지 않는다.** */
  readonly label: string;
  /** 한 화면에 SVG가 여럿 놓이므로 pattern id가 겹치지 않도록 받는 네임스페이스. */
  readonly idPrefix: string;
  /** 최대 표시 폭(px). 그 아래로는 폭에 맞춰 줄어든다. */
  readonly maxWidth?: number;
  readonly className?: string;
}

export function MatrixStimulus({ figure, label, idPrefix, maxWidth = 264, className }: MatrixStimulusProps) {
  const hatchId = `${idPrefix}-hatch`;

  return (
    <svg
      viewBox={`0 0 ${BOARD} ${BOARD}`}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      <defs>
        <HatchPattern id={hatchId} />
      </defs>
      {figure.cells.map((cell, index) => (
        <GridCell key={index} cell={cell} index={index} hatchId={hatchId} />
      ))}
    </svg>
  );
}

interface MatrixCellFigureProps {
  readonly content: MatrixCellContent;
  readonly label: string;
  readonly idPrefix: string;
  readonly maxWidth?: number;
  readonly className?: string;
}

/** 보기 하나. 자극의 한 칸과 같은 좌표계로 그려야 크기 비교가 성립한다. */
export function MatrixCellFigure({
  content,
  label,
  idPrefix,
  maxWidth = 78,
  className,
}: MatrixCellFigureProps) {
  const hatchId = `${idPrefix}-hatch`;
  const box = CELL_SIZE + PAD * 2;

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      <defs>
        <HatchPattern id={hatchId} />
      </defs>
      <g transform={`translate(${box / 2} ${box / 2})`}>
        <MatrixGlyphs content={content} hatchId={hatchId} />
      </g>
    </svg>
  );
}
