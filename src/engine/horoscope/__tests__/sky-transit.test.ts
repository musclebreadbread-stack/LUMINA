import { describe, expect, it } from "vitest";
import { computeTransits, aspectBetween, computeNatalTransitAspects } from "../transit";
import {
  computeDailySky,
  computeDailySkyAtTimeZone,
  parseReferenceDate,
  referenceInstantAtUtcNoon,
  skyPositionOf,
  type DailySky,
} from "../sky";

describe("운세용 하늘 상태와 트랜짓", () => {
  it("지원 날짜를 파싱하고 잘못된 날짜를 거부한다", () => {
    expect(parseReferenceDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(referenceInstantAtUtcNoon("2024-02-29").toISOString()).toBe(
      "2024-02-29T12:00:00.000Z",
    );
    expect(() => parseReferenceDate("2024/02/29")).toThrow();
    expect(() => parseReferenceDate("1899-12-31")).toThrow();
    expect(() => parseReferenceDate("2101-01-01")).toThrow();
    expect(() => parseReferenceDate("2024-13-01")).toThrow();
    expect(() => parseReferenceDate("2023-02-29")).toThrow();
  });

  it("UTC와 시간대별 일일 하늘을 캐시하며 트랜짓 스냅샷을 만든다", () => {
    const utc = computeDailySky("2026-08-20");
    expect(computeDailySky("2026-08-20")).toBe(utc);
    const seoul = computeDailySkyAtTimeZone("2026-08-20", "Asia/Seoul");
    expect(computeDailySkyAtTimeZone("2026-08-20", "Asia/Seoul")).toBe(seoul);
    expect(seoul.timeZone).toBe("Asia/Seoul");

    const snapshot = computeTransits(utc);
    expect(snapshot.aspects).toBe(utc.aspects);
    expect(snapshot.moonSignIndex).toBeGreaterThanOrEqual(0);
    expect(snapshot.sunSignIndex).toBeGreaterThanOrEqual(0);
    expect(snapshot.marsSignIndex).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.mercuryRetrograde).toBe("boolean");
  });

  it("존재하는 천체쌍과 해당하지 않는 천체쌍의 각도 관계를 모두 처리한다", () => {
    const sky = computeDailySky("2026-08-20");
    const known = sky.aspects[0];
    expect(known).toBeDefined();
    if (!known) return;
    expect(aspectBetween(sky, known.a, known.b).aspect).not.toBeNull();

    const keys = sky.positions.map((position) => position.key);
    const absent = keys
      .flatMap((first, firstIndex) =>
        keys.slice(firstIndex + 1).map((second) => ({ first, second })),
      )
      .find(
        (pair) =>
          !sky.aspects.some(
            (candidate) =>
              (candidate.a === pair.first && candidate.b === pair.second) ||
              (candidate.a === pair.second && candidate.b === pair.first),
          ),
      );
    expect(absent).toBeDefined();
    if (absent) expect(aspectBetween(sky, absent.first, absent.second).aspect).toBeNull();
  });

  it("행성 위치를 조회하고 누락된 위치를 오류로 알린다", () => {
    const sky = computeDailySky("2026-08-20");
    expect(skyPositionOf(sky, "sun").key).toBe("sun");
    const missing: DailySky = {
      ...sky,
      positions: [],
      aspects: [],
    };
    expect(() => skyPositionOf(missing, "sun")).toThrow("missing sky position");
  });

  it("나탈 위치와 일치하는 각을 찾고 강도순으로 정렬한다", () => {
    const sky = computeDailySky("2026-08-20");
    const sun = skyPositionOf(sky, "sun");
    const mars = skyPositionOf(sky, "mars");
    const results = computeNatalTransitAspects(sky, [
      { key: "sun", longitude: sun.longitude },
      { key: "mars", longitude: (mars.longitude + 180) % 360 },
      { key: "pluto", longitude: 12.345 },
    ]);
    expect(results.length).toBeGreaterThan(0);
    for (let index = 1; index < results.length; index += 1) {
      expect(results[index - 1]?.strength ?? 0).toBeGreaterThanOrEqual(
        results[index]?.strength ?? 0,
      );
    }
    expect(results.some((result) => result.transit === "sun" || result.natal === "sun")).toBe(
      true,
    );
    expect(Object.isFrozen(results)).toBe(true);
  });
});
