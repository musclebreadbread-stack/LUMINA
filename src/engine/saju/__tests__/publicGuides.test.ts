import { describe, expect, it } from "vitest";
import { pillarFromSexagenary, pillarLabel } from "@engine/saju/pillars";
import { branchAt, stemAt } from "@engine/saju/constants";
import {
  ALL_ILJU_PILLARS,
  YEAR_2027_PILLAR,
  adjacentIlju,
  findIljuBySlug,
  iljuGuideFor,
  iljuSlug,
  monthlyPillarTable2027,
  monthlyRelationsFor2027,
  notableMonthlyRelations,
  seollalOf,
  signYearGuideFor,
  stemYearForecast,
} from "@engine/saju/publicGuides";

describe("2027 세운 상수", () => {
  it("정미(丁未)다", () => {
    expect(YEAR_2027_PILLAR.stem).toBe(3);
    expect(YEAR_2027_PILLAR.branch).toBe(7);
    expect(pillarLabel(YEAR_2027_PILLAR, "hanja")).toBe("丁未");
  });
});

describe("stemYearForecast", () => {
  it("10개 천간 모두 값을 낸다", () => {
    for (let i = 0; i < 10; i += 1) {
      const forecast = stemYearForecast(i);
      expect(forecast.stemIndex).toBe(i);
      expect(forecast.stemTenGod).toBeTruthy();
      expect(forecast.branchTenGod).toBeTruthy();
      expect(forecast.stage).toBeTruthy();
    }
  });

  it("정(丁, index 3)은 세운 천간과 같은 오행·같은 음양이라 비견이다", () => {
    expect(stemYearForecast(3).stemTenGod).toBe("비견");
  });
});

