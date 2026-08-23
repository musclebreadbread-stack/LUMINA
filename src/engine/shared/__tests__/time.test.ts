import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  computeTrueSolarTime,
  equationOfTimeMinutes,
  gregorianToJDN,
  resolveInstant,
  resolveTimeZone,
  TimeResolutionError,
} from "@engine/shared/time";

describe("타임존 해석", () => {
  it("좌표에서 IANA 존을 찾는다", () => {
    expect(resolveTimeZone({ lat: 37.5665, lng: 126.978 })).toBe("Asia/Seoul");
    expect(resolveTimeZone({ lat: 35.6762, lng: 139.6503 })).toBe("Asia/Tokyo");
    expect(resolveTimeZone({ lat: 51.5074, lng: -0.1278 })).toBe("Europe/London");
    expect(resolveTimeZone({ lat: -33.8688, lng: 151.2093 })).toBe("Australia/Sydney");
  });

  it("명시된 타임존이 좌표보다 우선한다", () => {
    expect(resolveTimeZone({ lat: 37.5665, lng: 126.978, timeZone: "UTC" })).toBe("UTC");
  });

  it("출생지를 생략하면 서울이 기본값이다", () => {
    expect(resolveTimeZone()).toBe("Asia/Seoul");
  });

  it("조회 불가 좌표는 경도 기반 폴백으로 내려간다", () => {
    const zone = resolveTimeZone({ lat: 0, lng: 0 });
    expect(typeof zone).toBe("string");
    expect(zone.length).toBeGreaterThan(0);
  });
});

describe("벽시계 시각 → 절대 시각", () => {
  it("한국 표준시 변경 이력을 IANA 데이터로 반영한다", () => {
    const cases: readonly (readonly [number, number, number])[] = [
      [1953, 6, 540], // UTC+9
      [1954, 6, 510], // UTC+8:30 으로 변경
      [1960, 6, 570], // UTC+8:30 + 서머타임
      [1962, 6, 540], // UTC+9 복귀
      [1988, 7, 600], // 서머타임 (UTC+10)
      [2024, 7, 540],
    ];
    for (const [year, month, offset] of cases) {
      const r = resolveInstant({ year, month, day: 15 }, { hour: 12, minute: 0 }, "Asia/Seoul");
      expect(r.utcOffsetMinutes, `${year}-${month}`).toBe(offset);
    }
  });

  it("서머타임 여부를 정확히 판정한다", () => {
    const dst = resolveInstant({ year: 1988, month: 7, day: 15 }, { hour: 12, minute: 0 }, "Asia/Seoul");
    const std = resolveInstant({ year: 1988, month: 12, day: 15 }, { hour: 12, minute: 0 }, "Asia/Seoul");
    expect(dst.isDST).toBe(true);
    expect(std.isDST).toBe(false);
  });

  it("절대 시각이 오프셋과 정합한다", () => {
    const r = resolveInstant({ year: 2024, month: 5, day: 15 }, { hour: 12, minute: 0 }, "Asia/Seoul");
    expect(r.instant.toISOString()).toBe("2024-05-15T03:00:00.000Z");
  });
});

describe("균시차 (Equation of Time)", () => {
  /**
   * 균시차는 연중 네 번 0을 지나고 극값은 대략
   * 2월 중순 -14분, 5월 중순 +4분, 7월 하순 -6분, 11월 초 +16분이다.
   */
  it("2월 중순 극소값이 -14분 부근이다", () => {
    const eot = equationOfTimeMinutes(new Date("2024-02-11T12:00:00Z"));
    expect(eot).toBeGreaterThan(-14.5);
    expect(eot).toBeLessThan(-13.5);
  });

  it("11월 초 극대값이 +16분 부근이다", () => {
    const eot = equationOfTimeMinutes(new Date("2024-11-03T12:00:00Z"));
    expect(eot).toBeGreaterThan(16);
    expect(eot).toBeLessThan(16.6);
  });

  it("4월 중순과 9월 초에 0을 지난다", () => {
    expect(Math.abs(equationOfTimeMinutes(new Date("2024-04-15T12:00:00Z")))).toBeLessThan(0.6);
    expect(Math.abs(equationOfTimeMinutes(new Date("2024-09-01T12:00:00Z")))).toBeLessThan(0.6);
  });

  it("일 년 내내 -15 ~ +17분 범위를 벗어나지 않는다", () => {
    for (let day = 0; day < 365; day += 1) {
      const d = new Date(Date.UTC(2024, 0, 1 + day, 12));
      const eot = equationOfTimeMinutes(d);
      expect(eot, d.toISOString()).toBeGreaterThan(-15);
      expect(eot, d.toISOString()).toBeLessThan(17);
    }
  });

  it("날짜 경계에서 ±24시간 점프가 생기지 않는다", () => {
    for (const hour of [0, 1, 12, 22, 23]) {
      const eot = equationOfTimeMinutes(new Date(Date.UTC(2024, 5, 15, hour)));
      expect(Math.abs(eot), `hour ${hour}`).toBeLessThan(20);
    }
  });

  it("하루 동안 균시차 변화는 30초를 넘지 않는다", () => {
    const a = equationOfTimeMinutes(new Date("2024-06-15T00:00:00Z"));
    const b = equationOfTimeMinutes(new Date("2024-06-16T00:00:00Z"));
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });
});

