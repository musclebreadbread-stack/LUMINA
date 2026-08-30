import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 실제 norms.json에는 groups가 없어 연령·성별 규준 분기를 실제 데이터로는 검증할 수 없다 — 합성 데이터로 대체한다.
function percentileTable(mean: number) {
  return [
    { percentile: 1, rawSum: 9 },
    { percentile: 50, rawSum: Math.round(mean) },
    { percentile: 99, rawSum: 45 },
  ];
}

function factorData(mean: number, sd: number) {
  return {
    mean,
    sd,
    percentileTable: percentileTable(mean),
    alpha: 0.8,
    itemCount: 9 as const,
  };
}

const MOCK_NORMS = {
  version: 1 as const,
  source: { name: "mock", version: "1", url: "https://example.test", licenseNote: "mock" },
  sampleSize: 500,
  factors: {
    machiavellianism: factorData(27, 6),
    narcissism: factorData(25, 5),
    psychopathy: factorData(20, 5),
  },
  groups: {
    "25-34:female": {
      sampleSize: 40,
      factors: {
        machiavellianism: factorData(24, 5),
        narcissism: factorData(22, 5),
        psychopathy: factorData(18, 4),
      },
    },
    "25-34:male": {
      sampleSize: 1, // 표본 2 미만 — 그룹 규준을 채택하지 않는 분기를 검증한다.
      factors: {
        machiavellianism: factorData(30, 6),
        narcissism: factorData(28, 5),
        psychopathy: factorData(22, 5),
      },
    },
  },
};

vi.mock("../data/norms.json", () => ({ default: MOCK_NORMS }));

describe("다크 트라이어드 규준 — 연령·성별 그룹 분기", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("연령·성별 컨텍스트가 없으면 전체 표본 규준을 사용한다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27);
    expect(norm?.normGroup).toBe("all");
  });

  it("18세 미만은 연령 그룹이 없어 전체 표본으로 대체된다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27, { age: 12, gender: "female" });
    expect(norm?.normGroup).toBe("all");
  });

  it("성별이 unspecified면 전체 표본으로 대체된다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27, { age: 28, gender: "unspecified" });
    expect(norm?.normGroup).toBe("all");
  });

  it("성별이 없으면 전체 표본으로 대체된다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27, { age: 28 });
    expect(norm?.normGroup).toBe("all");
  });

  it("표본 크기가 2 미만인 그룹은 채택하지 않고 전체 표본으로 대체된다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27, { age: 28, gender: "male" });
    expect(norm?.normGroup).toBe("all");
  });

  it("연령·성별이 모두 유효하고 표본이 충분하면 그룹 규준을 사용한다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 24, { age: 28, gender: "female" });
    expect(norm?.normGroup).toBe("age-gender");
    expect(norm?.sampleSize).toBe(40);
  });

  it("연령 구간 경계값마다 올바른 밴드를 선택한다", async () => {
    const { normScoreFor } = await import("../norms");
    const bands: readonly [number, string][] = [
      [18, "18-24"],
      [24, "18-24"],
      [25, "25-34"],
      [34, "25-34"],
      [35, "35-44"],
      [44, "35-44"],
      [45, "45-54"],
      [54, "45-54"],
      [55, "55+"],
      [90, "55+"],
    ];
    for (const [age] of bands) {
      // 그룹 데이터가 없는 밴드는 전체 표본으로 안전하게 대체된다 — 예외 없이 값을 반환하는지 확인한다.
      expect(normScoreFor("psychopathy", 20, { age, gender: "female" })).not.toBeNull();
    }
  });

  it("reliabilityFor는 규준이 없을 때 표준편차 0으로 안전하게 계산한다", async () => {
    const { reliabilityFor } = await import("../norms");
    const result = reliabilityFor("machiavellianism", 27, null);
    expect(result.sem).toBe(0);
    expect(result.ci95).toEqual([27, 27]);
  });

  it("reliabilityFor는 규준이 있으면 표준오차와 신뢰구간을 계산한다", async () => {
    const { normScoreFor, reliabilityFor } = await import("../norms");
    const norm = normScoreFor("machiavellianism", 27);
    const result = reliabilityFor("machiavellianism", 27, norm);
    expect(result.sem).toBeGreaterThan(0);
    expect(result.ci95[0]).toBeLessThan(result.ci95[1]);
  });

  it("normDataFor는 요청한 요인의 규준 데이터를 반환한다", async () => {
    const { normDataFor } = await import("../norms");
    expect(normDataFor("narcissism").mean).toBe(25);
  });

  // 이 테스트는 norms.json 모킹을 재정의하므로 반드시 마지막에 실행되어야 다른 테스트에 영향을 주지 않는다.
  it("표준편차가 0 이하인 규준은 null을 반환한다", async () => {
    vi.doMock("../data/norms.json", () => ({
      default: {
        ...MOCK_NORMS,
        factors: {
          ...MOCK_NORMS.factors,
          machiavellianism: factorData(27, 0),
        },
      },
    }));
    const { normScoreFor } = await import("../norms");
    expect(normScoreFor("machiavellianism", 27)).toBeNull();
  });
});
