import { describe, expect, it } from "vitest";
import { BirthInputError } from "@engine/shared/birth";
import {
  ASPECTS,
  PLANETS,
  SIGNS,
  computeAngles,
  computeAspects,
  computeChart,
  computeHouses,
  formatPosition,
  houseOfLongitude,
  isPolarLatitude,
  norm180,
  norm360,
  planetDef,
  separationOf,
  signOfLongitude,
  signAt,
} from "@engine/astro";

const SEOUL = { lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul", label: "서울" } as const;
const BASE = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30 },
  place: SEOUL,
} as const;

describe("12궁 테이블", () => {
  it("12개이며 30도씩 이어진다", () => {
    expect(SIGNS).toHaveLength(12);
    SIGNS.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.startDegree).toBe(i * 30);
    });
  });

  it("원소가 불·흙·공기·물 순으로 순환한다", () => {
    const expected = ["fire", "earth", "air", "water"];
    SIGNS.forEach((s, i) => expect(s.element, s.ko).toBe(expected[i % 4]));
  });

  it("성질이 활동·고정·변통 순으로 순환한다", () => {
    const expected = ["cardinal", "fixed", "mutable"];
    SIGNS.forEach((s, i) => expect(s.modality, s.ko).toBe(expected[i % 3]));
  });

  it("황경을 별자리로 나눌 때 경계가 좌폐우개다", () => {
    expect(signOfLongitude(0).ko).toBe("양자리");
    expect(signOfLongitude(29.999).ko).toBe("양자리");
    expect(signOfLongitude(30).ko).toBe("황소자리");
    expect(signOfLongitude(359.999).ko).toBe("물고기자리");
    expect(signOfLongitude(360).ko).toBe("양자리");
    expect(signOfLongitude(-1).ko).toBe("물고기자리");
  });

  it("잘못된 조회값은 런타임에서 명시적으로 거부한다", () => {
    expect(() => signAt(Number.NaN)).toThrow(RangeError);
    expect(() => planetDef("unknown" as never)).toThrow(RangeError);
  });
});

describe("각도 정규화", () => {
  it("norm360 은 [0,360) 으로 접는다", () => {
    expect(norm360(0)).toBe(0);
    expect(norm360(360)).toBe(0);
    expect(norm360(-1)).toBe(359);
    expect(norm360(725)).toBe(5);
  });

  it("norm180 은 (-180,180] 으로 접는다", () => {
    expect(norm180(0)).toBe(0);
    expect(norm180(180)).toBe(180);
    expect(norm180(181)).toBe(-179);
    expect(norm180(-181)).toBe(179);
  });

  it("각거리는 언제나 0~180 이다", () => {
    for (let a = 0; a < 360; a += 17) {
      for (let b = 0; b < 360; b += 23) {
        const s = separationOf(a, b);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(180);
        expect(s).toBeCloseTo(separationOf(b, a), 9);
      }
    }
  });
});

describe("상승궁과 중천", () => {
  it("적도에서 RAMC 0도이면 중천 0도, 상승궁 90도다", () => {
    const a = computeAngles(0, 23.44, 0);
    expect(a.midheaven).toBeCloseTo(0, 6);
    expect(a.ascendant).toBeCloseTo(90, 6);
  });

  it("하강궁과 천저는 언제나 정반대다", () => {
    for (const ramc of [0, 47, 123, 200, 305, 359]) {
      for (const lat of [-40, -10, 0, 25, 51]) {
        const a = computeAngles(ramc, 23.44, lat);
        expect(norm360(a.descendant - a.ascendant)).toBeCloseTo(180, 6);
        expect(norm360(a.imumCoeli - a.midheaven)).toBeCloseTo(180, 6);
      }
    }
  });

  it("상승궁은 언제나 중천보다 앞선다 (동쪽 지평선)", () => {
    for (const ramc of [0, 30, 90, 150, 210, 270, 330]) {
      const a = computeAngles(ramc, 23.44, 37.5665);
      const gap = norm360(a.ascendant - a.midheaven);
      expect(gap, `ramc ${ramc}`).toBeGreaterThan(0);
      expect(gap, `ramc ${ramc}`).toBeLessThan(180);
    }
  });

  it("RAMC 가 하루에 한 바퀴 돌면 상승궁도 한 바퀴 돈다", () => {
    const seen = new Set<number>();
    for (let ramc = 0; ramc < 360; ramc += 5) {
      seen.add(signOfLongitude(computeAngles(ramc, 23.44, 37.5665).ascendant).index);
    }
    expect(seen.size).toBe(12);
  });

  it("극권 판정이 66.5도를 경계로 한다", () => {
    expect(isPolarLatitude(66)).toBe(false);
    expect(isPolarLatitude(67)).toBe(true);
    expect(isPolarLatitude(-70)).toBe(true);
  });
});

