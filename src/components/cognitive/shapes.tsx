import type { ReactElement } from "react";
import type { MatrixCellContent, MatrixShape, MatrixSize } from "@engine/cognitive/items";

/**
 * 행렬 문항의 도형 원시체(primitive).
 *
 * ElementSpirit와 같은 규율로 그린다 — 외부 에셋 없이 손으로 쓴 인라인 SVG, 색은 currentColor
 * 하나만 쓰고 농도로만 층을 나눈다. 색을 직접 박지 않으므로 먹 바탕에서도, 밝은 인쇄면에서도
 * 감싼 쪽의 글자색을 그대로 따라간다.
 *
 * "use client"를 붙이지 않은 것은 의도다. 훅도 이벤트도 없는 순수 표현 컴포넌트라
 * 설문 폼(클라이언트)과 결과 복기 화면(서버) 양쪽에서 그대로 쓸 수 있어야 한다.
 */

/** 한 칸의 논리 크기. 모든 좌표가 이 정사각형 안에서 계산된다. */
export const CELL_SIZE = 64;

/** 칸 중심에서 도형 바깥까지의 기본 반지름. 크기 속성이 행렬 규칙의 일부인 문항(7번)이 있다. */
const SIZE_RADIUS: Readonly<Record<MatrixSize, number>> = Object.freeze({
  small: 14,
  medium: 20,
  large: 26,
});

/** [중심 x, 중심 y, 반지름 배율]. 개수가 늘면 자리와 크기를 함께 줄여 칸을 넘지 않게 한다. */
type Placement = readonly [number, number, number];

const PLACEMENTS: Readonly<Record<number, readonly Placement[]>> = Object.freeze({
  1: Object.freeze([[0, 0, 1] as Placement]),
  2: Object.freeze([
    [-12, 0, 0.52] as Placement,
    [12, 0, 0.52] as Placement,
  ]),
  3: Object.freeze([
    [0, -12, 0.48] as Placement,
    [-12, 10, 0.48] as Placement,
    [12, 10, 0.48] as Placement,
  ]),
  4: Object.freeze([
    [-12, -12, 0.46] as Placement,
    [12, -12, 0.46] as Placement,
    [-12, 12, 0.46] as Placement,
    [12, 12, 0.46] as Placement,
  ]),
});

function placementsFor(count: number): readonly Placement[] {
  const clamped = Math.min(4, Math.max(1, Math.round(count)));
  return PLACEMENTS[clamped] ?? PLACEMENTS[1]!;
}

function polygon(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
}

/** 좌표를 소수점 둘째 자리로 접는다 — 같은 데이터면 같은 문자열이 나와야 한다. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function regularPolygon(sides: number, radius: number, startDegrees: number): string {
  return polygon(
    Array.from({ length: sides }, (_, index) => {
      const angle = ((startDegrees + (index * 360) / sides) * Math.PI) / 180;
      return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
    }),
  );
}

function starPoints(radius: number): string {
  return polygon(
    Array.from({ length: 10 }, (_, index) => {
      const reach = index % 2 === 0 ? radius : radius * 0.42;
      const angle = ((-90 + index * 36) * Math.PI) / 180;
      return [reach * Math.cos(angle), reach * Math.sin(angle)] as const;
    }),
  );
}

function crossPoints(radius: number): string {
  const arm = radius * 0.34;
  return polygon([
    [-arm, -radius],
    [arm, -radius],
    [arm, -arm],
    [radius, -arm],
    [radius, arm],
    [arm, arm],
    [arm, radius],
    [-arm, radius],
    [-arm, arm],
    [-radius, arm],
    [-radius, -arm],
    [-arm, -arm],
  ]);
}

/** 0도에서 위를 가리킨다. 회전이 규칙인 문항(6번)에서 방향이 한눈에 보여야 하므로 촉이 넓다. */
function arrowPoints(radius: number): string {
  return polygon([
    [0, -radius],
    [radius * 0.66, -radius * 0.12],
    [radius * 0.27, -radius * 0.12],
    [radius * 0.27, radius],
    [-radius * 0.27, radius],
    [-radius * 0.27, -radius * 0.12],
    [-radius * 0.66, -radius * 0.12],
  ]);
}

function shapeElement(
  shape: MatrixShape,
  radius: number,
  fillValue: string,
  fillOpacity: number,
  strokeWidth: number,
): ReactElement {
  const common = {
    fill: fillValue,
    fillOpacity,
    stroke: "currentColor",
    strokeWidth,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (shape) {
    case "circle":
      return <circle cx={0} cy={0} r={round(radius)} {...common} />;
    case "square": {
      const half = round(radius * 0.82);
      return <rect x={-half} y={-half} width={half * 2} height={half * 2} {...common} />;
    }
    case "triangle":
      return <polygon points={regularPolygon(3, radius, -90)} {...common} />;
    case "diamond":
      return <polygon points={regularPolygon(4, radius, -90)} {...common} />;
    case "hexagon":
      return <polygon points={regularPolygon(6, radius, -90)} {...common} />;
    case "star":
      return <polygon points={starPoints(radius)} {...common} />;
    case "cross":
      return <polygon points={crossPoints(radius)} {...common} />;
    case "arrow":
      return <polygon points={arrowPoints(radius)} {...common} />;
  }
}

/**
 * 빗금 채움. 같은 화면에 SVG가 여럿 놓이므로 id는 호출자가 준 네임스페이스를 받아 쓴다.
 * pattern 안의 currentColor는 조상에서 상속된 색을 그대로 따르므로 별도 색 지정이 필요 없다.
 */
export function HatchPattern({ id }: { readonly id: string }) {
  return (
    <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={6} stroke="currentColor" strokeOpacity={0.95} strokeWidth={2.2} />
    </pattern>
  );
}

interface MatrixGlyphsProps {
  readonly content: MatrixCellContent;
  /** HatchPattern에 넘긴 것과 같은 id. 빗금 채움이 아니면 쓰이지 않는다. */
  readonly hatchId: string;
  readonly strokeWidth?: number;
}

/**
 * 칸 하나의 내용. 회전은 칸 전체가 아니라 **도형 하나하나**에 걸린다 —
 * 6번 문항의 규칙이 "화살표가 돈다"이지 "칸이 돈다"가 아니기 때문이다.
 * 좌표계 원점은 칸의 중심이며, 호출자가 translate로 자리를 잡아 준다.
 */
export function MatrixGlyphs({ content, hatchId, strokeWidth = 2.4 }: MatrixGlyphsProps) {
  const baseRadius = SIZE_RADIUS[content.size];
  const fillValue =
    content.fill === "none" ? "none" : content.fill === "hatch" ? `url(#${hatchId})` : "currentColor";
  const fillOpacity = content.fill === "solid" ? 0.9 : 1;

  return (
    <g>
      {placementsFor(content.count).map(([dx, dy, scale], index) => (
        <g key={index} transform={`translate(${dx} ${dy}) rotate(${content.rotationDegrees})`}>
          {shapeElement(content.shape, baseRadius * scale, fillValue, fillOpacity, strokeWidth)}
        </g>
      ))}
    </g>
  );
}