describe("signYearGuideFor", () => {
  it("午(index 6, 말띠)는 未와 육합(combination) 관계다", () => {
    const guide = signYearGuideFor(6);
    expect(guide.signBranch).toBe(6);
    expect(guide.yearRelations.some((r) => r.kind === "combination")).toBe(true);
  });

  it("丑(index 1, 소띠)은 未와 충(clash) 관계다", () => {
    const guide = signYearGuideFor(1);
    expect(guide.yearRelations.some((r) => r.kind === "clash")).toBe(true);
  });

  it("未(index 7, 자기 자신)는 이름 붙은 관계가 없다 — 未는 자형(자기 자신과의 형) 그룹에 속하지 않는다", () => {
    // relations.ts의 자기 자신과 맺는 형(punishment) 그룹은 辰·午·酉·亥(4,6,9,11)뿐이다.
    expect(signYearGuideFor(7).yearRelations).toEqual([]);
  });

  it("월별 관계는 12개월 전부를 순서대로 담는다", () => {
    const monthly = monthlyRelationsFor2027(0);
    expect(monthly).toHaveLength(12);
    expect(monthly.map((m) => m.monthOrdinal)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("notableMonthlyRelations는 충·합·삼합이 없는 달을 걸러낸다", () => {
    const monthly = monthlyRelationsFor2027(7);
    const notable = notableMonthlyRelations(monthly);
    expect(notable.length).toBeGreaterThan(0);
    expect(notable.length).toBeLessThanOrEqual(monthly.length);
    for (const entry of notable) {
      expect(entry.relations.length).toBeGreaterThan(0);
      for (const relation of entry.relations) {
        expect(["clash", "combination", "trine"]).toContain(relation.kind);
      }
    }
  });

  it("12지 전부에 대해 예외 없이 계산된다", () => {
    for (let branch = 0; branch < 12; branch += 1) {
      expect(() => signYearGuideFor(branch)).not.toThrow();
    }
  });
});

describe("60갑자 일주 가이드", () => {
  it("60개 전부를 슬러그로 왕복 조회할 수 있다", () => {
    expect(ALL_ILJU_PILLARS).toHaveLength(60);
    const slugs = new Set<string>();
    for (const pillar of ALL_ILJU_PILLARS) {
      const slug = iljuSlug(pillar);
      expect(slugs.has(slug)).toBe(false); // 60개 슬러그가 모두 유일해야 한다
      slugs.add(slug);
      expect(findIljuBySlug(slug)).toEqual(pillar);
    }
    expect(slugs.size).toBe(60);
  });

  it("정미(丁未) 자신의 슬러그는 'ding-wei'다", () => {
    expect(iljuSlug(YEAR_2027_PILLAR)).toBe("ding-wei");
  });

  it("존재하지 않는 슬러그는 null을 반환한다", () => {
    expect(findIljuBySlug("not-a-real-pillar")).toBeNull();
  });

  it("iljuGuideFor는 60개 전부에 대해 예외 없이 계산된다", () => {
    for (const pillar of ALL_ILJU_PILLARS) {
      const guide = iljuGuideFor(pillar);
      expect(guide.pillar).toEqual(pillar);
      expect(guide.slug).toBe(iljuSlug(pillar));
      expect(guide.seatedStage).toBeTruthy();
      expect(guide.yearForecast.stemIndex).toBe(pillar.stem);
    }
  });

  it("adjacentIlju는 60주기로 순환한다", () => {
    const first = ALL_ILJU_PILLARS[0];
    if (!first) throw new Error("fixture missing");
    const { previous, next } = adjacentIlju(first);
    expect(previous.sexagenary).toBe(59);
    expect(next.sexagenary).toBe(1);

    const last = ALL_ILJU_PILLARS[59];
    if (!last) throw new Error("fixture missing");
    expect(adjacentIlju(last).next.sexagenary).toBe(0);
  });

  it("이웃 일주는 항상 원래 일주와 다르다(60갑자 전부 점검)", () => {
    for (const pillar of ALL_ILJU_PILLARS) {
      const { previous, next } = adjacentIlju(pillar);
      expect(previous.sexagenary).not.toBe(pillar.sexagenary);
      expect(next.sexagenary).not.toBe(pillar.sexagenary);
    }
  });
});

describe("monthlyPillarTable2027", () => {
  it("12개월을 절입 시각 순서대로 담는다", () => {
    const table = monthlyPillarTable2027();
    expect(table).toHaveLength(12);
    for (let i = 1; i < table.length; i += 1) {
      const previous = table[i - 1];
      const current = table[i];
      if (!previous || !current) throw new Error("fixture missing");
      expect(current.term.instant.getTime()).toBeGreaterThan(previous.term.instant.getTime());
    }
  });

  it("월주 천간은 정(丁)년 오호둔 규칙을 따른다 — 정임년은 임인월로 시작", () => {
    const table = monthlyPillarTable2027();
    const first = table[0];
    if (!first) throw new Error("fixture missing");
    expect(stemAt(first.pillar.stem).ko).toBe("임");
    expect(branchAt(first.pillar.branch).ko).toBe("인");
  });
});

describe("seollalOf", () => {
  it("2027년 설날은 입춘(2월 4일 근방) 이후인 2월 7일이다 — korean-lunar-calendar 계산값", () => {
    const seollal = seollalOf(2027);
    expect(seollal).toEqual({ year: 2027, month: 2, day: 7 });
  });

  it("양력으로 변환 가능한 연도 범위에서 예외 없이 계산된다", () => {
    expect(() => seollalOf(2020)).not.toThrow();
    expect(() => seollalOf(2030)).not.toThrow();
  });
});

describe("비퇴화 — 60갑자 전부 슬러그가 pillarFromSexagenary와 일관된다", () => {
  it("iljuSlug(pillarFromSexagenary(i))는 i마다 서로 다르다", () => {
    const slugs = Array.from({ length: 60 }, (_, i) => iljuSlug(pillarFromSexagenary(i)));
    expect(new Set(slugs).size).toBe(60);
  });
});