describe("하우스", () => {
  const angles = computeAngles(120, 23.44, 37.5665);

  it("홀사인은 상승궁이 든 별자리의 0도에서 시작한다", () => {
    const houses = computeHouses(angles, "whole");
    expect(houses.cusps[0]!.longitude).toBe(signOfLongitude(angles.ascendant).startDegree);
    houses.cusps.forEach((c, i) => {
      expect(c.house).toBe(i + 1);
      expect(c.longitude % 30).toBe(0);
    });
  });

  it("이퀄은 상승궁 각도에서 정확히 30도씩 간다", () => {
    const houses = computeHouses(angles, "equal");
    expect(houses.cusps[0]!.longitude).toBeCloseTo(angles.ascendant, 9);
    houses.cusps.forEach((c, i) => {
      expect(c.longitude).toBeCloseTo(norm360(angles.ascendant + i * 30), 9);
    });
  });

  it("두 체계 모두 12칸이 원을 빈틈없이 덮는다", () => {
    for (const system of ["whole", "equal"] as const) {
      const houses = computeHouses(angles, system);
      for (let lon = 0; lon < 360; lon += 0.5) {
        const h = houseOfLongitude(houses, lon);
        expect(h, `${system} @ ${lon}`).toBeGreaterThanOrEqual(1);
        expect(h, `${system} @ ${lon}`).toBeLessThanOrEqual(12);
      }
    }
  });

  it("상승궁 자신은 1하우스에 든다", () => {
    for (const system of ["whole", "equal"] as const) {
      expect(houseOfLongitude(computeHouses(angles, system), angles.ascendant)).toBe(1);
    }
  });

  it("플라시두스는 12개 커스프를 만들고 상승궁을 1하우스에 둔다", () => {
    const houses = computeHouses(angles, "placidus", {
      ramcDeg: 120,
      obliquityDeg: 23.44,
      latitudeDeg: 37.5665,
    });
    expect(houses.system).toBe("placidus");
    expect(houses.fallback).toBeNull();
    expect(houses.cusps).toHaveLength(12);
    expect(houses.cusps[0]!.longitude).toBeCloseTo(angles.ascendant, 6);
    expect(houseOfLongitude(houses, angles.ascendant)).toBe(1);
    houses.cusps.forEach((c) => {
      expect(c.longitude).toBeGreaterThanOrEqual(0);
      expect(c.longitude).toBeLessThan(360);
    });
  });

  it("극권에서 플라시두스는 이퀄로 폴백한다", () => {
    const polarAngles = computeAngles(120, 23.44, 69);
    const houses = computeHouses(polarAngles, "placidus", {
      ramcDeg: 120,
      obliquityDeg: 23.44,
      latitudeDeg: 69,
    });
    expect(houses.fallback).toBe("equal");
    expect(houses.cusps[0]!.longitude).toBeCloseTo(polarAngles.ascendant, 9);
  });
});

