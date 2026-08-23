import { describe, expect, it } from "vitest";
import { gregorianToJDN } from "@engine/shared/time";
import { BRANCHES, STEMS } from "@engine/saju/constants";
import {
  dayPillarFromJDN,
  hourBranchOf,
  hourPillar,
  makePillar,
  monthPillar,
  pillarFromSexagenary,
  pillarLabel,
  sexagenaryIndex,
  twelveStageOf,
  voidBranchesOf,
  yearPillar,
} from "@engine/saju/pillars";

describe("60갑자 색인", () => {
  it("0~59 왕복 변환이 항등이다", () => {
    for (let i = 0; i < 60; i += 1) {
      const p = pillarFromSexagenary(i);
      expect(sexagenaryIndex(p.stem, p.branch)).toBe(i);
    }
  });

  it("60개 간지 조합이 모두 서로 다르다", () => {
    const labels = new Set(
      Array.from({ length: 60 }, (_, i) => pillarLabel(pillarFromSexagenary(i))),
    );
    expect(labels.size).toBe(60);
  });

  it("갑자=0, 을축=1, 계해=59", () => {
    expect(sexagenaryIndex(0, 0)).toBe(0);
    expect(sexagenaryIndex(1, 1)).toBe(1);
    expect(sexagenaryIndex(9, 11)).toBe(59);
    expect(pillarLabel(pillarFromSexagenary(0), "hanja")).toBe("甲子");
    expect(pillarLabel(pillarFromSexagenary(59), "hanja")).toBe("癸亥");
  });

  it("음양이 어긋난 조합은 오류를 던진다 (갑축 같은 간지는 없다)", () => {
    expect(() => sexagenaryIndex(0, 1)).toThrow(RangeError);
    expect(() => makePillar(2, 3)).toThrow(RangeError);
  });

  it("양간은 양지와만, 음간은 음지와만 결합한다", () => {
    for (let i = 0; i < 60; i += 1) {
      const p = pillarFromSexagenary(i);
      expect(STEMS[p.stem]!.polarity).toBe(BRANCHES[p.branch]!.polarity);
    }
  });
});

describe("연주 (年柱)", () => {
  it("1984년은 갑자년이다", () => {
    expect(pillarLabel(yearPillar(1984), "hanja")).toBe("甲子");
  });

  it("60년 주기로 반복한다", () => {
    for (const year of [1924, 1984, 2044]) {
      expect(yearPillar(year).sexagenary).toBe(0);
    }
  });

  it("알려진 연도의 간지와 일치한다", () => {
    const known: Record<number, string> = {
      1900: "庚子", 1910: "庚戌", 1945: "乙酉", 1948: "戊子",
      1988: "戊辰", 2000: "庚辰", 2024: "甲辰", 2025: "乙巳",
    };
    for (const [year, label] of Object.entries(known)) {
      expect(pillarLabel(yearPillar(Number(year)), "hanja"), `${year}`).toBe(label);
    }
  });
});

describe("월주 (月柱) — 오호둔", () => {
  it("연간별 인월(寅月) 천간이 오호둔 규칙을 따른다", () => {
    // 갑·기년 → 병인, 을·경년 → 무인, 병·신년 → 경인, 정·임년 → 임인, 무·계년 → 갑인
    const expected: Record<number, string> = {
      0: "丙寅", 5: "丙寅", // 갑, 기
      1: "戊寅", 6: "戊寅", // 을, 경
      2: "庚寅", 7: "庚寅", // 병, 신
      3: "壬寅", 8: "壬寅", // 정, 임
      4: "甲寅", 9: "甲寅", // 무, 계
    };
    for (const [yearStem, label] of Object.entries(expected)) {
      expect(pillarLabel(monthPillar(Number(yearStem), 0), "hanja"), `yearStem ${yearStem}`).toBe(
        label,
      );
    }
  });

  it("한 해 12달의 월지가 인묘진사오미신유술해자축 순이다", () => {
    const branches = Array.from({ length: 12 }, (_, i) => monthPillar(0, i).branch);
    expect(branches).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]);
  });

  it("한 해 12달의 월주가 60갑자에서 연속한다", () => {
    for (const yearStem of [0, 3, 7, 9]) {
      for (let i = 1; i < 12; i += 1) {
        const prev = monthPillar(yearStem, i - 1).sexagenary;
        const cur = monthPillar(yearStem, i).sexagenary;
        expect((prev + 1) % 60, `yearStem ${yearStem} month ${i}`).toBe(cur);
      }
    }
  });
});

