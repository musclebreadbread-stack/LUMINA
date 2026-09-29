import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { DEFAULT_PLACE, type BirthInput } from "@engine/shared/birth";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { isValidCitation } from "@engine/shared/citation";
import { branchRelationsOf } from "@engine/saju/relations";
import { ipchunOf } from "@engine/saju/solarTerms";
import { computeSaju, pillarLabel } from "@engine/saju";
import { tenGodOf, tenGodOfBranch } from "@engine/saju/tenGods";
import { twelveStageOf } from "@engine/saju/pillars";
import { buildYearForecast, type NatalBranchRelation } from "@engine/saju/yearForecast";
import { buildYearForecastExplanations } from "@engine/saju/yearForecastExplanations";

const BASE_BIRTH: BirthInput = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30 },
  place: DEFAULT_PLACE,
  gender: "male",
};

function makeBirthAt(instant: Date): BirthInput {
  const local = DateTime.fromJSDate(instant, { zone: "Asia/Seoul" });
  return {
    date: { year: local.year, month: local.month, day: local.day },
    time: { hour: local.hour, minute: local.minute },
    place: DEFAULT_PLACE,
    gender: "male",
  };
}

function forecastFor(input: BirthInput, dayBoundaryRule: "zi23" | "midnight" = "zi23") {
  const saju = computeSaju(input, { applyTrueSolarTime: false, dayBoundaryRule });
  return { saju, forecast: buildYearForecast(saju) };
}

