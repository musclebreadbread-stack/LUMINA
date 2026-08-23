import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { SOLAR_TERMS } from "@engine/saju/constants";
import {
  allTermsOfSajuYear,
  ipchunOf,
  majorTermsOfSajuYear,
  monthBracketOf,
  sajuYearOf,
} from "@engine/saju/solarTerms";

const KST = "Asia/Seoul";

function kst(instant: Date): DateTime {
  return DateTime.fromJSDate(instant, { zone: KST });
}

/**
 * 공개 만세력·천문 자료는 절기를 분 단위로만 표기하고 초 자리 처리(버림/반올림)가
 * 자료마다 다르다. 그래서 여기서는 계산값을 초 단위 회귀 고정값으로 못박아 두고,
 * 널리 통용되는 분 단위 표기와 1분 이내로 일치하는지만 확인한다.
 * 절대 정확도 검증은 아래 "독립 구현체 대조" 테스트가 맡는다.
 */
function minutesFrom(instant: Date, kstText: string): number {
  const target = DateTime.fromFormat(kstText, "yyyy-MM-dd HH:mm", { zone: KST });
  return Math.abs(instant.getTime() - target.toMillis()) / 60_000;
}

describe("절기 절입 시각 — 회귀 고정값 및 공개 표기 대조", () => {
  it("2024년 입춘: 2월 4일 17시 26분 49초 (KST), 공개 표기 17:27과 1분 이내", () => {
    expect(kst(ipchunOf(2024)).toFormat("yyyy-MM-dd HH:mm:ss")).toBe("2024-02-04 17:26:49");
    expect(minutesFrom(ipchunOf(2024), "2024-02-04 17:27")).toBeLessThanOrEqual(1);
  });

  it("2023년 동지: 12월 22일 12시 27분 34초 (KST), 공개 표기 12:27과 1분 이내", () => {
    const dongji = allTermsOfSajuYear(2023).find((t) => t.def.ko === "동지");
    expect(dongji).toBeDefined();
    expect(kst(dongji!.instant).toFormat("yyyy-MM-dd HH:mm:ss")).toBe("2023-12-22 12:27:34");
    expect(minutesFrom(dongji!.instant, "2023-12-22 12:27")).toBeLessThanOrEqual(1);
  });

  it("입춘은 항상 2월 3~5일에 든다 (1901~2099)", () => {
    for (let year = 1901; year <= 2099; year += 7) {
      const t = kst(ipchunOf(year));
      expect(t.month, `${year}`).toBe(2);
      expect(t.day, `${year}`).toBeGreaterThanOrEqual(3);
      expect(t.day, `${year}`).toBeLessThanOrEqual(5);
    }
  });
});

describe("절기 절입 시각 — 독립 구현체(lunar-javascript) 대조", () => {
  /** 오라클 테이블의 병기 키를 한자 이름으로 정규화한다. */
  const ALIAS: Record<string, string> = {
    DA_XUE: "大雪", DONG_ZHI: "冬至", XIAO_HAN: "小寒",
    DA_HAN: "大寒", LI_CHUN: "立春", YU_SHUI: "雨水",
  };

  /** 우리 한자 표기(정자)를 오라클의 간체 표기로 옮긴다. */
  const TO_ORACLE: Record<string, string> = {
    立春: "立春", 雨水: "雨水", 驚蟄: "惊蛰", 春分: "春分",
    淸明: "清明", 穀雨: "谷雨", 立夏: "立夏", 小滿: "小满",
    芒種: "芒种", 夏至: "夏至", 小暑: "小暑", 大暑: "大暑",
    立秋: "立秋", 處暑: "处暑", 白露: "白露", 秋分: "秋分",
    寒露: "寒露", 霜降: "霜降", 立冬: "立冬", 小雪: "小雪",
    大雪: "大雪", 冬至: "冬至", 小寒: "小寒", 大寒: "大寒",
  };

  function oracleTerms(gregorianYear: number): { name: string; date: Date }[] {
    const table = Solar.fromYmdHms(gregorianYear, 6, 1, 12, 0, 0).getLunar().getJieQiTable();
    return Object.entries(table).map(([key, solar]) => ({
      name: ALIAS[key] ?? key,
      // 오라클 값은 중국 표준시(UTC+8) 기준이다.
      date: DateTime.fromObject(
        {
          year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(),
          hour: solar.getHour(), minute: solar.getMinute(), second: solar.getSecond(),
        },
        { zone: "Etc/GMT-8" },
      ).toJSDate(),
    }));
  }

  const YEARS = [1905, 1937, 1960, 1984, 2001, 2024, 2050, 2077];

  it(`${YEARS.length}개 연도 × 24절기를 90초 이내 오차로 재현한다`, () => {
    const failures: string[] = [];
    let compared = 0;

    for (const year of YEARS) {
      const oracle = oracleTerms(year);
      for (const term of allTermsOfSajuYear(year)) {
        const oracleName = TO_ORACLE[term.def.hanja];
        const candidates = oracle.filter((o) => o.name === oracleName);
        // 같은 이름이 여러 해에 걸쳐 나오므로 가장 가까운 것을 고른다.
        const nearest = candidates.reduce<{ date: Date; diff: number } | null>((best, o) => {
          const diff = Math.abs(o.date.getTime() - term.instant.getTime());
          return !best || diff < best.diff ? { date: o.date, diff } : best;
        }, null);

        if (!nearest) continue;
        compared += 1;
        const diffSeconds = nearest.diff / 1000;
        if (diffSeconds > 90) {
          failures.push(
            `${year} ${term.def.ko}: ours=${term.instant.toISOString()} oracle=${nearest.date.toISOString()} Δ=${diffSeconds.toFixed(0)}s`,
          );
        }
      }
    }

    expect(compared).toBeGreaterThanOrEqual(YEARS.length * 24 - 8);
    expect(failures).toEqual([]);
  });
});

