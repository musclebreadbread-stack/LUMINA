import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 norms.json에는 groups가 없어 연령·성별 규준 채택 분기를 실제 데이터로는 검증할 수 없다 — 합성 데이터로 대체한다.
function percentileTable(mean: number) {
  return [
    { percentile: 1, rawSum: 10 },
    { percentile: 50, rawSum: Math.round(mean) },
    { percentile: 99, rawSum: 50 },
  ];
}

function factorData(mean: number, sd: number) {
  return {
    mean,
    sd,
    percentileTable: percentileTable(mean),
    alpha: 0.85,
    itemCount: 10 as const,
  };
}

const MOCK_FACTORS = {
  extraversion: factorData(30, 8),
  agreeableness: factorData(32, 7),
  conscientiousness: factorData(31, 7),
  emotionalStability: factorData(28, 8),
  intellect: factorData(33, 6),
};

const MOCK_NORMS = {
  version: 1 as const,
  source: { name: "mock", version: "1", url: "https://example.test", licenseNote: "mock" },
  sampleSize: 200_000,
  factors: MOCK_FACTORS,
  groups: {
    "25-34:female": {
      sampleSize: 50,
      factors: MOCK_FACTORS,
    },
    "25-34:male": {
      sampleSize: 1, // 표본 2 미만 — 그룹 규준을 채택하지 않는 분기를 검증한다.
      factors: MOCK_FACTORS,
    },
  },
};

vi.mock("../data/norms.json", () => ({ default: MOCK_NORMS }));

describe("BigFive 규준 — 연령·성별 그룹 채택 분기", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("연령·성별이 모두 유효하고 표본이 충분하면 그룹 규준을 사용한다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("extraversion", 30, { age: 28, gender: "female" });
    expect(norm?.normGroup).toBe("age-gender");
    expect(norm?.sampleSize).toBe(50);
  });

  it("표본 크기가 2 미만인 그룹은 채택하지 않고 전체 표본으로 대체된다", async () => {
    const { normScoreFor } = await import("../norms");
    const norm = normScoreFor("extraversion", 30, { age: 28, gender: "male" });
    expect(norm?.normGroup).toBe("all");
  });

  it("normDataFor는 요청한 요인의 규준 데이터를 반환한다", async () => {
    const { normDataFor } = await import("../norms");
    expect(normDataFor("intellect").mean).toBe(33);
  });

  // 이 테스트는 norms.json 모킹을 재정의하므로 반드시 마지막에 실행되어야 다른 테스트에 영향을 주지 않는다.
  it("표준편차가 0 이하인 규준은 null을 반환한다", async () => {
    vi.doMock("../data/norms.json", () => ({
      default: {
        ...MOCK_NORMS,
        factors: { ...MOCK_FACTORS, extraversion: factorData(30, 0) },
      },
    }));
    const { normScoreFor } = await import("../norms");
    expect(normScoreFor("extraversion", 30)).toBeNull();
  });
});
