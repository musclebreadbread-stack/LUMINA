import { describe, expect, it } from "vitest";
import { PLANETS, computeChart, planetPosition } from "@engine/astro";
import { angularDelta, oracleLongitude } from "./oracle";

/**
 * 품질 게이트: 알려진 출생 차트 20건과 행성 위치 오차 < 1도.
 *
 * "알려진 차트"의 기준값으로는 독립 구현체(astronomia — Meeus/VSOP87)를 쓴다.
 * 우리 엔진의 astronomy-engine 과 알고리즘 계보가 달라 자기참조가 아니다.
 * 실제 오차는 초각(arcsec) 단위이므로 게이트를 1도가 아니라 0.05도로 죄어 둔다 —
 * 나중에 계산이 미묘하게 틀어지면 게이트가 먼저 울려야 하기 때문이다.
 */

const GATE_DEGREES = 1;
const TIGHT_DEGREES = 0.05;

/** 20건 — 연대·계절·반구·시각을 고르게 흩었다. */
const CHARTS = [
  { label: "서울 1990 봄", date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 1955 겨울", date: { year: 1955, month: 1, day: 3 }, time: { hour: 3, minute: 12 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "부산 1968 가을", date: { year: 1968, month: 10, day: 2 }, time: { hour: 22, minute: 45 }, place: { lat: 35.1796, lng: 129.0756 } },
  { label: "제주 1977 여름", date: { year: 1977, month: 7, day: 19 }, time: { hour: 6, minute: 5 }, place: { lat: 33.4996, lng: 126.5312 } },
  { label: "도쿄 1983", date: { year: 1983, month: 3, day: 28 }, time: { hour: 11, minute: 11 }, place: { lat: 35.6762, lng: 139.6503, timeZone: "Asia/Tokyo" } },
  { label: "뉴욕 1962", date: { year: 1962, month: 12, day: 24 }, time: { hour: 18, minute: 40 }, place: { lat: 40.7128, lng: -74.006, timeZone: "America/New_York" } },
  { label: "런던 1945", date: { year: 1945, month: 8, day: 15 }, time: { hour: 9, minute: 0 }, place: { lat: 51.5074, lng: -0.1278, timeZone: "Europe/London" } },
  { label: "시드니 1999", date: { year: 1999, month: 11, day: 30 }, time: { hour: 4, minute: 20 }, place: { lat: -33.8688, lng: 151.2093, timeZone: "Australia/Sydney" } },
  { label: "LA 2001", date: { year: 2001, month: 9, day: 11 }, time: { hour: 12, minute: 0 }, place: { lat: 34.0522, lng: -118.2437, timeZone: "America/Los_Angeles" } },
  { label: "베이징 1976", date: { year: 1976, month: 4, day: 6 }, time: { hour: 20, minute: 15 }, place: { lat: 39.9042, lng: 116.4074, timeZone: "Asia/Shanghai" } },
  { label: "서울 1901 초기", date: { year: 1901, month: 2, day: 14 }, time: { hour: 8, minute: 30 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 1920", date: { year: 1920, month: 6, day: 21 }, time: { hour: 13, minute: 45 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 1936 윤년", date: { year: 1936, month: 2, day: 29 }, time: { hour: 0, minute: 30 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 1988 서머타임", date: { year: 1988, month: 8, day: 8 }, time: { hour: 17, minute: 55 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2000 밀레니엄", date: { year: 2000, month: 1, day: 1 }, time: { hour: 0, minute: 1 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2012", date: { year: 2012, month: 2, day: 29 }, time: { hour: 23, minute: 59 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2024", date: { year: 2024, month: 12, day: 21 }, time: { hour: 15, minute: 30 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2035", date: { year: 2035, month: 4, day: 17 }, time: { hour: 7, minute: 7 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2060", date: { year: 2060, month: 9, day: 9 }, time: { hour: 19, minute: 21 }, place: { lat: 37.5665, lng: 126.978 } },
  { label: "서울 2090", date: { year: 2090, month: 11, day: 5 }, time: { hour: 2, minute: 2 }, place: { lat: 37.5665, lng: 126.978 } },
] as const;

describe("행성 위치 교차검증 — astronomia 대비", () => {
  it("검증 차트가 20건이다", () => {
    expect(CHARTS).toHaveLength(20);
  });

  it(`20건 × 10천체 = 200건에서 오차가 ${GATE_DEGREES}도 미만이다 (품질 게이트)`, () => {
    const failures: string[] = [];
    let worst = { delta: 0, who: "" };
    let compared = 0;

    for (const chart of CHARTS) {
      const result = computeChart({ date: chart.date, time: chart.time, place: chart.place });
      const instant = new Date(result.time.instantISO);

      for (const planet of result.planets) {
        const expected = oracleLongitude(planet.key, instant);
        const delta = angularDelta(planet.longitude, expected);
        compared += 1;
        if (delta > worst.delta) worst = { delta, who: `${chart.label} / ${planet.key}` };
        if (delta >= GATE_DEGREES) {
          failures.push(
            `${chart.label} ${planet.key}: ours=${planet.longitude.toFixed(4)} oracle=${expected.toFixed(4)} Δ=${delta.toFixed(4)}°`,
          );
        }
      }
    }

    expect(compared).toBe(200);
    expect(failures).toEqual([]);
    // 실제 일치도는 게이트보다 훨씬 좋아야 한다.
    expect(worst.delta, `worst: ${worst.who} Δ=${worst.delta.toFixed(5)}°`).toBeLessThan(
      TIGHT_DEGREES,
    );
  });

  it("천체별 최대 오차를 각각 기록한다", () => {
    const worstByPlanet = new Map<string, number>();

    for (const chart of CHARTS) {
      const result = computeChart({ date: chart.date, time: chart.time, place: chart.place });
      const instant = new Date(result.time.instantISO);
      for (const planet of result.planets) {
        const delta = angularDelta(planet.longitude, oracleLongitude(planet.key, instant));
        worstByPlanet.set(planet.key, Math.max(worstByPlanet.get(planet.key) ?? 0, delta));
      }
    }

    expect(worstByPlanet.size).toBe(PLANETS.length);
    for (const [key, delta] of worstByPlanet) {
      expect(delta, `${key} 최대 오차 ${(delta * 3600).toFixed(1)}초각`).toBeLessThan(TIGHT_DEGREES);
    }
  });

  it("2020-2030 구간 803개 5일 간격 표본, 8,030건을 0.05도 미만으로 통과한다", () => {
    const failures: string[] = [];
    let compared = 0;
    let worst = { delta: 0, label: "" };
    const start = Date.UTC(2020, 0, 1, 12, 0, 0);
    const step = 5 * 86_400_000;

    for (let sample = 0; sample < 803; sample += 1) {
      const timestamp = start + sample * step;
      const instant = new Date(timestamp);
      const chart = computeChart({
        date: {
          year: instant.getUTCFullYear(),
          month: instant.getUTCMonth() + 1,
          day: instant.getUTCDate(),
        },
        time: { hour: 12, minute: 0 },
        place: { lat: 0, lng: 0, timeZone: "Etc/UTC" },
      });

      for (const planet of chart.planets) {
        const delta = angularDelta(planet.longitude, oracleLongitude(planet.key, instant));
        compared += 1;
        if (delta > worst.delta) {
          worst = { delta, label: `${instant.toISOString()} / ${planet.key}` };
        }
        if (delta >= TIGHT_DEGREES && failures.length < 10) {
          failures.push(
            `${instant.toISOString()} ${planet.key}: ours=${planet.longitude.toFixed(4)} Δ=${delta.toFixed(4)}°`,
          );
        }
      }
    }

    expect(compared).toBe(8_030);
    expect(failures, failures.join("\n")).toEqual([]);
    expect(worst.delta, `worst: ${worst.label} Δ=${worst.delta.toFixed(5)}°`).toBeLessThan(
      TIGHT_DEGREES,
    );
  }, 120_000);
});

describe("역행 판정", () => {
  it("수성 역행 구간을 잡아낸다", () => {
    // 2024-04-02 ~ 04-25 는 널리 알려진 수성 역행 기간이다.
    const inside = planetPosition("mercury", new Date("2024-04-12T00:00:00Z"));
    const outside = planetPosition("mercury", new Date("2024-05-20T00:00:00Z"));
    expect(inside.retrograde).toBe(true);
    expect(outside.retrograde).toBe(false);
  });

  it("해와 달은 결코 역행하지 않는다", () => {
    for (let day = 0; day < 60; day += 1) {
      const t = new Date(Date.UTC(2024, 0, 1 + day * 6));
      expect(planetPosition("sun", t).retrograde, t.toISOString()).toBe(false);
      expect(planetPosition("moon", t).retrograde, t.toISOString()).toBe(false);
    }
  });

  it("일일 이동량이 천체별 실제 속도 범위에 든다", () => {
    const t = new Date("2024-06-15T00:00:00Z");
    // 달은 하루 약 11~15도, 해는 약 1도를 움직인다.
    expect(planetPosition("moon", t).speedPerDay).toBeGreaterThan(11);
    expect(planetPosition("moon", t).speedPerDay).toBeLessThan(16);
    expect(planetPosition("sun", t).speedPerDay).toBeGreaterThan(0.9);
    expect(planetPosition("sun", t).speedPerDay).toBeLessThan(1.1);
    // 바깥 행성일수록 느리다.
    expect(Math.abs(planetPosition("neptune", t).speedPerDay)).toBeLessThan(0.05);
  });
});