describe("진태양시", () => {
  const resolved = resolveInstant(
    { year: 2024, month: 5, day: 15 },
    { hour: 12, minute: 0 },
    "Asia/Seoul",
  );

  it("표준자오선보다 서쪽이면 진태양시가 늦다", () => {
    const seoul = computeTrueSolarTime(resolved, 126.978);
    expect(seoul.longitudeCorrectionMinutes).toBeLessThan(0);
    expect(seoul.dateTime.toMillis()).toBeLessThan(
      DateTime.fromJSDate(resolved.instant, { zone: "Asia/Seoul" }).toMillis(),
    );
  });

  it("표준자오선 위에서는 경도 보정이 0이다", () => {
    const onMeridian = computeTrueSolarTime(resolved, 135);
    expect(onMeridian.longitudeCorrectionMinutes).toBeCloseTo(0, 9);
  });

  it("경도 1도당 4분씩 보정한다", () => {
    const a = computeTrueSolarTime(resolved, 130);
    const b = computeTrueSolarTime(resolved, 131);
    expect(b.longitudeCorrectionMinutes - a.longitudeCorrectionMinutes).toBeCloseTo(4, 9);
  });

  it("총 보정량은 경도 보정과 균시차의 합이다", () => {
    const t = computeTrueSolarTime(resolved, 126.978);
    expect(t.totalCorrectionMinutes).toBeCloseTo(
      t.longitudeCorrectionMinutes + t.equationOfTimeMinutes,
      9,
    );
  });

  it("균시차를 끄면 경도 보정만 남는다", () => {
    const t = computeTrueSolarTime(resolved, 126.978, { applyEquationOfTime: false });
    expect(t.equationOfTimeMinutes).toBe(0);
    expect(t.totalCorrectionMinutes).toBeCloseTo(t.longitudeCorrectionMinutes, 9);
  });

  it("서머타임 기간에는 표준자오선이 15도 동쪽으로 이동한 것으로 계산한다", () => {
    const dstResolved = resolveInstant(
      { year: 1988, month: 7, day: 15 },
      { hour: 12, minute: 0 },
      "Asia/Seoul",
    );
    const t = computeTrueSolarTime(dstResolved, 126.978);
    expect(t.longitudeCorrectionMinutes).toBeCloseTo((126.978 - 150) * 4, 6);
  });
});

describe("율리우스 적일", () => {
  it("알려진 기준값과 일치한다", () => {
    expect(gregorianToJDN(1900, 1, 1)).toBe(2415021);
    expect(gregorianToJDN(2000, 1, 1)).toBe(2451545);
    expect(gregorianToJDN(1949, 10, 1)).toBe(2433191);
  });

  it("하루 차이는 정확히 1이다", () => {
    expect(gregorianToJDN(2024, 3, 1) - gregorianToJDN(2024, 2, 29)).toBe(1);
    expect(gregorianToJDN(2023, 3, 1) - gregorianToJDN(2023, 2, 28)).toBe(1);
    expect(gregorianToJDN(2025, 1, 1) - gregorianToJDN(2024, 12, 31)).toBe(1);
  });

  it("100년 구간의 일수가 그레고리력 윤년 규칙과 맞는다", () => {
    // 1900년은 윤년이 아니고 2000년은 윤년이다.
    expect(gregorianToJDN(2000, 1, 1) - gregorianToJDN(1900, 1, 1)).toBe(36524);
  });
});

describe("오류 및 폴백 경로", () => {
  it("유효하지 않은 타임존은 TimeResolutionError 를 던진다", () => {
    expect(() =>
      resolveInstant({ year: 2024, month: 1, day: 1 }, { hour: 0, minute: 0 }, "Not/AZone"),
    ).toThrow(TimeResolutionError);
  });

  it("tz-lookup 이 실패하는 좌표는 경도 기반 Etc/GMT 존으로 떨어진다", () => {
    // 위도 범위를 벗어난 좌표는 tz-lookup 이 예외를 던진다.
    expect(resolveTimeZone({ lat: 999, lng: 135 })).toBe("Etc/GMT-9");
    expect(resolveTimeZone({ lat: 999, lng: -75 })).toBe("Etc/GMT+5");
    expect(resolveTimeZone({ lat: 999, lng: 0 })).toBe("Etc/GMT+0");
  });

  it("폴백으로 만든 존도 실제로 해석 가능한 존이다", () => {
    const zone = resolveTimeZone({ lat: 999, lng: 135 });
    const r = resolveInstant({ year: 2024, month: 1, day: 1 }, { hour: 12, minute: 0 }, zone);
    expect(r.utcOffsetMinutes).toBe(540);
  });
});