describe("2027 신년운세 계산 코어", () => {
  it("丁未 세운과 십신·십이운성을 기존 엔진 규칙으로 계산한다", () => {
    const { saju, forecast } = forecastFor(BASE_BIRTH);
    const annual = forecast.annual;

    expect(annual.year).toBe(2027);
    expect(annual.labelHanja).toBe("丁未");
    expect(annual.stemTenGod).toBe(tenGodOf(saju.pillars.day.stem, annual.pillar.stem));
    expect(annual.branchTenGod).toBe(tenGodOfBranch(saju.pillars.day.stem, annual.pillar.branch));
    expect(annual.stage).toBe(twelveStageOf(saju.pillars.day.stem, annual.pillar.branch));
    expect(annual.evidenceRefs.length).toBeGreaterThan(0);
    expect(forecast.expertReviewStatus).toBe("pending");
  });

  it("2027 이외의 연도는 지원하지 않는다고 명시한다", () => {
    const saju = computeSaju(BASE_BIRTH, { applyTrueSolarTime: false });
    expect(() => buildYearForecast(saju, 99)).toThrow(RangeError);
    expect(() => buildYearForecast(saju, 2028)).toThrow(RangeError);
  });

  it("호출자가 전문가 검수 상태를 명시하면 그 값을 그대로 반영한다", () => {
    // buildYearForecast는 환경변수를 읽지 않는 순수 함수로 남는다. 실제 승인 여부는
    // 호출자(isYearForecastExpertReviewApproved())가 판단해 넘긴다.
    const saju = computeSaju(BASE_BIRTH, { applyTrueSolarTime: false });
    expect(buildYearForecast(saju, 2027, { expertReviewStatus: "approved" }).expertReviewStatus).toBe("approved");
    expect(buildYearForecast(saju, 2027, { expertReviewStatus: "pending" }).expertReviewStatus).toBe("pending");
    expect(buildYearForecast(saju, 2027, {}).expertReviewStatus).toBe("pending");
  });

  it("반환한 절기 Date를 변경해도 예보 경계는 유지한다", () => {
    const { forecast } = forecastFor(BASE_BIRTH);
    const expectedStart = forecast.annual.startsAt.getTime();
    const expectedEnd = forecast.annual.endsAt.getTime();

    forecast.annual.startsAt.setTime(0);
    forecast.months[0]!.startsAt.setTime(0);
    forecast.months[0]!.startTerm.instant.setTime(0);

    expect(forecast.annual.startsAt.getTime()).toBe(expectedStart);
    expect(forecast.months[0]!.startsAt.getTime()).toBe(expectedStart);
    expect(forecast.months[0]!.startTerm.instant.getTime()).toBe(expectedStart);
    expect(forecast.months[11]!.endsAt.getTime()).toBe(expectedEnd);
  });

  it("월운 12개가 壬寅부터 癸丑까지 이어지고 각 절입 구간에 맞는다", () => {
    const { forecast } = forecastFor(BASE_BIRTH);
    const labels = forecast.months.map((month) => month.labelHanja);

    expect(labels).toEqual([
      "壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未",
      "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
    ]);
    expect(forecast.months).toHaveLength(12);
    expect(forecast.months[0]?.startsAt.getTime()).toBe(forecast.annual.startsAt.getTime());
    expect(forecast.months[11]?.endsAt.getTime()).toBe(forecast.annual.endsAt.getTime());

    for (let ordinal = 0; ordinal < forecast.months.length; ordinal += 1) {
      const month = forecast.months[ordinal]!;
      expect(month.ordinal).toBe(ordinal);
      expect(month.startsAt.getTime()).toBeLessThan(month.endsAt.getTime());
      expect(month.startTerm.def.ko).toBeTruthy();
      expect(month.endTerm.def.ko).toBeTruthy();
      expect(month.evidenceRefs).toContain("solar-term-boundary");
    }
  });

  it("세운 未와 원국 未 관계는 모든 기존 지지 관계 규칙을 그대로 기록한다", () => {
    const natal = computeSaju(
      {
        date: { year: 2000, month: 1, day: 15 },
        time: { hour: 12, minute: 0 },
        place: DEFAULT_PLACE,
      },
      { applyTrueSolarTime: false },
    );
    expect(natal.pillars.month.branch).toBe(1); // 입춘 전 丑월

    const forecast = buildYearForecast(natal);
    const monthRelations = forecast.natalBranchRelations.filter(
      (item) => item.natalPillar === "month",
    );

    expect(monthRelations.map((item) => item.relation.kind)).toEqual(
      branchRelationsOf(7, natal.pillars.month.branch).map((relation) => relation.kind),
    );
    expect(monthRelations.map((item) => item.relation.kind)).toContain("clash");
    expect(forecast.blocks.find((item) => item.kind === "natal-relations")?.detail.ko).toContain("충");
  });

  it("세운 시작은 2027년 입춘이며 입춘 전후 원국 연주 경계를 보존한다", () => {
    const ipchun = ipchunOf(2027);
    const beforeBirth = makeBirthAt(new Date(ipchun.getTime() - 5 * 60_000));
    const afterBirth = makeBirthAt(new Date(ipchun.getTime() + 5 * 60_000));
    const before = forecastFor(beforeBirth);
    const after = forecastFor(afterBirth);

    expect(before.saju.pillars.year.sexagenary).not.toBe(after.saju.pillars.year.sexagenary);
    expect(pillarLabel(before.saju.pillars.year, "hanja")).toBe("丙午");
    expect(pillarLabel(after.saju.pillars.year, "hanja")).toBe("丁未");
    expect(before.forecast.annual.startsAt.getTime()).toBe(ipchun.getTime());
    expect(after.forecast.annual.startsAt.getTime()).toBe(ipchun.getTime());
  });

  it("출생 시각 미상은 시주와 대운 겹침을 확정하지 않는다", () => {
    const { saju, forecast } = forecastFor({
      date: { year: 1990, month: 5, day: 15 },
      place: DEFAULT_PLACE,
      gender: "male",
    });

    expect(saju.time.timeUnknown).toBe(true);
    expect(forecast.birthContext.hasHourPillar).toBe(false);
    expect(forecast.birthContext.inLateZiHour).toBe(false);
    expect(forecast.luckOverlap.status).toBe("unavailable-time-unknown");
    expect(forecast.luckOverlap.periods).toEqual([]);
    expect(forecast.blocks.find((item) => item.kind === "birth-context")?.detail.ko).toContain("시각이 미상");
  });

  it("23시 입력에 선택한 야자시 규칙을 기록한다", () => {
    const { saju, forecast } = forecastFor({
      ...BASE_BIRTH,
      time: { hour: 23, minute: 15 },
    });
    const contextBlock = forecast.blocks.find((item) => item.kind === "birth-context");

    expect(saju.boundary.inLateZiHour).toBe(true);
    expect(forecast.birthContext.dayBoundaryRule).toBe("zi23");
    expect(contextBlock?.evidenceRefs).toContain("day-boundary-rule");
    expect(contextBlock?.detail.ko).toContain("23시 야자시론");
  });

  it("reports midnight-boundary context for late-Zi and daytime births", () => {
    const lateZi = forecastFor({
      ...BASE_BIRTH,
      time: { hour: 23, minute: 15 },
    }, "midnight");
    const daytime = forecastFor(BASE_BIRTH, "midnight");
    const lateZiBlock = lateZi.forecast.blocks.find((item) => item.kind === "birth-context");
    const daytimeBlock = daytime.forecast.blocks.find((item) => item.kind === "birth-context");

    expect(lateZi.forecast.birthContext.inLateZiHour).toBe(true);
    expect(lateZiBlock?.detail.en).toContain("the midnight-boundary rule");
    expect(daytime.forecast.birthContext.inLateZiHour).toBe(false);
    expect(daytimeBlock?.detail.en).toContain("the midnight-boundary rule");
  });

  it("falls back for an unknown stage label and unregistered relation branch", () => {
    const natal = computeSaju(
      {
        date: { year: 2000, month: 1, day: 15 },
        time: { hour: 12, minute: 0 },
        place: DEFAULT_PLACE,
      },
      { applyTrueSolarTime: false },
    );
    const forecast = buildYearForecast(natal);
    const monthRelation = forecast.natalBranchRelations.find((item) => item.natalPillar === "month");
    if (!monthRelation) throw new Error("expected a Month Branch relation in this fixture");
    const unknownBranchRelation: NatalBranchRelation = {
      ...monthRelation,
      relation: { ...monthRelation.relation, branches: [99] },
    };
    const firstMonth = forecast.months[0];
    if (!firstMonth) throw new Error("expected the first 2027 solar-term month");

    const blocks = buildYearForecastExplanations({
      year: forecast.year,
      annual: { ...forecast.annual, stage: "unknown-stage" },
      months: [{ ...firstMonth, stage: "unknown-stage" }],
      natalBranchRelations: [...forecast.natalBranchRelations, unknownBranchRelation],
      luckOverlap: forecast.luckOverlap,
      birthContext: forecast.birthContext,
    });

    expect(blocks.find((item) => item.kind === "annual")?.detail.en).toContain("unknown-stage");
    expect(blocks.find((item) => item.kind === "month")?.detail.en).toContain("unknown-stage");
    expect(blocks.find((item) => item.kind === "natal-relations")?.detail.en).toContain("Month Branch");
  });

  it("대운 겹침은 기존 반올림 연도 구간으로 표시하고 시각 미상은 제외한다", () => {
    const { forecast } = forecastFor(BASE_BIRTH);
    expect(forecast.luckOverlap.status).toBe("available");
    expect(forecast.luckOverlap.basis).toBe("rounded-calendar-year");
    expect(forecast.luckOverlap.periods.length).toBeGreaterThan(0);
    expect(forecast.luckOverlap.periods.every((period) => period.fromYear <= 2027 && 2027 < period.toYear)).toBe(true);
  });

  it("모든 서술 블록은 구조 검증을 통과하고 typed evidenceRefs와 출처를 가진다", () => {
    const { forecast } = forecastFor(BASE_BIRTH);
    // 16 = 5 existing kinds (annual/12 months/natal-relations/luck-overlap/birth-context) +
    // 8 domain-chapter blocks added by Track B1 (work/relationships/wellbeing/growth × 2 each).
    expect(forecast.blocks).toHaveLength(24);

    for (const block of forecast.blocks) {
      assertExplanationBlock(block);
      expect(block.evidenceRefs.length).toBeGreaterThan(0);
      expect(block.tier).toBe("cultural");
      block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
      expect(`${block.detail.ko}${block.detail.en}`).not.toContain("will happen");
    }
  });
});
