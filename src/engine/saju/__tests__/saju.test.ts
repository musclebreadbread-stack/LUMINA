import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { BirthInputError } from "@engine/shared/birth";
import { computeSaju } from "@engine/saju";
import { lunarToSolar, solarToLunar } from "@engine/saju/lunar";
import { ORACLE_PLACE } from "./fixtures/cases";

const SEOUL = { lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul", label: "Seoul" } as const;

describe("입력 검증", () => {
  it("범위를 벗어난 값은 어느 필드가 틀렸는지 알려준다", () => {
    const bad: readonly (readonly [Record<string, unknown>, string])[] = [
      [{ date: { year: 1800, month: 1, day: 1 } }, "date.year"],
      [{ date: { year: 2000, month: 13, day: 1 } }, "date.month"],
      [{ date: { year: 2000, month: 1, day: 0 } }, "date.day"],
      [{ date: { year: 2001, month: 2, day: 29 } }, "date.day"], // 평년 2월 29일
      [{ date: { year: 2000, month: 1, day: 1 }, time: { hour: 24, minute: 0 } }, "time.hour"],
      [{ date: { year: 2000, month: 1, day: 1 }, time: { hour: 0, minute: 60 } }, "time.minute"],
      [{ date: { year: 2000, month: 1, day: 1 }, place: { lat: 91, lng: 0 } }, "place.lat"],
      [{ date: { year: 2000, month: 1, day: 1 }, place: { lat: 0, lng: 181 } }, "place.lng"],
    ];

    for (const [input, field] of bad) {
      let caught: unknown;
      try {
        // @ts-expect-error — 의도적으로 잘못된 입력을 넣는다
        computeSaju(input);
      } catch (e) {
        caught = e;
      }
      expect(caught, field).toBeInstanceOf(BirthInputError);
      expect((caught as BirthInputError).field).toBe(field);
    }
  });

  it("윤년 2월 29일은 통과한다", () => {
    expect(() => computeSaju({ date: { year: 2000, month: 2, day: 29 } })).not.toThrow();
  });
});

describe("진태양시 보정", () => {
  const base = {
    date: { year: 2024, month: 5, day: 15 },
    time: { hour: 12, minute: 0 },
    place: SEOUL,
  } as const;

  it("서울(126.978°E)의 경도 보정은 약 -32분이다", () => {
    const r = computeSaju(base);
    expect(r.time.longitudeCorrectionMinutes).toBeCloseTo((126.978 - 135) * 4, 6);
    expect(r.time.longitudeCorrectionMinutes).toBeGreaterThan(-33);
    expect(r.time.longitudeCorrectionMinutes).toBeLessThan(-32);
  });

  it("균시차는 -15 ~ +17분 범위 안에 있다", () => {
    for (let month = 1; month <= 12; month += 1) {
      const r = computeSaju({ ...base, date: { year: 2024, month, day: 15 } });
      expect(r.time.equationOfTimeMinutes, `month ${month}`).toBeGreaterThan(-15);
      expect(r.time.equationOfTimeMinutes, `month ${month}`).toBeLessThan(17);
    }
  });

  it("보정을 끄면 총 보정량이 0이고 진태양시가 표준시와 같다", () => {
    const off = computeSaju(base, { applyTrueSolarTime: false });
    expect(off.time.totalCorrectionMinutes).toBe(0);
    expect(off.time.trueSolarISO).toBe(off.time.localISO);
  });

  it("보정 결과 시지가 실제로 바뀌는 경계를 잡아낸다", () => {
    // 서울 13:00 은 보정 후 12:2x 로 여전히 午시지만, 13:20 은 未시가 아니라 午시로 남는다.
    const at1300 = computeSaju({ ...base, time: { hour: 13, minute: 0 } });
    const at1300NoCorrection = computeSaju(
      { ...base, time: { hour: 13, minute: 0 } },
      { applyTrueSolarTime: false },
    );
    expect(at1300.pillars.hour?.branch).toBe(6); // 午
    expect(at1300NoCorrection.pillars.hour?.branch).toBe(7); // 未
  });

  it("균시차만 따로 끌 수 있다", () => {
    const r = computeSaju(base, { applyEquationOfTime: false });
    expect(r.time.equationOfTimeMinutes).toBe(0);
    expect(r.time.totalCorrectionMinutes).toBeCloseTo(r.time.longitudeCorrectionMinutes, 9);
  });
});

describe("역사적 표준시·서머타임", () => {
  it("1954~1961년 한국의 표준시는 UTC+8:30 이었다", () => {
    // 겨울이어야 서머타임이 섞이지 않는다. 1955~1960 여름에는 서머타임이 있었다.
    const r = computeSaju({
      date: { year: 1958, month: 12, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(r.time.utcOffsetMinutes).toBe(510);
    expect(r.time.isDST).toBe(false);
  });

  it("1955~1960년 여름은 UTC+8:30 위에 서머타임이 얹혀 UTC+9:30 이었다", () => {
    const r = computeSaju({
      date: { year: 1958, month: 6, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(r.time.utcOffsetMinutes).toBe(570);
    expect(r.time.isDST).toBe(true);
  });

  it("1988년 서울올림픽 해의 여름은 서머타임(UTC+10)이었다", () => {
    const r = computeSaju({
      date: { year: 1988, month: 7, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(r.time.utcOffsetMinutes).toBe(600);
    expect(r.time.isDST).toBe(true);
  });

  it("서머타임 기간에는 경도 보정이 한 시간만큼 더 커진다", () => {
    const dst = computeSaju({
      date: { year: 1988, month: 7, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    const normal = computeSaju({
      date: { year: 1989, month: 7, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(dst.time.longitudeCorrectionMinutes).toBeCloseTo(
      normal.time.longitudeCorrectionMinutes - 60,
      6,
    );
  });

  it("현재는 UTC+9 이고 서머타임이 없다", () => {
    const r = computeSaju({
      date: { year: 2024, month: 7, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(r.time.utcOffsetMinutes).toBe(540);
    expect(r.time.isDST).toBe(false);
  });
});

describe("출생지 처리", () => {
  it("타임존을 생략하면 좌표에서 해석한다", () => {
    const r = computeSaju({
      date: { year: 2000, month: 6, day: 1 },
      time: { hour: 9, minute: 0 },
      place: { lat: 40.7128, lng: -74.006 },
    });
    expect(r.time.timeZone).toBe("America/New_York");
    expect(r.time.utcOffsetMinutes).toBe(-240); // EDT
  });

  it("출생지를 생략하면 서울을 기본값으로 쓴다", () => {
    const r = computeSaju({ date: { year: 2000, month: 6, day: 1 }, time: { hour: 9, minute: 0 } });
    expect(r.time.timeZone).toBe("Asia/Seoul");
  });

  it("같은 절대 시각이면 출생지가 달라도 연·월주는 같다", () => {
    // 서울 2024-05-15 12:00 KST == 뉴욕 2024-05-14 23:00 EDT
    const seoul = computeSaju({
      date: { year: 2024, month: 5, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    const ny = computeSaju({
      date: { year: 2024, month: 5, day: 14 },
      time: { hour: 23, minute: 0 },
      place: { lat: 40.7128, lng: -74.006 },
    });
    expect(seoul.time.instantISO).toBe(ny.time.instantISO);
    expect(seoul.pillars.year).toEqual(ny.pillars.year);
    expect(seoul.pillars.month).toEqual(ny.pillars.month);
  });
});

describe("음력 입력", () => {
  it("음력 생일을 양력으로 옮겨 계산한다", () => {
    const solar = lunarToSolar(1956, 1, 21, false);
    const viaLunar = computeSaju({
      date: { year: 1956, month: 1, day: 21 },
      calendar: "lunar",
      time: { hour: 10, minute: 0 },
      place: ORACLE_PLACE,
    });
    const viaSolar = computeSaju({
      date: solar,
      time: { hour: 10, minute: 0 },
      place: ORACLE_PLACE,
    });
    expect(viaLunar.pillars).toEqual(viaSolar.pillars);
    expect(viaLunar.birth.solar).toEqual(solar);
  });

  it("결과에 음력 표기를 함께 담는다", () => {
    const r = computeSaju({ date: { year: 1990, month: 5, day: 15 }, place: SEOUL });
    expect(r.birth.lunar).not.toBeNull();
    expect(r.birth.lunar).toEqual(solarToLunar(1990, 5, 15));
  });
});

describe("시각 미상 처리", () => {
  const noTime = computeSaju({ date: { year: 1990, month: 5, day: 15 }, place: SEOUL });

  it("시주를 만들지 않고 플래그로 알린다", () => {
    expect(noTime.pillars.hour).toBeNull();
    expect(noTime.view.hour).toBeNull();
    expect(noTime.boundary.timeUnknown).toBe(true);
    expect(noTime.time.timeUnknown).toBe(true);
  });

  it("연·월·일주는 정상적으로 산출된다", () => {
    expect(noTime.pillars.year).toBeDefined();
    expect(noTime.pillars.month).toBeDefined();
    expect(noTime.pillars.day).toBeDefined();
  });

  it("정오 기준으로 잡으므로 일주가 그날 날짜와 일치한다", () => {
    const withNoon = computeSaju({
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(noTime.pillars.day).toEqual(withNoon.pillars.day);
  });
});

describe("결과 구조와 계층 태깅", () => {
  const r = computeSaju(
    {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30 },
      place: SEOUL,
      gender: "female",
    },
    { referenceDate: new Date("2026-08-18T00:00:00Z") },
  );

  it("문화적 해석 계층으로 태깅된다", () => {
    expect(r.tier).toBe("cultural");
    expect(r.engine).toBe("saju");
    expect(r.version).toBe(1);
  });

  it("표시용 뷰가 네 기둥과 정합한다", () => {
    expect(r.view.year.ko).toHaveLength(2);
    expect(r.view.day.stemKo).toBe(r.dayMaster.ko);
    expect(r.view.day.stemElement).toBe(r.dayMaster.element);
  });

  it("사용된 옵션을 결과에 남긴다 (공유 링크 재현용)", () => {
    expect(r.options).toEqual({
      dayBoundaryRule: "zi23",
      applyTrueSolarTime: true,
      applyEquationOfTime: true,
      luckPeriodCount: 10,
    });
  });

  it("절입 경계까지 남은 시간을 알려준다", () => {
    expect(r.boundary.hoursToNearestTermBoundary).toBeGreaterThanOrEqual(0);
    expect(r.boundary.hoursToNearestTermBoundary).toBeLessThan(16 * 24);
  });

  it("JSON 직렬화가 가능하다 (해석 레이어·공유 링크 입력)", () => {
    expect(() => JSON.stringify(r)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.pillars.day.sexagenary).toBe(r.pillars.day.sexagenary);
  });

  it("결과 객체는 동결되어 있다 (하위 소비자가 변형할 수 없다)", () => {
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.pillars)).toBe(true);
    expect(Object.isFrozen(r.elements)).toBe(true);
  });
});

describe("절입 당일 경계 — 월주가 실제로 갈린다", () => {
  it("2024년 입춘 직전·직후로 연주와 월주가 모두 바뀐다", () => {
    // 2024 입춘: 2024-02-04 17:26:49 KST
    const before = computeSaju(
      {
        date: { year: 2024, month: 2, day: 4 },
        time: { hour: 17, minute: 0 },
        place: SEOUL,
      },
      { applyTrueSolarTime: false },
    );
    const after = computeSaju(
      {
        date: { year: 2024, month: 2, day: 4 },
        time: { hour: 18, minute: 0 },
        place: SEOUL,
      },
      { applyTrueSolarTime: false },
    );

    expect(before.pillars.year.sexagenary).not.toBe(after.pillars.year.sexagenary);
    expect(before.pillars.month.branch).toBe(1); // 丑월
    expect(after.pillars.month.branch).toBe(2); // 寅월
    // 일주는 같은 날이므로 바뀌지 않는다.
    expect(before.pillars.day).toEqual(after.pillars.day);
  });

  it("진태양시 보정이 절기 판정 자체를 바꾸지는 않는다 (절기는 절대 시각이다)", () => {
    const base = {
      date: { year: 2024, month: 2, day: 4 },
      time: { hour: 17, minute: 40 },
      place: SEOUL,
    } as const;
    const on = computeSaju(base, { applyTrueSolarTime: true });
    const off = computeSaju(base, { applyTrueSolarTime: false });
    expect(on.pillars.year).toEqual(off.pillars.year);
    expect(on.pillars.month).toEqual(off.pillars.month);
  });
});

describe("타임존 경계에서의 일주", () => {
  it("자정 직후 서울 출생은 그날의 일주를 쓴다", () => {
    const r = computeSaju(
      {
        date: { year: 2024, month: 5, day: 15 },
        time: { hour: 0, minute: 30 },
        place: SEOUL,
      },
      { applyTrueSolarTime: false },
    );
    const expected = DateTime.fromObject(
      { year: 2024, month: 5, day: 15 },
      { zone: "Asia/Seoul" },
    );
    expect(r.time.localISO.startsWith(expected.toFormat("yyyy-MM-dd"))).toBe(true);
  });
});
