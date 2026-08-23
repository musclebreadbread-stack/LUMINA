import { describe, expect, it } from "vitest";
import { computeSaju, pillarLabel } from "@engine/saju";
import { DateTime } from "luxon";
import { computeYearlyLuckRange, luckDirection, luckPeriodAtAge } from "@engine/saju/luck";
import { ORACLE_PLACE } from "./fixtures/cases";

describe("대운 순역 판정", () => {
  it("양년 남자·음년 여자는 순행, 양년 여자·음년 남자는 역행이다", () => {
    // 甲(0) = 양간, 乙(1) = 음간
    expect(luckDirection(0, "male")).toBe("forward");
    expect(luckDirection(0, "female")).toBe("backward");
    expect(luckDirection(1, "male")).toBe("backward");
    expect(luckDirection(1, "female")).toBe("forward");
  });

  it("천간 10개 × 성별 2가지 조합이 모두 정의된다", () => {
    for (let stem = 0; stem < 10; stem += 1) {
      for (const gender of ["male", "female"] as const) {
        expect(["forward", "backward"]).toContain(luckDirection(stem, gender));
      }
    }
  });

  it("성별 미지정은 남성과 같은 방향으로 두고 플래그로 고지한다", () => {
    expect(luckDirection(0, "unspecified")).toBe(luckDirection(0, "male"));
    const r = computeSaju(
      { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: ORACLE_PLACE },
      { applyTrueSolarTime: false },
    );
    expect(r.boundary.genderUnspecified).toBe(true);
  });
});

describe("대운수 산출", () => {
  const base = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30 },
    place: ORACLE_PLACE,
  } as const;

  it("순행은 다음 절입까지, 역행은 이전 절입까지의 거리를 쓴다", () => {
    const forward = computeSaju({ ...base, gender: "male" }, { applyTrueSolarTime: false });
    const backward = computeSaju({ ...base, gender: "female" }, { applyTrueSolarTime: false });

    expect(forward.luck.direction).toBe("forward");
    expect(backward.luck.direction).toBe("backward");
    expect(forward.luck.start.boundaryInstant.getTime()).toBeGreaterThan(
      new Date(forward.time.instantISO).getTime(),
    );
    expect(backward.luck.start.boundaryInstant.getTime()).toBeLessThan(
      new Date(backward.time.instantISO).getTime(),
    );
  });

  it("순행 거리 + 역행 거리 = 그 달의 절기 길이(약 30일)", () => {
    const forward = computeSaju({ ...base, gender: "male" }, { applyTrueSolarTime: false });
    const backward = computeSaju({ ...base, gender: "female" }, { applyTrueSolarTime: false });
    const sum = forward.luck.start.daysToBoundary + backward.luck.start.daysToBoundary;
    expect(sum).toBeGreaterThan(29);
    expect(sum).toBeLessThan(32);
  });

  it("3일 = 1년 환산이 정확 나이와 일치한다", () => {
    const r = computeSaju({ ...base, gender: "male" }, { applyTrueSolarTime: false });
    expect(r.luck.start.startAgeExact).toBeCloseTo(r.luck.start.daysToBoundary / 3, 9);
  });

  it("정수 대운수는 1 이상 10 이하다", () => {
    for (let day = 1; day <= 28; day += 1) {
      const r = computeSaju(
        { date: { year: 2000, month: 3, day }, time: { hour: 12, minute: 0 }, place: ORACLE_PLACE, gender: "male" },
        { applyTrueSolarTime: false },
      );
      expect(r.luck.start.startAge, `day ${day}`).toBeGreaterThanOrEqual(1);
      expect(r.luck.start.startAge, `day ${day}`).toBeLessThanOrEqual(10);
    }
  });
});

