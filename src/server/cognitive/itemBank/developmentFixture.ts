import type { InternalItem } from "@engine/cognitive-standardized/types";

import type { ItemBankRecord } from "./validation";

const fixtureInternal: InternalItem = {
  versionId: "score:gfv1:001",
  domain: "gf",
  presentation: {
    domain: "gf",
    stimulus: {
      kind: "text",
      textKo: "2, 4, 6, ?",
      textEn: "2, 4, 6, ?",
    },
    options: [
      { id: "score:gfv1:001:a", labelKo: "7", labelEn: "7", figure: null },
      { id: "score:gfv1:001:b", labelKo: "8", labelEn: "8", figure: null },
      { id: "score:gfv1:001:c", labelKo: "9", labelEn: "9", figure: null },
      { id: "score:gfv1:001:d", labelKo: "10", labelEn: "10", figure: null },
    ],
  },
  correctOptionId: "score:gfv1:001:b",
  parameters: { discrimination: 1.1, difficulty: 0, guessing: 0.25 },
  exposureRate: 0.08,
};

/** 테스트 전용 fixture. 운영 로더에서 직접 import하지 않는다. */
export const DEVELOPMENT_FIXTURE_ITEM: ItemBankRecord = {
  ...fixtureInternal,
  status: "active",
  itemBankVersion: "cognitive-pilot-v1",
  calibrationVersion: "ko-adult-pilot-2026-08",
  calibration: {
    version: "ko-adult-pilot-2026-08",
    model: "3pl",
    sampleSize: 420,
    expertReviewIds: ["reviewer-a", "reviewer-b"],
    cognitiveInterviewId: "ci-gfv1-001",
    calibratedAt: "2026-08-28",
  },
  constructTag: "gf",
  sourceTextKo: "수열 규칙을 찾아 다음 수를 고르는 문항",
  translationStatus: "reviewed",
  distractorRationale: {
    "score:gfv1:001:a": "홀수로 전환하는 오답",
    "score:gfv1:001:c": "증가 폭을 두 배로 오해하는 오답",
    "score:gfv1:001:d": "마지막 항을 반복하는 오답",
  },
  answerEvidence: "등차가 2인 수열이므로 8이 정답이다.",
  visualAccessibilityChecked: true,
  copyrightProvenance: "LUMINA original item, authored 2026-08-28",
  retireReason: null,
};
