import { resolveVoxels, type Voxel } from "@engine/cognitive/figures";
import type { PolycubeFigure } from "@engine/cognitive/items";

/**
 * 3차원 회전 문항의 폴리큐브를 등각(isometric) 투영으로 그린다.
 *
 * 등각 투영은 Shepard & Metzler(1971) 이래 이 문항 형식의 관습적 제시 방식이다.
 * 원근을 주면 같은 도형이 자세에 따라 다른 크기로 보여 "같은 도형인가"라는 물음이 흐려진다.
 *
 * 좌표는 반드시 resolveVoxels로 얻는다 — 회전 적용과 원점 정규화가 엔진에 있어야
 * 화면에 보이는 도형과 정답 검증 테스트가 보는 도형이 같은 것임이 보장된다.
 *
 * "use client"를 붙이지 않은 것은 의도다(shapes.tsx 주석 참고).
 */

/** 정육면체 한 변의 화면 길이. viewBox가 내용에 맞춰 잘리므로 절대 크기는 중요하지 않다. */
const UNIT = 28;
const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;
const PAD = 8;

function project(x: number, y: number, z: number): readonly [number, number] {
  // z가 클수록 화면에서 위로 간다(SVG의 y는 아래로 자라므로 빼 준다).
  return [(x - y) * COS30 * UNIT, ((x + y) * SIN30 - z) * UNIT];
}

const CUBE_CORNERS: readonly (readonly [number, number, number])[] = Object.freeze([
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
]);

/**
 * 이 투영에서 보이는 면은 셋뿐이다(윗면, +x면, +y면). 농도만으로 세 면을 갈라
 * 색 없이도 입체가 읽히게 한다 — 화면 규율상 색은 오행에만 쓴다.
 */
const FACES: readonly {
  readonly corners: readonly (readonly [number, number, number])[];
  readonly opacity: number;
}[] = Object.freeze([
  { corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], opacity: 0.78 },
  { corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], opacity: 0.58 },
  { corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], opacity: 0.44 },
]);

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function facePoints(voxel: Voxel, corners: readonly (readonly [number, number, number])[]): string {
  return corners
    .map(([dx, dy, dz]) => {
      const [x, y] = project(voxel.x + dx, voxel.y + dy, voxel.z + dz);
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

/** 화가 알고리즘: 시선축이 (1,1,1)이므로 x+y+z가 큰 정육면체일수록 앞에 있다. 뒤에서부터 칠한다. */
function paintOrder(voxels: readonly Voxel[]): readonly Voxel[] {
  return [...voxels].sort(
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

function boundsOf(voxels: readonly Voxel[]): Bounds {
  const points = voxels.flatMap((voxel) =>
    CUBE_CORNERS.map(([dx, dy, dz]) => project(voxel.x + dx, voxel.y + dy, voxel.z + dz)),
  );
  if (points.length === 0) return { minX: 0, minY: 0, width: UNIT, height: UNIT };

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    minX: round(minX - PAD),
    minY: round(minY - PAD),
    width: round(Math.max(...xs) - minX + PAD * 2),
    height: round(Math.max(...ys) - minY + PAD * 2),
  };
}

interface RotationStimulusProps {
  readonly figure: PolycubeFigure;
  /** 이 그림이 무엇을 묻는지 알리는 문장. **정답을 담지 않는다.** */
  readonly label: string;
  /** 최대 표시 폭(px). 그 아래로는 폭에 맞춰 줄어든다. */
  readonly maxWidth?: number;
  readonly className?: string;
}

export function RotationStimulus({ figure, label, maxWidth = 288, className }: RotationStimulusProps) {
  const voxels = resolveVoxels(figure.voxels, figure.rotation);
  const bounds = boundsOf(voxels);

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label={label}
      className={className}
      shapeRendering="geometricPrecision"
      style={{ width: "100%", maxWidth, height: "auto" }}
    >
      {paintOrder(voxels).map((voxel) => (
        <g key={`${voxel.x},${voxel.y},${voxel.z}`}>
          {FACES.map((face, faceIndex) => (
            <polygon
              key={faceIndex}
              points={facePoints(voxel, face.corners)}
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