describe("대운 간지 진행", () => {
  const male = computeSaju(
    { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: ORACLE_PLACE, gender: "male" },
    { applyTrueSolarTime: false },
  );
  const female = computeSaju(
    { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: ORACLE_PLACE, gender: "female" },
    { applyTrueSolarTime: false },
  );

  it("기본 10개 대운을 낸다", () => {
    expect(male.luck.periods).toHaveLength(10);
  });

  it("순행 대운은 월주 다음 간지부터 하나씩 나아간다", () => {
    const start = male.pillars.month.sexagenary;
    male.luck.periods.forEach((p, i) => {
      expect(p.pillar.sexagenary, `period ${i}`).toBe((start + i + 1) % 60);
    });
  });

  it("역행 대운은 월주 이전 간지부터 하나씩 물러난다", () => {
    const start = female.pillars.month.sexagenary;
    female.luck.periods.forEach((p, i) => {
      expect(p.pillar.sexagenary, `period ${i}`).toBe((start - i - 1 + 60 * 2) % 60);
    });
  });

  it("나이 구간이 10년 단위로 빈틈없이 이어진다", () => {
    male.luck.periods.forEach((p, i) => {
      expect(p.toAge - p.fromAge).toBe(10);
      if (i > 0) expect(p.fromAge).toBe(male.luck.periods[i - 1]!.toAge);
    });
  });

  it("나이로 대운을 조회할 수 있고 시작 전이면 null 이다", () => {
    const first = male.luck.periods[0]!;
    expect(luckPeriodAtAge(male.luck.periods, first.fromAge)).toBe(first);
    expect(luckPeriodAtAge(male.luck.periods, first.toAge)).toBe(male.luck.periods[1]);
    expect(luckPeriodAtAge(male.luck.periods, first.fromAge - 1)).toBeNull();
    expect(luckPeriodAtAge(male.luck.periods, 999)).toBeNull();
  });

  it("대운 개수를 옵션으로 조절할 수 있다", () => {
    const r = computeSaju(
      { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: ORACLE_PLACE, gender: "male" },
      { applyTrueSolarTime: false, luckPeriodCount: 8 },
    );
    expect(r.luck.periods).toHaveLength(8);
  });
});

describe("세운 (歲運)", () => {
  const base = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30 },
    place: ORACLE_PLACE,
    gender: "male",
  } as const;

  it("기준 시각을 주지 않으면 시간 의존 결과를 내지 않는다 (공유 링크 재현성)", () => {
    const r = computeSaju(base, { applyTrueSolarTime: false });
    expect(r.current).toBeNull();
  });

  it("기준 시각을 주면 나이·현재 대운·세운을 낸다", () => {
    const r = computeSaju(base, {
      applyTrueSolarTime: false,
      referenceDate: new Date("2026-08-18T00:00:00Z"),
    });
    expect(r.current).not.toBeNull();
    expect(r.current!.age).toBe(36);
    expect(pillarLabel(r.current!.yearlyLuck.pillar, "hanja")).toBe("丙午"); // 2026년
    expect(r.current!.luckPeriod).not.toBeNull();
  });

  it("입춘 전 날짜는 전년도 세운을 쓴다", () => {
    const beforeIpchun = computeSaju(base, {
      applyTrueSolarTime: false,
      referenceDate: new Date("2026-01-15T00:00:00Z"),
    });
    const afterIpchun = computeSaju(base, {
      applyTrueSolarTime: false,
      referenceDate: new Date("2026-03-15T00:00:00Z"),
    });
    expect(beforeIpchun.current!.yearlyLuck.year).toBe(2025);
    expect(afterIpchun.current!.yearlyLuck.year).toBe(2026);
    expect(pillarLabel(beforeIpchun.current!.yearlyLuck.pillar, "hanja")).toBe("乙巳");
  });

  it("동일 입력 + 동일 기준 시각이면 결과가 완전히 같다 (결정론성)", () => {
    const ref = new Date("2026-08-18T09:00:00Z");
    const a = computeSaju(base, { applyTrueSolarTime: false, referenceDate: ref });
    const b = computeSaju(base, { applyTrueSolarTime: false, referenceDate: ref });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("세운 범위 조회", () => {
  const r = computeSaju(
    { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30 }, place: ORACLE_PLACE, gender: "male" },
    { applyTrueSolarTime: false },
  );

  it("연속한 해의 세운을 한 번에 낸다", () => {
    const range = computeYearlyLuckRange(r.pillars, 2024, 5);
    expect(range).toHaveLength(5);
    expect(range.map((y) => y.year)).toEqual([2024, 2025, 2026, 2027, 2028]);
  });

  it("연속한 해의 간지는 60갑자에서 1씩 나아간다", () => {
    const range = computeYearlyLuckRange(r.pillars, 1998, 12);
    for (let i = 1; i < range.length; i += 1) {
      expect((range[i - 1]!.pillar.sexagenary + 1) % 60).toBe(range[i]!.pillar.sexagenary);
    }
  });

  it("각 해의 세운 시작 시각은 그 해 입춘이며 2월 3~5일에 든다", () => {
    for (const y of computeYearlyLuckRange(r.pillars, 2020, 6)) {
      const kst = DateTime.fromJSDate(y.startsAt, { zone: "Asia/Seoul" });
      expect(kst.year).toBe(y.year);
      expect(kst.month).toBe(2);
      expect(kst.day).toBeGreaterThanOrEqual(3);
      expect(kst.day).toBeLessThanOrEqual(5);
    }
  });

  it("십신과 십이운성이 함께 채워진다", () => {
    for (const y of computeYearlyLuckRange(r.pillars, 2024, 3)) {
      expect(y.stemTenGod).toBeTruthy();
      expect(y.branchTenGod).toBeTruthy();
      expect(y.stage).toBeTruthy();
    }
  });
});
