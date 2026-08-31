import type { Voxel } from "@engine/cognitive-standardized/types";

import type { SpatialSolidProps } from "./contracts";

const UNIT = 30;
const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;
const PADDING = 12;

const CUBE_FACES: readonly {
  readonly corners: readonly (readonly [number, number, number])[];
  readonly opacity: number;
}[] = Object.freeze([
  { corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], opacity: 0.78 },
  { corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], opacity: 0.58 },
  { corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], opacity: 0.44 },
]);

function project(x: number, y: number, z: number): readonly [number, number] {
  return [(x - y) * COS30 * UNIT, ((x + y) * SIN30 - z) * UNIT];
}

function pointString(voxel: Voxel, corners: readonly (readonly [number, number, number])[]): string {
  return corners
    .map(([dx, dy, dz]) => {
      const [x, y] = project(voxel.x + dx, voxel.y + dy, voxel.z + dz);
      return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
    })
    .join(" ");
}

function paintOrder(cubes: readonly Voxel[]): readonly Voxel[] {
  return [...cubes].sort(
    (left, right) =>
      left.x + left.y + left.z - (right.x + right.y + right.z) ||
      left.x - right.x ||
      left.y - right.y ||
      left.z - right.z,
  );
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

function boundsOf(cubes: readonly Voxel[]): Bounds {
  const corners: readonly (readonly [number, number, number])[] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  const points = cubes.flatMap((cube) => corners.map(([dx, dy, dz]) => project(cube.x + dx, cube.y + dy, cube.z + dz)));
  if (points.length === 0) return { minX: -UNIT, minY: -UNIT, width: UNIT * 2, height: UNIT * 2 };

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX: minX - PADDING,
    minY: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}

/** 고정 등각 투영으로 입체를 재작성한다. 색조 없이도 면·윤곽·깊이를 구분한다. */
export function SpatialSolid({ cubes, label, idPrefix, maxWidth = 320, className }: SpatialSolidProps) {
  const titleId = `${idPrefix}-title`;
  const bounds = boundsOf(cubes);

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label={label}
      aria-labelledby={titleId}
      className={className}
      shapeRendering="geometricPrecision"
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      <title id={titleId}>{label}</title>
      {paintOrder(cubes).map((cube) => (
        <g key={`${cube.x},${cube.y},${cube.z}`}>
          {CUBE_FACES.map((face, index) => (
            <polygon
              key={index}
              points={pointString(cube, face.corners)}
              fill="currentColor"
              fillOpacity={face.opacity}
              stroke="currentColor"
              strokeOpacity={1}
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
