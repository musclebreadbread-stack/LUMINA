import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "../profile";
import { buildReportView, formatBirthLabel, formatSignedMinutes, stageLabel, tenGodLabel } from "../reportModel";

describe("saju report view model", () => {
  it("formats signed precision values and bilingual birth labels", () => {
    expect(formatSignedMinutes(12.34, "분")).toBe("+12.3분");
    expect(formatSignedMinutes(-2, "min")).toBe("−2.0min");
    expect(formatBirthLabel("1995-06-15T12:00:00+09:00", false, "ko")).toContain("1995년 6월 15일");
    expect(formatBirthLabel("1995-06-15T12:00:00+09:00", false, "en")).toContain("June 15, 1995");
  });

  it("builds a serializable report with all four pillars and frozen collections", () => {
    const view = buildReportView(DEFAULT_PROFILE, new Date("2026-08-20T00:00:00Z"));

    expect(view.pillars).toHaveLength(4);
    expect(view.elements.rows).toHaveLength(5);
    expect(view.luck.rows.length).toBeGreaterThan(0);
    expect(view.yearly).toHaveLength(5);
    expect(view.yearly.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(view.character.def.name).not.toBe("");
    expect(view.pillars.every((pillar) => pillar.stem.hanja.length > 0)).toBe(true);
    expect(view.elements.rows.every((row) => Number.isFinite(row.percent))).toBe(true);
  });

  it("keeps language selection in the view-model boundary", () => {
    expect(tenGodLabel("비견", "ko")).toBe("비견");
    expect(tenGodLabel("비견", "en")).not.toBe("비견");
    expect(stageLabel("장생", "ko")).toBe("장생");
    expect(stageLabel("장생", "en")).not.toBe("장생");
  });
});
