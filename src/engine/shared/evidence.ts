import type { EvidenceTier } from "./tier";

export type AnalysisKey =
  | "saju"
  | "astro"
  | "tarot"
  | "numerology"
  | "psychometrics"
  | "jungian"
  | "darktriad"
  | "attachment"
  | "eq"
  | "cognitive"
  | "horoscope"
  | "compatibility";

export type MethodCategory =
  | "psychometric"
  | "ability-sampling"
  | "astronomical-calculation"
  | "traditional-symbolic"
  | "derived-exploratory";

export type ValidationStatus =
  | "validated-target-population"
  | "validated-other-population"
  | "translation-not-validated"
  | "derived"
  | "experimental";

export type LicenseStatus = "verified" | "permission-required" | "not-approved";

export interface EvidenceProfile {
  readonly methodCategory: MethodCategory;
  readonly validationStatus: ValidationStatus;
  readonly targetPopulation: string;
  readonly normSource: string | null;
  readonly instrumentVersion: string;
  readonly licenseStatus: LicenseStatus;
  readonly lastReviewed: string;
  readonly limitations: readonly string[];
  readonly referenceIds: readonly string[];
}

export interface AnalysisDefinition {
  readonly key: AnalysisKey;
  readonly href: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly purpose: "traditional" | "personality" | "career" | "ability" | "daily";
  readonly tier: EvidenceTier;
  readonly evidence: EvidenceProfile;
  readonly durationMinutes: number;
  readonly itemCount: number | null;
  readonly showOnMandala: boolean;
}
