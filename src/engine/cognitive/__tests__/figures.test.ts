import { describe, expect, it } from "vitest";
import {
  NO_ROTATION,
  QUARTER_TURNS,
  allOrientationKeys,
  areRotationEquivalent,
  isConnected,
  normalizeVoxels,
  resolveVoxels,
  rotateVoxels,
  voxelsKey,
  type Voxel,
} from "../figures";

function v(coordinates: readonly (readonly [number, number, number])[]): readonly Voxel[] {
  return coordinates.map(([x, y, z]) => ({ x, y, z }));
}

const SCREW = v([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]]);
const SCREW_MIRROR = v([[0, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 0]]);
const TWIST = v([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 2, 1]]);

describe("폴리큐브 기하", () => {
  describe("rotateVoxels", () => {
    it("회전각이 0이면 좌표를 그대로 둔다", () => {
      expect(rotateVoxels(SCREW, NO_ROTATION)).toEqual(SCREW);
    });

    it("각 축으로 네 번 90도 돌리면 제자리로 돌아온다", () => {
      const axes = [
        { xDegrees: 90, yDegrees: 0, zDegrees: 0 },
        { xDegrees: 0, yDegrees: 90, zDegrees: 0 },
        { xDegrees: 0, yDegrees: 0, zDegrees: 90 },
      ] as const;

      for (const axis of axes) {
        let current = TWIST;
        for (let turn = 0; turn < 4; turn += 1) current = rotateVoxels(current, axis);
        expect(voxelsKey(current)).toBe(voxelsKey(TWIST));
      }
    });

    it("180도는 90도를 두 번 돌린 것과 같다", () => {
      const once = rotateVoxels(TWIST, { xDegrees: 90, yDegrees: 0, zDegrees: 0 });
      const twice = rotateVoxels(once, { xDegrees: 90, yDegrees: 0, zDegrees: 0 });
      const direct = rotateVoxels(TWIST, { xDegrees: 180, yDegrees: 0, zDegrees: 0 });
      expect(voxelsKey(direct)).toBe(voxelsKey(twice));
    });

    it("270도 회전도 정의돼 있다", () => {
      expect(QUARTER_TURNS).toEqual([0, 90, 180, 270]);
      const turned = rotateVoxels(SCREW, { xDegrees: 0, yDegrees: 0, zDegrees: 270 });
      expect(turned).toHaveLength(SCREW.length);
    });
  });

  describe("normalizeVoxels", () => {
    it("빈 도형은 빈 배열을 낸다", () => {
      expect(normalizeVoxels([])).toEqual([]);
    });

    it("최소 모서리를 원점으로 옮기고 정렬한다", () => {
      const shifted = v([[5, 5, 5], [4, 5, 5], [4, 6, 5]]);
      expect(normalizeVoxels(shifted)).toEqual([
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 0, z: 0 },
      ]);
    });

    it("평행이동만 다른 도형은 같은 키를 갖는다", () => {
      const shifted = SCREW.map((voxel) => ({ x: voxel.x + 7, y: voxel.y - 3, z: voxel.z + 2 }));
      expect(voxelsKey(shifted)).toBe(voxelsKey(SCREW));
    });
  });

  it("resolveVoxels는 회전 후 원점으로 정규화한다", () => {
    const resolved = resolveVoxels(SCREW, { xDegrees: 0, yDegrees: 90, zDegrees: 0 });
    expect(Math.min(...resolved.map((voxel) => voxel.x))).toBe(0);
    expect(Math.min(...resolved.map((voxel) => voxel.y))).toBe(0);
    expect(Math.min(...resolved.map((voxel) => voxel.z))).toBe(0);
    expect(resolved).toHaveLength(SCREW.length);
  });

  describe("allOrientationKeys", () => {
    it("정육면체 하나는 어떻게 돌려도 같은 자세다", () => {
      expect(allOrientationKeys(v([[0, 0, 0]])).size).toBe(1);
    });

    it("대칭이 없는 도형은 24가지 자세를 갖는다", () => {
      expect(allOrientationKeys(TWIST).size).toBe(24);
    });

    it("대칭축이 있는 도형은 그보다 적다", () => {
      expect(allOrientationKeys(SCREW).size).toBe(12);
    });
  });

  describe("areRotationEquivalent", () => {
    it("같은 도형을 돌린 것은 같다고 본다", () => {
      const turned = rotateVoxels(TWIST, { xDegrees: 90, yDegrees: 180, zDegrees: 270 });
      expect(areRotationEquivalent(TWIST, turned)).toBe(true);
    });

    it("거울상은 회전으로 겹치지 않는다", () => {
      expect(areRotationEquivalent(SCREW, SCREW_MIRROR)).toBe(false);
    });

    it("정육면체 개수가 다르면 볼 것도 없이 다르다", () => {
      expect(areRotationEquivalent(SCREW, TWIST)).toBe(false);
    });
  });

  describe("isConnected", () => {
    it("빈 도형은 도형이 아니다", () => {
      expect(isConnected([])).toBe(false);
    });

    it("면끼리 이어진 도형을 통과시킨다", () => {
      expect(isConnected(TWIST)).toBe(true);
    });

    it("떨어진 정육면체가 있으면 걸러 낸다", () => {
      expect(isConnected(v([[0, 0, 0], [1, 0, 0], [5, 5, 5]]))).toBe(false);
    });

    it("모서리만 맞닿은 것은 이어진 것으로 보지 않는다", () => {
      expect(isConnected(v([[0, 0, 0], [1, 1, 0]]))).toBe(false);
    });
  });
});
