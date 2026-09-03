import type { AnalysisKey } from "@engine/shared/evidence";

/** The shared survey page hosts Big Five by default and Jungian when `to=types`. */
export function resolvePsychometricsEntryAnalysis(
  to: string | readonly string[] | undefined,
): Extract<AnalysisKey, "psychometrics" | "jungian"> {
  const target = typeof to === "string" ? to : to?.[0];
  return target === "types" ? "jungian" : "psychometrics";
}
