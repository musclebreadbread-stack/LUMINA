/**
 * lunar-javascript 는 타입 선언을 제공하지 않는다.
 * 교차검증 테스트에서 실제로 쓰는 표면만 최소한으로 선언한다.
 */
declare module "lunar-javascript" {
  export interface EightChar {
    setSect(sect: 1 | 2): void;
    getSect(): number;
    /** 연주 간지 (한자). 입춘 기준. */
    getYear(): string;
    /** 월주 간지 (한자). 절입 기준. */
    getMonth(): string;
    /** 일주 간지 (한자). sect 1 = 야자시론, sect 2 = 자정론. */
    getDay(): string;
    /** 시주 간지 (한자) */
    getTime(): string;
  }

  export interface LunarDateTime {
    getEightChar(): EightChar;
    getJieQiTable(): Record<string, SolarDateTime>;
    getYearInGanZhiByLiChun(): string;
    getDayInGanZhi(): string;
  }

  export interface SolarDateTime {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getLunar(): LunarDateTime;
    toYmdHms(): string;
  }

  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarDateTime;
  };
}
