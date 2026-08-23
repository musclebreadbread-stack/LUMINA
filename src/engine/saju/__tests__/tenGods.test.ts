import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { TEN_GODS, branchAt, stemAt } from "@engine/saju/constants";
import { tenGodOf, tenGodOfBranch } from "@engine/saju/tenGods";
import { computeSaju } from "@engine/saju";
import { ORACLE_PLACE, buildSajuCases } from "./fixtures/cases";

describe("천간 십신 판정", () => {
  it("갑(甲) 일간 기준 10천간의 십신이 명리 정석과 일치한다", () => {
    const expected = [
      "비견", // 甲
      "겁재", // 乙
      "식신", // 丙
      "상관", // 丁
      "편재", // 戊
      "정재", // 己
      "편관", // 庚
      "정관", // 辛
      "편인", // 壬
      "정인", // 癸
    ];
    expected.forEach((god, stem) => {
      expect(tenGodOf(0, stem), stemAt(stem).hanja).toBe(god);
    });
  });

  it("계(癸) 일간 기준 10천간의 십신이 명리 정석과 일치한다", () => {
    const expected = [
      "상관", // 甲 — 癸(음수)가 생하는 木, 음양 다름
      "식신", // 乙
      "정재", // 丙 — 癸가 극하는 火, 음양 다름
      "편재", // 丁
      "정관", // 戊 — 癸를 극하는 土, 음양 다름
      "편관", // 己
      "정인", // 庚 — 癸를 생하는 金, 음양 다름
      "편인", // 辛
      "겁재", // 壬
      "비견", // 癸
    ];
    expected.forEach((god, stem) => {
      expect(tenGodOf(9, stem), stemAt(stem).hanja).toBe(god);
    });
  });

  it("모든 일간에서 10가지 십신이 정확히 한 번씩 나온다", () => {
    for (let dayStem = 0; dayStem < 10; dayStem += 1) {
      const gods = Array.from({ length: 10 }, (_, s) => tenGodOf(dayStem, s));
      expect(new Set(gods).size, `dayStem ${dayStem}`).toBe(10);
      expect([...gods].sort()).toEqual([...TEN_GODS].sort());
    }
  });

  it("일간 자신은 언제나 비견이다", () => {
    for (let s = 0; s < 10; s += 1) expect(tenGodOf(s, s)).toBe("비견");
  });
});

describe("지지 십신 — 지장간 정기 기준", () => {
  it("갑 일간 기준 자(子)는 정인이다 (子의 정기는 癸)", () => {
    expect(tenGodOfBranch(0, 0)).toBe("정인");
  });

  it("갑 일간 기준 해(亥)는 편인이다 (亥의 정기는 壬)", () => {
    expect(tenGodOfBranch(0, 11)).toBe("편인");
  });

  it("갑 일간 기준 오(午)는 상관, 사(巳)는 식신이다", () => {
    expect(tenGodOfBranch(0, 6)).toBe("상관"); // 午의 정기 丁
    expect(tenGodOfBranch(0, 5)).toBe("식신"); // 巳의 정기 丙
  });

  it("지지 십신은 정기 천간의 십신과 항상 같다", () => {
    for (let dayStem = 0; dayStem < 10; dayStem += 1) {
      for (let branch = 0; branch < 12; branch += 1) {
        expect(tenGodOfBranch(dayStem, branch)).toBe(
          tenGodOf(dayStem, branchAt(branch).principalStem),
        );
      }
    }
  });
});

describe("원국 십신 차트", () => {
  const result = computeSaju(
    {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30 },
      place: ORACLE_PLACE,
    },
    { applyTrueSolarTime: false },
  );

  it("일주의 천간 십신은 일간 자신이므로 null 이다", () => {
    expect(result.tenGods.day.stem).toBeNull();
    expect(result.tenGods.year.stem).not.toBeNull();
  });

  it("십신 합계가 채점 대상 글자 수와 맞는다 (천간 3 + 지지 4 = 7)", () => {
    const total = Object.values(result.tenGods.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(7);
  });

  it("지장간 십신이 지장간 개수만큼 산출된다", () => {
    for (const p of [result.tenGods.year, result.tenGods.month, result.tenGods.day]) {
      expect(p.hidden.length === 2 || p.hidden.length === 3).toBe(true);
      p.hidden.forEach((h) => expect(TEN_GODS).toContain(h.tenGod));
    }
  });

  it("시각 미상이면 시주 십신이 null 이고 합계가 5가 된다", () => {
    const noTime = computeSaju(
      { date: { year: 1990, month: 5, day: 15 }, place: ORACLE_PLACE },
      { applyTrueSolarTime: false },
    );
    expect(noTime.tenGods.hour).toBeNull();
    const total = Object.values(noTime.tenGods.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });
});

describe("십신 교차검증 — lunar-javascript 대비", () => {
  const SAMPLE = buildSajuCases().filter((c) => c.kind === "random").slice(0, 60);

  /** 오라클은 중국어 십신 명칭을 쓴다. 편관은 칠살(七杀)로 표기된다. */
  const SHI_SHEN_KO: Record<string, string> = {
    比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재",
    正财: "정재", 七杀: "편관", 偏官: "편관", 正官: "정관", 偏印: "편인",
    枭神: "편인", 正印: "정인",
  };

  it(`${SAMPLE.length}건에서 연·월·시주 천간 십신이 일치한다`, () => {
    const mismatches: string[] = [];

    for (const c of SAMPLE) {
      const ec = Solar.fromYmdHms(c.year, c.month, c.day, c.hour, c.minute, 0)
        .getLunar()
        .getEightChar() as unknown as {
        setSect(s: 1 | 2): void;
        getYearShiShenGan(): string;
        getMonthShiShenGan(): string;
        getTimeShiShenGan(): string;
      };
      ec.setSect(1);

      const mine = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false, dayBoundaryRule: "zi23" },
      );

      const pairs: readonly (readonly [string, string | null])[] = [
        [ec.getYearShiShenGan(), mine.tenGods.year.stem],
        [ec.getMonthShiShenGan(), mine.tenGods.month.stem],
        [ec.getTimeShiShenGan(), mine.tenGods.hour?.stem ?? null],
      ];
      pairs.forEach(([oracleName, actual], i) => {
        const expected = SHI_SHEN_KO[oracleName];
        if (!expected) {
          mismatches.push(`${c.id} slot ${i}: unmapped oracle name ${oracleName}`);
        } else if (expected !== actual) {
          mismatches.push(`${c.id} slot ${i}: expected ${expected}, got ${actual}`);
        }
      });
    }

    expect(mismatches.slice(0, 10)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });
});
