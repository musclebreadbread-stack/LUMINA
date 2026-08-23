import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { gregorianToJDN } from "@engine/shared/time";
import { dayPillarFromJDN, pillarLabel } from "@engine/saju/pillars";

/**
 * 일주는 시각·타임존이 개입하지 않는 JDN 60주기다.
 * 독립 구현체가 제공하는 일진과 지원 범위 전체를 대조해 날짜 경계를 고정한다.
 */
describe("daily pillar exhaustive oracle", () => {
  it("matches lunar-javascript for every day from 1900 through 2100", () => {
    const mismatches: string[] = [];
    let count = 0;

    for (let year = 1900; year <= 2100; year += 1) {
      const start = Date.UTC(year, 0, 1);
      const end = Date.UTC(year + 1, 0, 1);
      for (let time = start; time < end; time += 86_400_000) {
        const date = new Date(time);
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const expected = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar().getDayInGanZhi();
        const actual = pillarLabel(dayPillarFromJDN(gregorianToJDN(year, month, day)), "hanja");
        count += 1;
        if (expected !== actual && mismatches.length < 10) {
          mismatches.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}: ${expected} !== ${actual}`);
        }
      }
    }

    expect(count).toBe(73_414);
    expect(mismatches).toEqual([]);
  }, 30_000);
});