describe("일주 (日柱) — 율리우스 적일 기준", () => {
  it("1900-01-01은 갑술일이다", () => {
    expect(pillarLabel(dayPillarFromJDN(gregorianToJDN(1900, 1, 1)), "hanja")).toBe("甲戌");
  });

  it("1949-10-01은 갑자일이다", () => {
    expect(pillarLabel(dayPillarFromJDN(gregorianToJDN(1949, 10, 1)), "hanja")).toBe("甲子");
  });

  it("하루가 지나면 60갑자가 정확히 1 증가한다", () => {
    let prev = dayPillarFromJDN(gregorianToJDN(2024, 2, 26)).sexagenary;
    for (let d = 27; d <= 29; d += 1) {
      const cur = dayPillarFromJDN(gregorianToJDN(2024, 2, d)).sexagenary;
      expect((prev + 1) % 60).toBe(cur);
      prev = cur;
    }
    // 윤년 2/29 → 3/1 도 끊기지 않는다.
    expect((prev + 1) % 60).toBe(dayPillarFromJDN(gregorianToJDN(2024, 3, 1)).sexagenary);
  });

  it("60일 뒤에는 같은 간지로 돌아온다", () => {
    const base = gregorianToJDN(1975, 7, 4);
    expect(dayPillarFromJDN(base).sexagenary).toBe(dayPillarFromJDN(base + 60).sexagenary);
    expect(dayPillarFromJDN(base).sexagenary).toBe(dayPillarFromJDN(base - 60).sexagenary);
  });
});

describe("시주 (時柱) — 오서둔", () => {
  it("시지 경계가 23시 자시부터 2시간 단위로 진행한다", () => {
    const expected = [
      [23, 0], [0, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3],
      [7, 4], [8, 4], [9, 5], [10, 5], [11, 6], [12, 6], [13, 7], [14, 7],
      [15, 8], [16, 8], [17, 9], [18, 9], [19, 10], [20, 10], [21, 11], [22, 11],
    ] as const;
    for (const [hour, branch] of expected) {
      expect(hourBranchOf(hour), `hour ${hour}`).toBe(branch);
    }
  });

  it("일간별 자시(子時) 천간이 오서둔 규칙을 따른다", () => {
    // 갑·기일 → 갑자시, 을·경일 → 병자시, 병·신일 → 무자시, 정·임일 → 경자시, 무·계일 → 임자시
    const expected: Record<number, string> = {
      0: "甲子", 5: "甲子",
      1: "丙子", 6: "丙子",
      2: "戊子", 7: "戊子",
      3: "庚子", 8: "庚子",
      4: "壬子", 9: "壬子",
    };
    for (const [dayStem, label] of Object.entries(expected)) {
      expect(pillarLabel(hourPillar(Number(dayStem), 23), "hanja"), `dayStem ${dayStem}`).toBe(
        label,
      );
    }
  });

  it("하루 12시진의 시주가 60갑자에서 연속한다", () => {
    for (const dayStem of [0, 4, 9]) {
      const hours = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
      for (let i = 1; i < hours.length; i += 1) {
        const prev = hourPillar(dayStem, hours[i - 1]!).sexagenary;
        const cur = hourPillar(dayStem, hours[i]!).sexagenary;
        expect((prev + 1) % 60, `dayStem ${dayStem} slot ${i}`).toBe(cur);
      }
    }
  });
});

describe("십이운성", () => {
  it("갑목은 해에서 장생, 인에서 건록, 묘에서 제왕이다", () => {
    expect(twelveStageOf(0, 11)).toBe("장생");
    expect(twelveStageOf(0, 2)).toBe("건록");
    expect(twelveStageOf(0, 3)).toBe("제왕");
  });

  it("을목(음간)은 역행하여 오에서 장생, 묘에서 건록, 인에서 제왕이다", () => {
    expect(twelveStageOf(1, 6)).toBe("장생");
    expect(twelveStageOf(1, 3)).toBe("건록");
    expect(twelveStageOf(1, 2)).toBe("제왕");
  });

  it("모든 천간에 대해 12지지가 12단계를 빠짐없이 한 번씩 가진다", () => {
    for (let stem = 0; stem < 10; stem += 1) {
      const stages = new Set(Array.from({ length: 12 }, (_, b) => twelveStageOf(stem, b)));
      expect(stages.size, `stem ${stem}`).toBe(12);
    }
  });

  it("건록은 언제나 제왕 바로 앞 단계다", () => {
    for (let stem = 0; stem < 10; stem += 1) {
      const stages = Array.from({ length: 12 }, (_, b) => ({ b, s: twelveStageOf(stem, b) }));
      const lu = stages.find((x) => x.s === "건록")!;
      const wang = stages.find((x) => x.s === "제왕")!;
      const step = STEMS[stem]!.polarity === "yang" ? 1 : -1;
      expect((lu.b + step + 12) % 12, `stem ${stem}`).toBe(wang.b);
    }
  });
});

describe("공망 (空亡)", () => {
  it("갑자순의 공망은 술·해다", () => {
    expect(voidBranchesOf(pillarFromSexagenary(0))).toEqual([10, 11]);
    expect(voidBranchesOf(pillarFromSexagenary(9))).toEqual([10, 11]);
  });

  it("갑술순의 공망은 신·유다", () => {
    expect(voidBranchesOf(pillarFromSexagenary(10))).toEqual([8, 9]);
  });

  it("여섯 순(旬) 모두에서 공망 지지는 자기 순에 등장하지 않는다", () => {
    for (let decade = 0; decade < 6; decade += 1) {
      const inSun = new Set(
        Array.from({ length: 10 }, (_, i) => pillarFromSexagenary(decade * 10 + i).branch),
      );
      const [a, b] = voidBranchesOf(pillarFromSexagenary(decade * 10));
      expect(inSun.has(a), `decade ${decade}`).toBe(false);
      expect(inSun.has(b), `decade ${decade}`).toBe(false);
      expect(inSun.size).toBe(10);
    }
  });
});