describe("절기 시퀀스 정합성", () => {
  it("한 사주년의 24절기는 시간순으로 엄격히 증가한다", () => {
    for (const year of [1930, 1975, 2024, 2088]) {
      const terms = allTermsOfSajuYear(year);
      expect(terms).toHaveLength(24);
      for (let i = 1; i < terms.length; i += 1) {
        expect(
          terms[i]!.instant.getTime(),
          `${year} ${terms[i]!.def.ko}`,
        ).toBeGreaterThan(terms[i - 1]!.instant.getTime());
      }
    }
  });

  it("연속한 절(節)의 간격은 29~32일이다", () => {
    for (const year of [1910, 1999, 2045]) {
      const majors = majorTermsOfSajuYear(year);
      expect(majors).toHaveLength(12);
      for (let i = 1; i < majors.length; i += 1) {
        const days =
          (majors[i]!.instant.getTime() - majors[i - 1]!.instant.getTime()) / 86_400_000;
        expect(days).toBeGreaterThan(29);
        expect(days).toBeLessThan(32);
      }
    }
  });

  it("사주년의 첫 절은 입춘이고 마지막 절은 소한이다", () => {
    const majors = majorTermsOfSajuYear(2024);
    expect(majors[0]!.def.ko).toBe("입춘");
    expect(majors[11]!.def.ko).toBe("소한");
    // 소한은 다음 그레고리력 연도 1월에 든다.
    expect(kst(majors[11]!.instant).year).toBe(2025);
    expect(kst(majors[11]!.instant).month).toBe(1);
  });
});

describe("사주년 판정", () => {
  it("입춘 직전은 전년도, 입춘 순간부터는 당해년도다", () => {
    const ipchun2024 = ipchunOf(2024);
    expect(sajuYearOf(new Date(ipchun2024.getTime() - 1))).toBe(2023);
    expect(sajuYearOf(ipchun2024)).toBe(2024);
    expect(sajuYearOf(new Date(ipchun2024.getTime() + 1))).toBe(2024);
  });

  it("1월 1일은 언제나 전년도 사주년에 속한다", () => {
    for (const year of [1920, 1980, 2024, 2090]) {
      expect(sajuYearOf(new Date(Date.UTC(year, 0, 1, 0, 0, 0)))).toBe(year - 1);
    }
  });

  it("12월 31일은 언제나 당해년도 사주년에 속한다", () => {
    for (const year of [1920, 1980, 2024, 2090]) {
      expect(sajuYearOf(new Date(Date.UTC(year, 11, 31, 12, 0, 0)))).toBe(year);
    }
  });
});

describe("월 구간 판정 (좌폐우개)", () => {
  it("절입 순간은 새 달에 속하고, 1ms 전은 이전 달에 속한다", () => {
    const majors = majorTermsOfSajuYear(2024);
    for (let i = 1; i < majors.length; i += 1) {
      const boundary = majors[i]!.instant;
      expect(monthBracketOf(boundary).monthOrdinal).toBe(i);
      expect(monthBracketOf(new Date(boundary.getTime() - 1)).monthOrdinal).toBe(i - 1);
    }
  });

  it("모든 절기 이름이 24개 정의와 일치한다", () => {
    const names = allTermsOfSajuYear(2024).map((t) => t.def.ko);
    expect(names).toEqual(SOLAR_TERMS.map((t) => t.ko));
  });

  it("동일 입력에 대해 캐시가 같은 객체를 돌려준다 (결정론성)", () => {
    expect(majorTermsOfSajuYear(2024)).toBe(majorTermsOfSajuYear(2024));
    expect(ipchunOf(2024).getTime()).toBe(ipchunOf(2024).getTime());
  });
});