describe("각(aspect)", () => {
  it("정확히 맞는 각을 잡아낸다", () => {
    const found = computeAspects([
      { key: "sun", longitude: 0 },
      { key: "moon", longitude: 120 },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]!.def.key).toBe("trine");
    expect(found[0]!.orb).toBeCloseTo(0, 9);
    expect(found[0]!.strength).toBeCloseTo(1, 9);
  });

  it("허용 오차를 넘으면 잡지 않는다", () => {
    // 삼각 기본 오차 6도 + 해·달 보너스 2도 = 8도
    expect(computeAspects([
      { key: "sun", longitude: 0 },
      { key: "moon", longitude: 127.9 },
    ])).toHaveLength(1);
    expect(computeAspects([
      { key: "sun", longitude: 0 },
      { key: "moon", longitude: 128.5 },
    ])).toHaveLength(0);
  });

  it("해·달이 끼지 않으면 오차가 좁다 (보너스 2도 없음)", () => {
    // 삼각 기본 오차 6도 — 126도까지만 맺힌다.
    expect(computeAspects([
      { key: "mars", longitude: 0 },
      { key: "saturn", longitude: 125.5 },
    ])).toHaveLength(1);
    expect(computeAspects([
      { key: "mars", longitude: 0 },
      { key: "saturn", longitude: 126.5 },
    ])).toHaveLength(0);
    // 같은 각도라도 해·달이 끼면 맺힌다.
    expect(computeAspects([
      { key: "sun", longitude: 0 },
      { key: "saturn", longitude: 126.5 },
    ])).toHaveLength(1);
  });

  it("한 쌍은 최대 하나의 각만 맺는다", () => {
    const chart = computeChart(BASE);
    const pairs = chart.aspects.map((a) => [a.a, a.b].sort().join("-"));
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("오차가 작은 것부터 정렬된다", () => {
    const chart = computeChart(BASE);
    for (let i = 1; i < chart.aspects.length; i += 1) {
      expect(chart.aspects[i]!.orb).toBeGreaterThanOrEqual(chart.aspects[i - 1]!.orb);
    }
  });

  it("모든 각 정의의 각도가 서로 겹치지 않는다", () => {
    const angles = ASPECTS.map((a) => a.angle);
    expect(new Set(angles).size).toBe(ASPECTS.length);
  });
});

describe("출생 차트", () => {
  const chart = computeChart(BASE);

  it("문화적 해석 계층으로 태깅된다", () => {
    expect(chart.tier).toBe("cultural");
    expect(chart.engine).toBe("astro");
  });

  it("10천체를 모두 낸다", () => {
    expect(chart.planets).toHaveLength(PLANETS.length);
    expect(new Set(chart.planets.map((p) => p.key)).size).toBe(10);
  });

  it("별자리 안 도수는 0 이상 30 미만이다", () => {
    chart.planets.forEach((p) => {
      expect(p.degreeInSign, p.key).toBeGreaterThanOrEqual(0);
      expect(p.degreeInSign, p.key).toBeLessThan(30);
      expect(p.sign.startDegree + p.degreeInSign).toBeCloseTo(p.longitude, 9);
    });
  });

  it("해·달·상승궁을 따로 뽑아 준다", () => {
    expect(chart.bigThree.sun).toEqual(chart.planets.find((p) => p.key === "sun")!.sign);
    expect(chart.bigThree.moon).toEqual(chart.planets.find((p) => p.key === "moon")!.sign);
    expect(chart.bigThree.rising).toEqual(signOfLongitude(chart.angles!.ascendant));
  });

  it("모든 천체가 하우스에 배정된다", () => {
    chart.planets.forEach((p) => {
      expect(p.house, p.key).toBeGreaterThanOrEqual(1);
      expect(p.house, p.key).toBeLessThanOrEqual(12);
    });
  });

  it("표시 문자열이 별자리와 도분을 담는다", () => {
    const sun = chart.planets.find((p) => p.key === "sun")!;
    expect(formatPosition(sun)).toContain(sun.sign.ko);
    expect(formatPosition(sun)).toMatch(/\d+°\d{2}′/);
  });

  it("같은 입력은 같은 결과를 낸다", () => {
    expect(JSON.stringify(computeChart(BASE))).toBe(JSON.stringify(computeChart(BASE)));
  });

  it("결과가 동결되어 있다", () => {
    expect(Object.isFrozen(chart)).toBe(true);
    expect(Object.isFrozen(chart.planets)).toBe(true);
  });
});

describe("시각 미상", () => {
  const noTime = computeChart({ date: BASE.date, place: SEOUL });

  it("상승궁·중천·하우스를 내지 않는다", () => {
    expect(noTime.angles).toBeNull();
    expect(noTime.houses).toBeNull();
    expect(noTime.bigThree.rising).toBeNull();
    noTime.planets.forEach((p) => expect(p.house, p.key).toBeNull());
  });

  it("천체 위치는 그대로 낸다", () => {
    expect(noTime.planets).toHaveLength(10);
    expect(noTime.bigThree.sun.ko).toBeTruthy();
  });

  it("달이 별자리 경계 근처면 애매하다고 알린다", () => {
    // 정오 기준이라 달은 최대 ±6.5도 어긋난다.
    const moon = noTime.planets.find((p) => p.key === "moon")!;
    const nearEdge = moon.degreeInSign < 7 || moon.degreeInSign > 23;
    expect(noTime.boundary.moonSignAmbiguous).toBe(nearEdge);
  });
});

describe("입력 검증과 경계", () => {
  it("잘못된 입력은 사주 엔진과 같은 오류를 던진다", () => {
    expect(() => computeChart({ date: { year: 1800, month: 1, day: 1 } })).toThrow(
      BirthInputError,
    );
  });

  it("극지 출생은 플래그로 알린다", () => {
    const tromso = computeChart({
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30 },
      place: { lat: 69.6492, lng: 18.9553, timeZone: "Europe/Oslo" },
    });
    expect(tromso.boundary.polarLatitude).toBe(true);
    const polarPlacidus = computeChart(
      {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30 },
        place: { lat: 69.6492, lng: 18.9553, timeZone: "Europe/Oslo" },
      },
      { houseSystem: "placidus" },
    );
    expect(polarPlacidus.boundary.houseFallback).toBe(true);
  });

  it("출생지가 없으면 검증된 기본 장소를 사용한다", () => {
    const fallback = computeChart({ date: BASE.date, time: BASE.time });
    expect(fallback.birth.place.lat).toBeTypeOf("number");
    expect(fallback.houses).not.toBeNull();
  });

  it("서머타임 이력이 사주 엔진과 같게 반영된다", () => {
    const dst = computeChart({
      date: { year: 1988, month: 7, day: 15 },
      time: { hour: 12, minute: 0 },
      place: SEOUL,
    });
    expect(dst.time.utcOffsetMinutes).toBe(600);
    expect(dst.time.isDST).toBe(true);
  });

  it("음력 입력을 양력으로 옮겨 계산한다", () => {
    const viaLunar = computeChart({
      date: { year: 1956, month: 1, day: 21 },
      calendar: "lunar",
      time: { hour: 10, minute: 0 },
      place: SEOUL,
    });
    const viaSolar = computeChart({
      date: { year: 1956, month: 3, day: 3 },
      time: { hour: 10, minute: 0 },
      place: SEOUL,
    });
    expect(viaLunar.planets.map((p) => p.longitude)).toEqual(
      viaSolar.planets.map((p) => p.longitude),
    );
  });

  it("하우스 체계를 옵션으로 고를 수 있다", () => {
    expect(computeChart(BASE, { houseSystem: "equal" }).houses!.system).toBe("equal");
    expect(computeChart(BASE).houses!.system).toBe("whole");
  });
});
