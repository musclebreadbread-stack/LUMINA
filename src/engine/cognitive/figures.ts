/**
 * 3차원 회전 문항이 쓰는 폴리큐브(단위 정육면체 묶음) 도형의 순수 기하 유틸.
 *
 * 왜 엔진에 두는가: 회전 문항의 "정답"은 문항 작성자의 주장이 아니라 데이터로 검증돼야 한다.
 * 같은 함수로 (1) 렌더러가 도형을 그리고 (2) 무결성 테스트가 정답 보기가 실제로 자극과
 * 회전 합동인지, 오답 보기가 실제로 합동이 아닌지를 확인한다.
 * 사람이 눈으로 확인한 정답 키는 조용히 틀릴 수 있지만, 이 함수를 통과한 키는 틀릴 수 없다.
 *
 * 회전은 90도 단위만 허용한다. 임의 각도를 허용하면 정답 판정이 부동소수 오차에 걸린다.
 */

/** 오른손 좌표계의 정수 격자 위 단위 정육면체 하나. */
export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 90도 단위 회전각. */
export type QuarterTurn = 0 | 90 | 180 | 270;

/** X축 → Y축 → Z축 순서로 적용되는 회전. 순서를 바꾸면 다른 자세가 나오므로 고정한다. */
export interface Rotation {
  readonly xDegrees: QuarterTurn;
  readonly yDegrees: QuarterTurn;
  readonly zDegrees: QuarterTurn;
}

export const QUARTER_TURNS: readonly QuarterTurn[] = Object.freeze([0, 90, 180, 270]);

export const NO_ROTATION: Rotation = Object.freeze({ xDegrees: 0, yDegrees: 0, zDegrees: 0 });

function rotateAboutX(voxel: Voxel): Voxel {
  return { x: voxel.x, y: -voxel.z, z: voxel.y };
}

function rotateAboutY(voxel: Voxel): Voxel {
  return { x: voxel.z, y: voxel.y, z: -voxel.x };
}

function rotateAboutZ(voxel: Voxel): Voxel {
  return { x: -voxel.y, y: voxel.x, z: voxel.z };
}

function applyQuarterTurns(
  voxels: readonly Voxel[],
  degrees: QuarterTurn,
  turn: (voxel: Voxel) => Voxel,
): readonly Voxel[] {
  const times = degrees / 90;
  let current = voxels;
  for (let step = 0; step < times; step += 1) {
    current = current.map(turn);
  }
  return current;
}

/** X→Y→Z 순서로 회전만 적용한다. 원점 정규화는 하지 않는다. */
export function rotateVoxels(voxels: readonly Voxel[], rotation: Rotation): readonly Voxel[] {
  const afterX = applyQuarterTurns(voxels, rotation.xDegrees, rotateAboutX);
  const afterY = applyQuarterTurns(afterX, rotation.yDegrees, rotateAboutY);
  return applyQuarterTurns(afterY, rotation.zDegrees, rotateAboutZ);
}

/** 최소 모서리를 원점으로 옮기고 정렬한다. 같은 도형이면 항상 같은 배열이 나오는 표준형. */
export function normalizeVoxels(voxels: readonly Voxel[]): readonly Voxel[] {
  if (voxels.length === 0) return Object.freeze([]);
  const minX = Math.min(...voxels.map((voxel) => voxel.x));
  const minY = Math.min(...voxels.map((voxel) => voxel.y));
  const minZ = Math.min(...voxels.map((voxel) => voxel.z));

  return Object.freeze(
    voxels
      .map((voxel) =>
        Object.freeze({ x: voxel.x - minX, y: voxel.y - minY, z: voxel.z - minZ }),
      )
      .sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z),
  );
}

/** 렌더러가 실제로 그려야 하는 좌표. 회전을 적용하고 원점으로 정규화한 결과다. */
export function resolveVoxels(voxels: readonly Voxel[], rotation: Rotation): readonly Voxel[] {
  return normalizeVoxels(rotateVoxels(voxels, rotation));
}

/** 표준형 배열을 문자열 하나로 접는다. 집합 비교용 키. */
export function voxelsKey(voxels: readonly Voxel[]): string {
  return normalizeVoxels(voxels)
    .map((voxel) => `${voxel.x},${voxel.y},${voxel.z}`)
    .join("|");
}

/**
 * 도형이 가질 수 있는 자세 전부. 세 축 90도 회전의 64가지 조합을 표준형으로 접어 중복을 없앤다.
 * 대칭이 없는 도형이면 24개, 대칭축이 있으면 그보다 적게 남는다 — 개수를 상수로 박지 않고 계산한다.
 */
export function allOrientationKeys(voxels: readonly Voxel[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const xDegrees of QUARTER_TURNS) {
    for (const yDegrees of QUARTER_TURNS) {
      for (const zDegrees of QUARTER_TURNS) {
        keys.add(voxelsKey(rotateVoxels(voxels, { xDegrees, yDegrees, zDegrees })));
      }
    }
  }
  return keys;
}

/**
 * 두 도형이 회전만으로 겹치는가. 거울상은 false다 —
 * 거울상 오답 보기가 성립하려면 이 함수가 거울상을 확실히 걸러야 한다.
 */
export function areRotationEquivalent(
  left: readonly Voxel[],
  right: readonly Voxel[],
): boolean {
  if (left.length !== right.length) return false;
  return allOrientationKeys(left).has(voxelsKey(right));
}

/** 모든 정육면체가 면끼리 이어져 하나의 덩어리인가. 끊긴 도형은 문항 자극으로 쓸 수 없다. */
export function isConnected(voxels: readonly Voxel[]): boolean {
  const first = voxels[0];
  if (!first) return false;

  const remaining = new Map<string, Voxel>(
    voxels.map((voxel) => [`${voxel.x},${voxel.y},${voxel.z}`, voxel]),
  );
  const queue: Voxel[] = [first];
  remaining.delete(`${first.x},${first.y},${first.z}`);

  while (queue.length > 0) {
    const current = queue.pop()!;
    const neighbours: readonly Voxel[] = [
      { x: current.x + 1, y: current.y, z: current.z },
      { x: current.x - 1, y: current.y, z: current.z },
      { x: current.x, y: current.y + 1, z: current.z },
      { x: current.x, y: current.y - 1, z: current.z },
      { x: current.x, y: current.y, z: current.z + 1 },
      { x: current.x, y: current.y, z: current.z - 1 },
    ];
    for (const neighbour of neighbours) {
      const key = `${neighbour.x},${neighbour.y},${neighbour.z}`;
      const found = remaining.get(key);
      if (found) {
        remaining.delete(key);
        queue.push(found);
      }
    }
  }

  return remaining.size === 0;
}
