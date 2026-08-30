import type { AttachmentQuadrant } from "@engine/attachment/quadrants";
import type { CognitiveDomain } from "@engine/cognitive/items";
import type { DarkTriadFactor } from "@engine/darktriad/items";
import type { EqFactor } from "@engine/eq/items";
import { assetPath } from "@/lib/assets";

export const DARK_TRIAD_OVERVIEW_IMAGE = assetPath("psychometrics/darktriad", "overview");

export function darkTriadImagePath(factor: DarkTriadFactor): string {
  return assetPath("psychometrics/darktriad", factor);
}

export const ATTACHMENT_OVERVIEW_IMAGE = assetPath("psychometrics/attachment", "overview");

export function attachmentImagePath(image: AttachmentQuadrant | "anxiety" | "avoidance"): string {
  return assetPath("psychometrics/attachment", image);
}

const EQ_ART: Readonly<Record<EqFactor, string>> = Object.freeze({
  perceptionOfEmotion: "perceptionOfEmotion",
  managingOwnEmotions: "managingOwnEmotions",
  managingOthersEmotions: "managingOthersEmotions",
  utilisationOfEmotion: "utilisationOfEmotion",
});

export const EQ_OVERVIEW_IMAGE = assetPath("psychometrics/eq", "overview");

export function eqImagePath(factor: EqFactor): string {
  return assetPath("psychometrics/eq", EQ_ART[factor]);
}

const COGNITIVE_ART: Readonly<Record<CognitiveDomain, string>> = Object.freeze({
  letterNumberSeries: "letterNumberSeries",
  matrixReasoning: "matrixReasoning",
  verbalReasoning: "verbalReasoning",
  threeDimensionalRotation: "threeDimensionalRotation",
});

export const COGNITIVE_OVERVIEW_IMAGE = assetPath("psychometrics/cognitive", "overview");

export function cognitiveImagePath(domain: CognitiveDomain): string {
  return assetPath("psychometrics/cognitive", COGNITIVE_ART[domain]);
}
