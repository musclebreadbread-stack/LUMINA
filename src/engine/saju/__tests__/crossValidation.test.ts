import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { computeSaju, pillarLabel } from "@engine/saju";
import { buildSajuCases, ORACLE_PLACE, type SajuCase } from "./fixtures/cases";

/**
 * 품질 게이트: 사주 엔진이 독립 구현체와 100건 이상에서 100% 일치할 것.
 *
 * 오라클은 lunar-javascript(6tail) — 寿星天文历 기반의 별개 코드베이스이며,
 * 우리 엔진(astronomy-engine 기반 절기 + JDN 기반 일주)과 알고리즘 계보가 다르다.
 * 따라서 두 구현의 일치는 자기참조가 아닌 실질적 검증이다.
 *
 * 정렬 조건
 *  - 오라클은 UTC+8 고정을 전제하므로 케이스를 Etc/GMT-8 에 둔다.
 *  - 오라클은 진태양시 보정을 하지 않으므로 applyTrueSolarTime: false 로 맞춘다.
 *  - 오라클 sect 1 = 야자시론 = 우리의 dayBoundaryRule "zi23".
 */

const CASES = buildSajuCases();

interface OraclePillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

function oracleOf(c: SajuCase): OraclePillars {
  const ec = Solar.fromYmdHms(c.year, c.month, c.day, c.hour, c.minute, 0).getLunar().getEightChar();
  ec.setSect(1); // 야자시론
  return { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: ec.getTime() };
}

function mineOf(c: SajuCase): OraclePillars {
  const result = computeSaju(
    {
      date: { year: c.year, month: c.month, day: c.day },
      time: { hour: c.hour, minute: c.minute },
      place: ORACLE_PLACE,
    },
    { applyTrueSolarTime: false, dayBoundaryRule: "zi23" },
  );
  const { year, month, day, hour } = result.pillars;
  return {
    year: pillarLabel(year, "hanja"),
    month: pillarLabel(month, "hanja"),
    day: pillarLabel(day, "hanja"),
    hour: hour ? pillarLabel(hour, "hanja") : "",
  };
}

describe("사주 엔진 교차검증 — lunar-javascript 대비", () => {
  it("검증 케이스가 436건이다 (품질 게이트 기준 100건의 4배 이상)", () => {
    // 무작위 120 + 절입경계 240(5년 × 12절 × 4지점) + 자시경계 64(8일 × 8시각) + 달력경계 12
    expect(CASES.length).toBe(436);
    expect(CASES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
  });

  it("모든 케이스에서 사주 네 기둥이 100% 일치한다", () => {
    const mismatches: string[] = [];

    for (const c of CASES) {
      const expected = oracleOf(c);
      const actual = mineOf(c);
      for (const key of ["year", "month", "day", "hour"] as const) {
        if (expected[key] !== actual[key]) {
          mismatches.push(
            `[${c.kind}] ${c.id} ${c.year}-${c.month}-${c.day} ${c.hour}:${String(c.minute).padStart(2, "0")}` +
              ` — ${key}: expected ${expected[key]}, got ${actual[key]}`,
          );
        }
      }
    }

    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });

  it("케이스 종류별로 최소 커버리지를 만족한다", () => {
    const byKind = CASES.reduce<Record<string, number>>((acc, c) => {
      acc[c.kind] = (acc[c.kind] ?? 0) + 1;
      return acc;
    }, {});
    expect(byKind.random).toBeGreaterThanOrEqual(100);
    expect(byKind["solar-term-edge"]).toBeGreaterThanOrEqual(40);
    expect(byKind["zi-hour"]).toBeGreaterThanOrEqual(40);
    expect(byKind["calendar-edge"]).toBeGreaterThanOrEqual(10);
  });
});

describe("일주 학설 — 야자시론 vs 자정론", () => {
  const base = {
    date: { year: 2024, month: 5, day: 15 },
    place: ORACLE_PLACE,
  } as const;

  it("23시 출생에서만 두 학설의 일주가 갈린다", () => {
    const zi23 = computeSaju(
      { ...base, time: { hour: 23, minute: 30 } },
      { applyTrueSolarTime: false, dayBoundaryRule: "zi23" },
    );
    const midnight = computeSaju(
      { ...base, time: { hour: 23, minute: 30 } },
      { applyTrueSolarTime: false, dayBoundaryRule: "midnight" },
    );

    expect(zi23.pillars.day.sexagenary).toBe((midnight.pillars.day.sexagenary + 1) % 60);
    expect(zi23.boundary.inLateZiHour).toBe(true);
    expect(midnight.boundary.inLateZiHour).toBe(true);
    // 시지는 두 학설 모두 子시다.
    expect(zi23.pillars.hour?.branch).toBe(0);
    expect(midnight.pillars.hour?.branch).toBe(0);
  });

  it("23시가 아닌 시각에서는 두 학설이 완전히 동일하다", () => {
    for (const hour of [0, 1, 6, 11, 12, 17, 22]) {
      const zi23 = computeSaju(
        { ...base, time: { hour, minute: 15 } },
        { applyTrueSolarTime: false, dayBoundaryRule: "zi23" },
      );
      const midnight = computeSaju(
        { ...base, time: { hour, minute: 15 } },
        { applyTrueSolarTime: false, dayBoundaryRule: "midnight" },
      );
      expect(zi23.pillars).toEqual(midnight.pillars);
      expect(zi23.boundary.inLateZiHour).toBe(false);
    }
  });
});
