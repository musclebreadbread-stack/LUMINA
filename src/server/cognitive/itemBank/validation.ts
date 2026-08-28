import type {
  IrtParameters,
  InternalItem,
  StandardizedDomain,
} from "@engine/cognitive-standardized/types";

export type ItemBankStatus = "draft" | "pilot" | "active" | "retired";

export type CalibrationModel = "2pl" | "3pl";

export interface CalibrationRecord {
  readonly version: string;
  readonly model: CalibrationModel;
  readonly sampleSize: number;
  readonly expertReviewIds: readonly string[];
  readonly cognitiveInterviewId: string;
  readonly calibratedAt: string;
}

export interface ItemBankRecord extends Omit<InternalItem, "parameters"> {
  readonly parameters: IrtParameters | null;
  readonly status: ItemBankStatus;
  readonly itemBankVersion: string;
  readonly calibrationVersion: string | null;
  readonly calibration: CalibrationRecord | null;
  readonly constructTag: StandardizedDomain;
  readonly sourceTextKo: string;
  readonly translationStatus: "pending" | "reviewed";
  readonly distractorRationale: Readonly<Record<string, string>>;
  readonly answerEvidence: string;
  readonly visualAccessibilityChecked: boolean;
  readonly copyrightProvenance: string;
  readonly retireReason: string | null;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function validateParameters(item: ItemBankRecord): void {
  const parameters = item.parameters;
  if (parameters === null) {
    if (item.status === "pilot" || item.status === "active") {
      throw new Error("active items require calibrated parameters");
    }
    return;
  }

  if (!Number.isFinite(parameters.discrimination) || parameters.discrimination <= 0) {
    throw new Error("discrimination must be greater than zero");
  }
  if (!Number.isFinite(parameters.difficulty)) {
    throw new Error("difficulty must be finite");
  }
  if (
    !Number.isFinite(parameters.guessing) ||
    parameters.guessing < 0 ||
    parameters.guessing > 0.5
  ) {
    throw new Error("guessing must be in the range [0, 0.5]");
  }

  const model = item.calibration?.model;
  if (model === "2pl" && parameters.guessing !== 0) {
    throw new Error("2PL items must have guessing fixed at zero");
  }
}

function validateOptions(item: ItemBankRecord): void {
  const optionIds = item.presentation.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) {
    throw new Error("duplicate option id");
  }
  if (!optionIds.includes(item.correctOptionId)) {
    throw new Error("correct option must exist in options");
  }
  if (optionIds.length < 2) {
    throw new Error("items require at least two options");
  }
}

function validateCalibrationMetadata(item: ItemBankRecord): void {
  if (item.status !== "active") return;

  const calibration = item.calibration;
  if (calibration === null) {
    throw new Error("active items require calibration metadata");
  }
  if (item.calibrationVersion !== calibration.version) {
    throw new Error("calibration version must match item metadata");
  }
  if (!Number.isInteger(calibration.sampleSize) || calibration.sampleSize <= 0) {
    throw new Error("calibration sample size must be a positive integer");
  }
  if (calibration.expertReviewIds.length < 2) {
    throw new Error("active items require two independent expert reviews");
  }
  if (!hasText(calibration.cognitiveInterviewId) || !hasText(calibration.calibratedAt)) {
    throw new Error("active items require a cognitive interview record");
  }
  if (item.translationStatus !== "reviewed") {
    throw new Error("active items require reviewed translation");
  }
  if (!item.visualAccessibilityChecked) {
    throw new Error("active items require visual accessibility review");
  }
  if (!hasText(item.sourceTextKo) || !hasText(item.answerEvidence) || !hasText(item.copyrightProvenance)) {
    throw new Error("active items require authoring provenance");
  }
}

/** 운영 문항 승격 전에 문항·보정·검토 메타데이터를 검증한다. */
export function validateCalibratedItem(item: ItemBankRecord): ItemBankRecord {
  validateOptions(item);
  validateParameters(item);
  validateCalibrationMetadata(item);

  if (item.status === "retired" && !item.retireReason?.trim()) {
    throw new Error("retired items require a retire reason");
  }

  return item;
}
