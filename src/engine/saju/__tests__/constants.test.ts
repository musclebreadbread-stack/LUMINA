import { describe, expect, it } from "vitest";
import {
  BRANCHES,
  CONTROLS,
  ELEMENT_ORDER,
  GENERATES,
  HIDDEN_STEMS,
  LIFE_STAGE_ORIGIN,
  MAJOR_TERMS,
  SOLAR_TERMS,
  STEMS,
  TWELVE_STAGES,
  branchAt,
  hiddenStemsOf,
  monthBranchFromMajorTerm,
  stemAt,
} from "@engine/saju/constants";

describe("천간·지지 테이블", () => {
  it("천간 10개, 지지 12개이며 index 가 배열 위치와 일치한다", () => {
    expect(STEMS).toHaveLength(10);
    expect(BRANCHES).toHaveLength(12);
    STEMS.forEach((s, i) => expect(s.index).toBe(i));
    BRANCHES.forEach((b, i) => expect(b.index).toBe(i));
  });

  it("천간 음양은 짝수=양, 홀수=음으로 교대한다", () => {
    STEMS.forEach((s, i) => expect(s.polarity).toBe(i % 2 === 0 ? "yang" : "yin"));
  });

  it("천간 오행은 목화토금수 순으로 2개씩 배치된다", () => {
    const expected = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
    expect(STEMS.map((s) => s.element)).toEqual(expected);
  });

  it("지지 오행 배치가 인묘=목 … 해자=수 규칙을 따른다", () => {
    const expected = [
      "water", "earth", "wood", "wood", "earth", "fire",
      "fire", "earth", "metal", "metal", "earth", "water",
    ];
    expect(BRANCHES.map((b) => b.element)).toEqual(expected);
  });

  it("지지 정기(正氣)는 지장간 배열의 마지막 원소와 같다", () => {
    BRANCHES.forEach((b) => {
      const hidden = hiddenStemsOf(b.index);
      const last = hidden[hidden.length - 1];
      expect(last?.role).toBe("principal");
      expect(b.principalStem).toBe(last?.stem);
    });
  });

  it("정기의 오행은 지지 자신의 오행과 일치한다", () => {
    BRANCHES.forEach((b) => {
      expect(stemAt(b.principalStem).element).toBe(b.element);
    });
  });

  it("자오사해는 자리 음양과 정기 음양이 어긋난다 (체용 반전)", () => {
    for (const idx of [0, 6, 5, 11]) {
      const b = branchAt(idx);
      expect(stemAt(b.principalStem).polarity).not.toBe(b.polarity);
    }
  });

  it("자오사해를 뺀 나머지 지지는 자리 음양과 정기 음양이 같다", () => {
    for (const idx of [1, 2, 3, 4, 7, 8, 9, 10]) {
      const b = branchAt(idx);
      expect(stemAt(b.principalStem).polarity).toBe(b.polarity);
    }
  });
});

describe("지장간 테이블", () => {
  it("모든 지지의 배분일수 합이 30일이다", () => {
    HIDDEN_STEMS.forEach((hidden, i) => {
      const total = hidden.reduce((sum, h) => sum + h.days, 0);
      expect(total, `branch ${i}`).toBe(30);
    });
  });

  it("역할 순서는 여기 → 중기 → 정기다", () => {
    HIDDEN_STEMS.forEach((hidden) => {
      const roles = hidden.map((h) => h.role);
      expect(roles[0]).toBe("residual");
      expect(roles[roles.length - 1]).toBe("principal");
      if (roles.length === 3) expect(roles[1]).toBe("middle");
      expect(roles.length === 2 || roles.length === 3).toBe(true);
    });
  });

  it("모든 지장간이 유효한 천간을 가리킨다", () => {
    HIDDEN_STEMS.flat().forEach((h) => {
      expect(h.stem).toBeGreaterThanOrEqual(0);
      expect(h.stem).toBeLessThan(10);
    });
  });
});

describe("오행 생극 순환", () => {
  it("상생은 5개 오행을 한 바퀴 도는 순환이다", () => {
    let el = ELEMENT_ORDER[0]!;
    const seen = new Set([el]);
    for (let i = 0; i < 4; i += 1) {
      el = GENERATES[el];
      expect(seen.has(el)).toBe(false);
      seen.add(el);
    }
    expect(GENERATES[el]).toBe(ELEMENT_ORDER[0]);
    expect(seen.size).toBe(5);
  });

  it("상극도 5개 오행을 한 바퀴 도는 순환이다", () => {
    let el = ELEMENT_ORDER[0]!;
    const seen = new Set([el]);
    for (let i = 0; i < 4; i += 1) {
      el = CONTROLS[el];
      expect(seen.has(el)).toBe(false);
      seen.add(el);
    }
    expect(CONTROLS[el]).toBe(ELEMENT_ORDER[0]);
  });

  it("어떤 오행도 자기 자신을 생하거나 극하지 않는다", () => {
    ELEMENT_ORDER.forEach((el) => {
      expect(GENERATES[el]).not.toBe(el);
      expect(CONTROLS[el]).not.toBe(el);
      expect(GENERATES[el]).not.toBe(CONTROLS[el]);
    });
  });
});

describe("24절기 정의", () => {
  it("24개이며 입춘부터 15°씩 증가한다", () => {
    expect(SOLAR_TERMS).toHaveLength(24);
    SOLAR_TERMS.forEach((t, i) => {
      expect(t.longitude).toBe((315 + i * 15) % 360);
      expect(t.index).toBe(i);
    });
  });

  it("절(節)과 중기(中氣)가 교대하며 절은 12개다", () => {
    expect(MAJOR_TERMS).toHaveLength(12);
    SOLAR_TERMS.forEach((t, i) => expect(t.kind).toBe(i % 2 === 0 ? "major" : "minor"));
  });

  it("절 순번 → 월지 매핑이 인월에서 시작해 축월로 끝난다", () => {
    expect(monthBranchFromMajorTerm(0)).toBe(2); // 입춘 → 寅
    expect(monthBranchFromMajorTerm(10)).toBe(0); // 대설 → 子
    expect(monthBranchFromMajorTerm(11)).toBe(1); // 소한 → 丑
    const branches = Array.from({ length: 12 }, (_, i) => monthBranchFromMajorTerm(i));
    expect(new Set(branches).size).toBe(12);
  });
});

describe("십이운성", () => {
  it("12단계이며 이름이 중복되지 않는다", () => {
    expect(TWELVE_STAGES).toHaveLength(12);
    expect(new Set(TWELVE_STAGES).size).toBe(12);
  });

  it("장생 기준 지지가 천간 10개 모두에 정의되어 있다", () => {
    expect(LIFE_STAGE_ORIGIN).toHaveLength(10);
    LIFE_STAGE_ORIGIN.forEach((b) => {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(12);
    });
  });
});

describe("조회 헬퍼", () => {
  it("음수·초과 index 를 12/10 주기로 정규화한다", () => {
    expect(stemAt(-1).index).toBe(9);
    expect(stemAt(10).index).toBe(0);
    expect(branchAt(-1).index).toBe(11);
    expect(branchAt(13).index).toBe(1);
  });
});
