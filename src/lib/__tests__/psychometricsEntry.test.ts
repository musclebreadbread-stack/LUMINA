import { describe, expect, it } from "vitest";
import { resolvePsychometricsEntryAnalysis } from "../psychometricsEntry";

describe("psychometrics entry attribution", () => {
  it("records the default page URL as a Big Five entry", () => {
    const url = new URL("https://lumina.test/psychometrics");
    expect(resolvePsychometricsEntryAnalysis(url.searchParams.get("to") ?? undefined)).toBe("psychometrics");
  });

  it("records /psychometrics?to=types as a Jungian entry", () => {
    const url = new URL("https://lumina.test/psychometrics?to=types");
    expect(resolvePsychometricsEntryAnalysis(url.searchParams.get("to") ?? undefined)).toBe("jungian");
  });

  it("uses the first repeated query value and keeps unknown targets safe", () => {
    expect(resolvePsychometricsEntryAnalysis(["types", "ignored"])).toBe("jungian");
    expect(resolvePsychometricsEntryAnalysis("unknown")).toBe("psychometrics");
  });
});
