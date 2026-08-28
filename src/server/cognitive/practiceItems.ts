import type {
  CognitiveStimulus,
  PresentationOption,
  StandardizedDomain,
} from "@engine/cognitive-standardized/types";

export interface PracticeItem {
  readonly id: string;
  readonly domain: StandardizedDomain;
  readonly stimulus: CognitiveStimulus;
  readonly options: readonly PresentationOption[];
  readonly correctOptionId: string;
  readonly explanationKo: string;
  readonly explanationEn: string;
}

function textOption(id: string, label: string): PresentationOption {
  return { id, labelKo: label, labelEn: label, figure: null };
}

function matrixOption(id: string, shape: "circle" | "square" | "triangle"): PresentationOption {
  return {
    id,
    labelKo: "도형",
    labelEn: "Shape",
    figure: {
      kind: "matrix",
      cells: [
        { kind: "figure", shape, fill: "solid", rotationDegrees: 0 },
      ],
    },
  };
}

function spatialOption(id: string, cubes: readonly { x: number; y: number; z: number }[]): PresentationOption {
  return {
    id,
    labelKo: "입체 보기",
    labelEn: "Solid",
    figure: { kind: "spatial", cubes },
  };
}

/** 정답·해설을 공개해도 되는 별도 튜토리얼 문항이다. 점수 문항 ID와 namespace를 공유하지 않는다. */
export const PRACTICE_ITEMS: readonly PracticeItem[] = Object.freeze([
  Object.freeze({
    id: "practice:gf:001",
    domain: "gf" as const,
    stimulus: { kind: "text" as const, textKo: "3, 6, 9, ?", textEn: "3, 6, 9, ?" },
    options: [textOption("practice:gf:001:a", "10"), textOption("practice:gf:001:b", "12")],
    correctOptionId: "practice:gf:001:b",
    explanationKo: "매번 3씩 증가하므로 다음 수는 12입니다.",
    explanationEn: "The sequence increases by three, so the next number is 12.",
  }),
  Object.freeze({
    id: "practice:gc:001",
    domain: "gc" as const,
    stimulus: {
      kind: "text" as const,
      textKo: "모든 장미는 꽃입니다. 반드시 참인 것은 무엇일까요?",
      textEn: "All roses are flowers. What must be true?",
    },
    options: [
      textOption("practice:gc:001:a", "모든 꽃은 장미입니다"),
      textOption("practice:gc:001:b", "모든 장미는 꽃입니다"),
    ],
    correctOptionId: "practice:gc:001:b",
    explanationKo: "첫 문장을 그대로 다시 말한 선택지가 반드시 참입니다.",
    explanationEn: "The statement itself guarantees that every rose is a flower.",
  }),
  Object.freeze({
    id: "practice:gv:001",
    domain: "gv" as const,
    stimulus: {
      kind: "matrix" as const,
      cells: [
        { kind: "figure" as const, shape: "circle" as const, fill: "solid" as const, rotationDegrees: 0 },
        { kind: "figure" as const, shape: "square" as const, fill: "solid" as const, rotationDegrees: 0 },
        { kind: "blank" as const, shape: null, fill: null, rotationDegrees: null },
      ],
    },
    options: [matrixOption("practice:gv:001:a", "triangle"), matrixOption("practice:gv:001:b", "circle")],
    correctOptionId: "practice:gv:001:a",
    explanationKo: "원, 사각형 다음에 오는 새 도형으로 삼각형을 선택하는 연습입니다.",
    explanationEn: "This tutorial introduces a new shape after the circle and square.",
  }),
  Object.freeze({
    id: "practice:gwm:001",
    domain: "gwm" as const,
    stimulus: { kind: "text" as const, textKo: "빨강-파랑-초록 순서를 기억하세요.", textEn: "Remember red-blue-green." },
    options: [textOption("practice:gwm:001:a", "빨강-초록-파랑"), textOption("practice:gwm:001:b", "빨강-파랑-초록")],
    correctOptionId: "practice:gwm:001:b",
    explanationKo: "잠깐 본 순서를 그대로 회상하는 연습입니다.",
    explanationEn: "Recall the short sequence in the same order.",
  }),
  Object.freeze({
    id: "practice:gs:001",
    domain: "gs" as const,
    stimulus: { kind: "spatial" as const, cubes: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] },
    options: [
      spatialOption("practice:gs:001:a", [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]),
      spatialOption("practice:gs:001:b", [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]),
    ],
    correctOptionId: "practice:gs:001:a",
    explanationKo: "두 정육면체가 가로로 붙은 같은 모양을 고릅니다.",
    explanationEn: "Choose the option with the same two cubes joined horizontally.",
  }),
]);
