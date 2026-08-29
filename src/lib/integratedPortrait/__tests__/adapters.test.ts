import { describe, expect, it } from "vitest";
import type { AttachmentSummaryV1, BigFiveSummaryV1, EqSummaryV1, JungianSummaryV1, DarkTriadSummaryV1 } from "@/lib/shareCode";
import {
  toAstroSnapshot,
  toAttachmentSnapshot,
  toBigFiveSnapshot,
  toDarkTriadSnapshot,
  toEqSnapshot,
  toJungianSnapshot,
  toNumerologySnapshot,
  toSajuSnapshot,
  type AstroSnapshotInput,
  type NumerologySnapshotInput,
  type SajuSnapshotInput,
} from "../adapters";

const bigFiveSummary: BigFiveSummaryV1 = {
  kind: "bigfive",
  version: 1,
  locale: "ko",
  factors: [
    { factor: "extraversion", tScore: 42 },
    { factor: "agreeableness", tScore: 50 },
    { factor: "conscientiousness", tScore: 58 },
    { factor: "emotionalStability", tScore: 50 },
    { factor: "intellect", tScore: 70 },
  ],
};

const jungianSummary: JungianSummaryV1 = {
  kind: "jungian",
  version: 2,
  locale: "ko",
  axes: [
    { axis: "EI", continuous: -20, isBoundary: false },
    { axis: "SN", continuous: 0, isBoundary: true },
    { axis: "TF", continuous: 25, isBoundary: false },
    { axis: "JP", continuous: -30, isBoundary: false },
    { axis: "AT", continuous: 15, isBoundary: false },
    { axis: "VW", continuous: 0, isBoundary: true },
  ],
  typeCode: "I?FJ-A?",
};

const darkTriadSummary: DarkTriadSummaryV1 = {
  kind: "darktriad",
  version: 1,
  locale: "ko",
  subscales: [
    { subscale: "machiavellianism", tScore: 45 },
    { subscale: "narcissism", tScore: 50 },
    { subscale: "psychopathy", tScore: 62 },
  ],
};

const attachmentSummary: AttachmentSummaryV1 = {
  kind: "attachment",
  version: 1,
  locale: "ko",
  anxiety: 2.1,
  avoidance: 3.8,
  quadrant: "avoidant",
};

const eqSummary: EqSummaryV1 = {
  kind: "eq",
  version: 1,
  locale: "ko",
  subscales: [
    { subscale: "perceptionOfEmotion", tScore: 48 },
    { subscale: "managingOwnEmotions", tScore: 55 },
    { subscale: "managingOthersEmotions", tScore: 50 },
    { subscale: "utilisationOfEmotion", tScore: 40 },
  ],
  totalRawSum: 123,
};

describe("integrated portrait adapters", () => {
  it("converts relative Big Five positions to bands without persisting scores", () => {
    const snapshot = toBigFiveSnapshot(bigFiveSummary);
    const extraversion = snapshot.signals.find((signal) => signal.constructId === "bigfive.extraversion");
    const emotionalStability = snapshot.signals.find(
      (signal) => signal.constructId === "bigfive.emotional-stability",
    );

    expect(extraversion?.value).toEqual({ kind: "band", band: "low" });
    expect(emotionalStability?.value).toEqual({ kind: "band", band: "mid" });
    expect(snapshot.signals.every((signal) => /^[a-z0-9._-]+$/u.test(signal.constructId))).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("tScore");
    expect(JSON.stringify(snapshot)).not.toContain("42");
  });

  it("keeps derived Jungian axes as categories and never stores the type label", () => {
    const snapshot = toJungianSnapshot(jungianSummary);
    const perception = snapshot.signals.find((signal) => signal.constructId === "jungian.sn");

    expect(perception?.value).toEqual({ kind: "category", code: "boundary" });
    expect(JSON.stringify(snapshot)).not.toContain("I?FJ-A?");
    expect(JSON.stringify(snapshot)).not.toContain("continuous");
  });

  it("drops numeric fields from Dark Triad, Attachment, and EQ summaries", () => {
    const darkTriad = toDarkTriadSnapshot(darkTriadSummary);
    const attachment = toAttachmentSnapshot(attachmentSummary);
    const eq = toEqSnapshot(eqSummary);

    expect(JSON.stringify(darkTriad)).not.toContain("45");
    expect(JSON.stringify(attachment)).not.toContain("2.1");
    expect(JSON.stringify(attachment)).not.toContain("3.8");
    expect(JSON.stringify(eq)).not.toContain("totalRawSum");
    expect(JSON.stringify(eq)).not.toContain("123");
    expect(eq.signals.some((signal) => signal.constructId === "eq.perception-of-emotion")).toBe(true);
  });

  it("stores only documented cultural categories", () => {
    const sajuInput: SajuSnapshotInput = {
      locale: "ko",
      dominantElement: "water",
      dayMasterElement: "wood",
      strength: "balanced",
      timeUnknown: true,
    };
    const astroInput: AstroSnapshotInput = {
      locale: "ko",
      sunSignIndex: 0,
      moonSignIndex: 6,
      risingSignIndex: null,
      notes: ["timeUnknown", "houseFallback"],
    };
    const numerologyInput: NumerologySnapshotInput = {
      locale: "ko",
      lifePath: 11,
      destinyPresent: false,
    };

    const saju = toSajuSnapshot(sajuInput);
    const astro = toAstroSnapshot(astroInput);
    const numerology = toNumerologySnapshot(numerologyInput);

    expect(saju.signals.some((signal) => signal.constructId === "saju.dominant-element")).toBe(true);
    expect(astro.signals.some((signal) => signal.constructId === "astro.sun-sign")).toBe(true);
    expect(numerology.signals).toContainEqual({
      constructId: "numerology.life-path",
      value: { kind: "category", code: "11" },
      descriptorIds: ["symbolic.category"],
      limitationIds: ["symbolic-lens"],
    });
    expect(JSON.stringify(saju)).not.toContain("birth");
    expect(JSON.stringify(astro)).not.toContain("longitude");
    expect(JSON.stringify(numerology)).not.toContain("name");
  });
});
