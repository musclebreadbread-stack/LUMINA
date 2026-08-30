/**
 * 인지능력 탐색 — ICAR 형식을 따르되 문항은 LUMINA가 직접 쓴 16문항.
 *
 * ── 문항 출처 ────────────────────────────────────────────────────────────────
 * 따르는 것: ICAR(International Cognitive Ability Resource, Condon & Revelle 2014)이 정리한
 * 네 가지 문항 **형식** — 문자·숫자 수열, 행렬 추론, 언어 추론, 3차원 회전.
 * 쓰지 않는 것: ICAR의 **실제 문항**. 도형 문항(행렬·회전)은 글이 아니라 그림이라 기억에서
 * 정확히 복원할 수 없고, 언어 문항도 원문을 확신할 수 없다. 확신 없는 복원본에 원척도 이름을
 * 붙이는 것은 조용한 과장이다. 그래서 네 형식만 따라 문항을 새로 썼다.
 *
 * ── 그래서 규준이 없다 ────────────────────────────────────────────────────────
 * 문항이 다르면 그 문항에 답한 표본도 없다. ICAR 규준은 다른 문항에 답한 사람들의 분포이므로
 * 여기에 붙일 수 없다. 백분위·z점수·T점수·IQ 환산치를 내지 않는 이유가 이것이다.
 * 보고하는 것은 영역별 정답 수와 정답률, 전체 정답 수와 정답률뿐이다.
 * 이 결정은 provenance.ts의 COGNITIVE_NORM_ABSENCE에 데이터로도 남아 있다.
 *
 * 나중에 ICAR 라이선스를 확보하면 이 파일의 문항 데이터만 교체하면 된다 —
 * 채점기(scoring.ts)는 문항 내용을 모른 채 정답 색인만 비교하도록 짜여 있다.
 *
 * ── 자극을 데이터로 두는 이유 ──────────────────────────────────────────────────
 * 행렬·회전 문항의 자극은 그림 파일도 아니고 "삼각형이 세 개 있는 칸" 같은 산문 설명도 아니라
 * 구조화된 데이터다. 규칙이 데이터 안에 들어 있으므로 렌더러는 그리기만 하면 되고,
 * 번역할 문장이 없고, 이미지 자산도 필요 없다.
 */

import {
  NO_ROTATION,
  type Rotation,
  type Voxel,
} from "./figures";

/** ICAR가 정리한 네 가지 문항 형식. */
export type CognitiveDomain =
  | "letterNumberSeries"
  | "matrixReasoning"
  | "verbalReasoning"
  | "threeDimensionalRotation";

export const DOMAINS: readonly CognitiveDomain[] = Object.freeze([
  "letterNumberSeries",
  "matrixReasoning",
  "verbalReasoning",
  "threeDimensionalRotation",
]);

export const ITEMS_PER_DOMAIN = 4;
export const ITEM_COUNT = 16;

/* ────────────────────────────── 자극 데이터 타입 ────────────────────────────── */

/** 글로 제시되는 자극. 수열 문항은 두 로케일이 같은 문자열(수열 자체)을 쓴다. */
export interface TextStimulus {
  readonly kind: "text";
  readonly textKo: string;
  readonly textEn: string;
}

export type MatrixShape = "circle" | "square" | "triangle" | "diamond" | "cross" | "star" | "arrow" | "hexagon";

export type MatrixFill = "none" | "hatch" | "solid";

export type MatrixSize = "small" | "medium" | "large";

/** 45도 단위. 렌더러가 SVG transform 각도로 그대로 쓸 수 있는 값이다. */
export type MatrixRotationDegrees = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

/**
 * 행렬 한 칸의 내용. 규칙(개수 증가·회전 진행·채움 변화 등)은 칸들 사이의 이 값 차이로 표현된다.
 * count는 같은 도형을 몇 개 그리는지이며, 렌더러가 칸 안에 알아서 배치한다.
 */
export interface MatrixCellContent {
  readonly shape: MatrixShape;
  /** 1~4. 칸 안에 그릴 같은 도형의 개수. */
  readonly count: number;
  readonly rotationDegrees: MatrixRotationDegrees;
  readonly fill: MatrixFill;
  readonly size: MatrixSize;
}

export type MatrixCell =
  | { readonly kind: "figure"; readonly content: MatrixCellContent }
  | { readonly kind: "blank" };

/** 3×3 행렬 자극. cells는 행 우선 9칸이며 그중 정확히 하나가 blank다. */
export interface MatrixFigure {
  readonly kind: "matrix";
  readonly rows: 3;
  readonly columns: 3;
  readonly cells: readonly MatrixCell[];
}

/** 폴리큐브 자극. voxels를 rotation만큼 돌린 모습이 실제로 보여야 하는 도형이다. */
export interface PolycubeFigure {
  readonly kind: "polycube";
  readonly voxels: readonly Voxel[];
  readonly rotation: Rotation;
}

/* ────────────────────────────── 보기 데이터 타입 ────────────────────────────── */

export interface TextOption {
  readonly kind: "text";
  readonly id: string;
  readonly labelKo: string;
  readonly labelEn: string;
}

export interface MatrixOption {
  readonly kind: "matrixCell";
  readonly id: string;
  readonly cell: MatrixCellContent;
}

export interface PolycubeOption {
  readonly kind: "polycube";
  readonly id: string;
  readonly figure: PolycubeFigure;
}

export type CognitiveOption = TextOption | MatrixOption | PolycubeOption;

/* ────────────────────────────── 문항 타입 ────────────────────────────── */

interface ItemBase {
  readonly id: number;
  readonly domain: CognitiveDomain;
  /** options 배열의 색인. 응답도 같은 색인으로 들어온다. */
  readonly correctOptionIndex: number;
  /** 강제 제한이 아니라 안내용 권장 시간. 자동 제출도, 카운트다운 압박도 없다. */
  readonly recommendedSeconds: number;
  /** 정답을 정답으로 만드는 **규칙**을 적는다. "정답은 3번" 같은 문장은 설명이 아니다. */
  readonly explanationKo: string;
  readonly explanationEn: string;
}

export interface SeriesItem extends ItemBase {
  readonly domain: "letterNumberSeries";
  readonly stimulus: TextStimulus;
  readonly options: readonly TextOption[];
}

export interface VerbalItem extends ItemBase {
  readonly domain: "verbalReasoning";
  readonly stimulus: TextStimulus;
  readonly options: readonly TextOption[];
}

export interface MatrixItem extends ItemBase {
  readonly domain: "matrixReasoning";
  readonly stimulus: MatrixFigure;
  readonly options: readonly MatrixOption[];
}

export interface RotationItem extends ItemBase {
  readonly domain: "threeDimensionalRotation";
  readonly stimulus: PolycubeFigure;
  readonly options: readonly PolycubeOption[];
}

export type Item = SeriesItem | MatrixItem | VerbalItem | RotationItem;

/* ────────────────────────────── 작성 도우미 ────────────────────────────── */

function textStimulus(textKo: string, textEn: string): TextStimulus {
  return Object.freeze({ kind: "text" as const, textKo, textEn });
}

function textOptions(
  labels: readonly (readonly [id: string, ko: string, en: string])[],
): readonly TextOption[] {
  return Object.freeze(
    labels.map(([id, labelKo, labelEn]) =>
      Object.freeze({ kind: "text" as const, id, labelKo, labelEn }),
    ),
  );
}

/** 수열 문항의 보기는 두 로케일에서 같은 기호다 — 번역할 것이 없다. */
function symbolOptions(symbols: readonly string[]): readonly TextOption[] {
  return textOptions(symbols.map((symbol) => [symbol, symbol, symbol] as const));
}

function cell(
  shape: MatrixShape,
  count: number,
  rotationDegrees: MatrixRotationDegrees = 0,
  fill: MatrixFill = "solid",
  size: MatrixSize = "medium",
): MatrixCell {
  return Object.freeze({
    kind: "figure" as const,
    content: Object.freeze({ shape, count, rotationDegrees, fill, size }),
  });
}

const BLANK_CELL: MatrixCell = Object.freeze({ kind: "blank" as const });

function matrix(cells: readonly MatrixCell[]): MatrixFigure {
  return Object.freeze({
    kind: "matrix" as const,
    rows: 3 as const,
    columns: 3 as const,
    cells: Object.freeze(cells),
  });
}

function matrixOption(
  id: string,
  shape: MatrixShape,
  count: number,
  rotationDegrees: MatrixRotationDegrees = 0,
  fill: MatrixFill = "solid",
  size: MatrixSize = "medium",
): MatrixOption {
  return Object.freeze({
    kind: "matrixCell" as const,
    id,
    cell: Object.freeze({ shape, count, rotationDegrees, fill, size }),
  });
}

function voxels(coordinates: readonly (readonly [number, number, number])[]): readonly Voxel[] {
  return Object.freeze(coordinates.map(([x, y, z]) => Object.freeze({ x, y, z })));
}

function rotation(xDegrees: 0 | 90 | 180 | 270, yDegrees: 0 | 90 | 180 | 270, zDegrees: 0 | 90 | 180 | 270): Rotation {
  return Object.freeze({ xDegrees, yDegrees, zDegrees });
}

function polycube(shape: readonly Voxel[], figureRotation: Rotation): PolycubeFigure {
  return Object.freeze({ kind: "polycube" as const, voxels: shape, rotation: figureRotation });
}

function polycubeOption(id: string, shape: readonly Voxel[], figureRotation: Rotation): PolycubeOption {
  return Object.freeze({ kind: "polycube" as const, id, figure: polycube(shape, figureRotation) });
}

/* ────────────────────────────── 회전 문항 도형 ──────────────────────────────
 * 정답 보기는 자극과 **같은 voxels**에 다른 rotation만 준다 — 회전 합동이 구성으로 보장된다.
 * 오답 보기는 거울상(카이랄 도형이라 회전으로는 절대 겹치지 않는다)이거나 큐브 하나를 옮긴 도형이다.
 * 이 두 주장은 __tests__/items.test.ts가 areRotationEquivalent로 실제로 확인한다.
 */

const SCREW_4 = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]]);
const SCREW_4_MIRROR = voxels([[0, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 0]]);
const FLAT_S_4 = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]]);
const FLAT_L_4 = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 2, 0]]);

const SCREW_5 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1]]);
const SCREW_5_MIRROR = voxels([[0, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 0], [2, 0, 0]]);
const FLAT_U_5 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0]]);
const FLAT_ZIGZAG_5 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 1, 0]]);

const TWIST_5 = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 2, 1]]);
const TWIST_5_MIRROR = voxels([[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 2, 1], [1, 0, 0]]);
const TWIST_5_MOVED = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [2, 1, 1]]);
const FLAT_STAIR_5 = voxels([[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0], [2, 2, 0]]);

const SPIRAL_6 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1], [2, 2, 1]]);
const SPIRAL_6_MIRROR = voxels([[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 2, 1], [1, 0, 0], [2, 0, 0]]);
const SPIRAL_6_MOVED = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1], [1, 1, 1]]);
const FLAT_STAIR_6 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 1, 0], [3, 2, 0]]);
const BENT_6 = voxels([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1]]);

/* ────────────────────────────── 16문항 ────────────────────────────── */

const SERIES_ITEMS: readonly SeriesItem[] = Object.freeze([
  Object.freeze({
    id: 1,
    domain: "letterNumberSeries" as const,
    stimulus: textStimulus("C 3 E 5 G 7 I ?", "C 3 E 5 G 7 I ?"),
    options: symbolOptions(["8", "9", "10", "11"]),
    correctOptionIndex: 1,
    recommendedSeconds: 45,
    explanationKo:
      "글자를 알파벳 순번으로 바꾸면 짝지어진 숫자가 된다. C는 3번째, E는 5번째, G는 7번째 글자이고 I는 9번째다.",
    explanationEn:
      "Each letter is paired with its position in the alphabet: C is 3rd, E is 5th, G is 7th, so I gives 9.",
  }),
  Object.freeze({
    id: 2,
    domain: "letterNumberSeries" as const,
    stimulus: textStimulus("2 B 4 D 8 F 16 ?", "2 B 4 D 8 F 16 ?"),
    options: symbolOptions(["G", "H", "J", "P"]),
    correctOptionIndex: 1,
    recommendedSeconds: 55,
    explanationKo:
      "숫자와 글자가 각자 따로 나아간다. 숫자는 2배씩(2, 4, 8, 16) 커지고 글자는 두 칸씩(B, D, F) 나아가므로 다음 글자는 H다.",
    explanationEn:
      "Numbers and letters run on separate tracks: the numbers double (2, 4, 8, 16) and the letters advance two places (B, D, F), so the next letter is H.",
  }),
  Object.freeze({
    id: 3,
    domain: "letterNumberSeries" as const,
    stimulus: textStimulus("Z 1 X 2 V 4 T 8 R ?", "Z 1 X 2 V 4 T 8 R ?"),
    options: symbolOptions(["10", "12", "16", "32"]),
    correctOptionIndex: 2,
    recommendedSeconds: 65,
    explanationKo:
      "글자는 Z에서 두 칸씩 거꾸로 가고(Z, X, V, T, R) 숫자는 2배씩 커진다(1, 2, 4, 8). 8 다음은 16이다.",
    explanationEn:
      "The letters step backwards two places at a time (Z, X, V, T, R) while the numbers double (1, 2, 4, 8), so 8 is followed by 16.",
  }),
  Object.freeze({
    id: 4,
    domain: "letterNumberSeries" as const,
    stimulus: textStimulus("A 2 D 6 H 12 M 20 S ?", "A 2 D 6 H 12 M 20 S ?"),
    options: symbolOptions(["24", "26", "30", "32"]),
    correctOptionIndex: 2,
    recommendedSeconds: 90,
    explanationKo:
      "두 간격이 함께 벌어진다. 글자 간격은 3, 4, 5, 6칸으로 하나씩 늘고(A→D→H→M→S), 숫자 간격은 4, 6, 8, 10으로 둘씩 는다. 20 + 10 = 30이다.",
    explanationEn:
      "Both gaps widen together: the letter gaps grow by one (3, 4, 5, 6 giving A→D→H→M→S) and the number gaps grow by two (4, 6, 8, 10), so 20 + 10 = 30.",
  }),
]);

const MATRIX_ITEMS: readonly MatrixItem[] = Object.freeze([
  Object.freeze({
    id: 5,
    domain: "matrixReasoning" as const,
    stimulus: matrix([
      cell("circle", 1), cell("circle", 2), cell("circle", 3),
      cell("square", 1), cell("square", 2), cell("square", 3),
      cell("triangle", 1), cell("triangle", 2), BLANK_CELL,
    ]),
    options: Object.freeze([
      matrixOption("m5a", "triangle", 3),
      matrixOption("m5b", "triangle", 2),
      matrixOption("m5c", "square", 3),
      matrixOption("m5d", "circle", 3),
      matrixOption("m5e", "triangle", 4),
    ]),
    correctOptionIndex: 0,
    recommendedSeconds: 45,
    explanationKo:
      "행은 도형을 정하고(원, 사각형, 삼각형) 열은 개수를 정한다(1개, 2개, 3개). 마지막 칸은 셋째 행·셋째 열이므로 삼각형 3개다.",
    explanationEn:
      "The row fixes the shape (circle, square, triangle) and the column fixes the count (one, two, three). The missing cell is row three, column three: three triangles.",
  }),
  Object.freeze({
    id: 6,
    domain: "matrixReasoning" as const,
    stimulus: matrix([
      cell("arrow", 1, 0), cell("arrow", 1, 45), cell("arrow", 1, 90),
      cell("arrow", 1, 90), cell("arrow", 1, 135), cell("arrow", 1, 180),
      cell("arrow", 1, 180), cell("arrow", 1, 225), BLANK_CELL,
    ]),
    options: Object.freeze([
      matrixOption("m6a", "arrow", 1, 180),
      matrixOption("m6b", "arrow", 1, 225),
      matrixOption("m6c", "arrow", 1, 270),
      matrixOption("m6d", "arrow", 1, 315),
      matrixOption("m6e", "arrow", 1, 90),
    ]),
    correctOptionIndex: 2,
    recommendedSeconds: 55,
    explanationKo:
      "화살표는 오른쪽으로 갈 때마다 45도, 아래로 갈 때마다 90도 돈다. 셋째 행 셋째 칸은 225도에서 45도 더 돈 270도다.",
    explanationEn:
      "The arrow turns 45 degrees for each step to the right and 90 degrees for each step down. The missing cell is 45 degrees past 225, that is 270.",
  }),
  Object.freeze({
    id: 7,
    domain: "matrixReasoning" as const,
    stimulus: matrix([
      cell("hexagon", 1, 0, "none", "small"), cell("hexagon", 1, 0, "hatch", "small"), cell("hexagon", 1, 0, "solid", "small"),
      cell("hexagon", 1, 0, "none", "medium"), cell("hexagon", 1, 0, "hatch", "medium"), cell("hexagon", 1, 0, "solid", "medium"),
      cell("hexagon", 1, 0, "none", "large"), cell("hexagon", 1, 0, "hatch", "large"), BLANK_CELL,
    ]),
    options: Object.freeze([
      matrixOption("m7a", "hexagon", 1, 0, "hatch", "large"),
      matrixOption("m7b", "hexagon", 1, 0, "solid", "large"),
      matrixOption("m7c", "hexagon", 1, 0, "solid", "medium"),
      matrixOption("m7d", "hexagon", 1, 0, "none", "large"),
      matrixOption("m7e", "hexagon", 1, 0, "solid", "small"),
    ]),
    correctOptionIndex: 1,
    recommendedSeconds: 70,
    explanationKo:
      "두 속성이 서로 다른 방향으로 변한다. 채움은 열을 따라 빈칸→빗금→가득으로, 크기는 행을 따라 작게→중간→크게로 간다. 빠진 칸은 가득 채운 큰 육각형이다.",
    explanationEn:
      "Two attributes vary along different axes: the fill runs empty → hatched → solid across the columns, and the size runs small → medium → large down the rows. The missing cell is a large solid hexagon.",
  }),
  Object.freeze({
    id: 8,
    domain: "matrixReasoning" as const,
    stimulus: matrix([
      cell("star", 1), cell("diamond", 2), cell("cross", 3),
      cell("diamond", 3), cell("cross", 1), cell("star", 2),
      cell("cross", 2), cell("star", 3), BLANK_CELL,
    ]),
    options: Object.freeze([
      matrixOption("m8a", "star", 1),
      matrixOption("m8b", "diamond", 1),
      matrixOption("m8c", "diamond", 2),
      matrixOption("m8d", "cross", 1),
      matrixOption("m8e", "diamond", 3),
    ]),
    correctOptionIndex: 1,
    recommendedSeconds: 95,
    explanationKo:
      "도형과 개수가 각각 독립적으로 배치돼 있다. 어느 행에도, 어느 열에도 세 도형이 한 번씩 나오고 개수 1·2·3도 한 번씩 나온다. 셋째 행에는 마름모가, 셋째 열에는 1개가 아직 없으므로 빠진 칸은 마름모 1개다.",
    explanationEn:
      "Shape and count are arranged independently: every row and every column contains each of the three shapes once and each of the counts one, two and three once. Row three still lacks the diamond and column three still lacks the count of one, so the missing cell is a single diamond.",
  }),
]);

const VERBAL_ITEMS: readonly VerbalItem[] = Object.freeze([
  Object.freeze({
    id: 9,
    domain: "verbalReasoning" as const,
    stimulus: textStimulus(
      "모든 바이올린 연주자는 음악가다. 어떤 음악가는 교사다. 이 두 문장에서 반드시 참인 것은?",
      "All violinists are musicians. Some musicians are teachers. Given only these two statements, which must be true?",
    ),
    options: textOptions([
      ["v9a", "어떤 바이올린 연주자는 교사다.", "Some violinists are teachers."],
      ["v9b", "모든 음악가는 바이올린 연주자다.", "All musicians are violinists."],
      ["v9c", "모든 바이올린 연주자는 음악가다.", "All violinists are musicians."],
      ["v9d", "어떤 교사도 바이올린을 연주하지 않는다.", "No teacher is a violinist."],
    ]),
    correctOptionIndex: 2,
    recommendedSeconds: 45,
    explanationKo:
      "'어떤 음악가는 교사다'는 그 교사들이 바이올린 연주자인지 아무것도 말해 주지 않는다. 전제로 이미 주어진 첫 문장만 반드시 참이다.",
    explanationEn:
      "\"Some musicians are teachers\" says nothing about whether those teachers play the violin. Only the first premise, restated, is guaranteed.",
  }),
  Object.freeze({
    id: 10,
    domain: "verbalReasoning" as const,
    stimulus: textStimulus(
      "달리기에서 미나는 준호보다 먼저 들어왔고, 준호는 세나보다 먼저, 세나는 도윤보다 먼저 들어왔다. 세 번째로 들어온 사람은?",
      "In a race, Mina finished ahead of Junho, Junho finished ahead of Sena, and Sena finished ahead of Doyun. Who finished third?",
    ),
    options: textOptions([
      ["v10a", "미나", "Mina"],
      ["v10b", "준호", "Junho"],
      ["v10c", "세나", "Sena"],
      ["v10d", "도윤", "Doyun"],
    ]),
    correctOptionIndex: 2,
    recommendedSeconds: 50,
    explanationKo:
      "세 관계를 이어 붙이면 순서가 하나로 정해진다. 미나 - 준호 - 세나 - 도윤이므로 세 번째는 세나다.",
    explanationEn:
      "Chaining the three relations fixes a single order: Mina, Junho, Sena, Doyun. The third finisher is Sena.",
  }),
  Object.freeze({
    id: 11,
    domain: "verbalReasoning" as const,
    stimulus: textStimulus(
      "'비가 오면 경기가 취소된다'가 참이다. 그런데 경기는 취소되지 않았다. 반드시 참인 것은?",
      "\"If it rains, the match is cancelled\" is true. The match was not cancelled. What must be true?",
    ),
    options: textOptions([
      ["v11a", "비가 왔다.", "It rained."],
      ["v11b", "비가 오지 않았다.", "It did not rain."],
      ["v11c", "비가 왔는지는 알 수 없다.", "Whether it rained cannot be determined."],
      ["v11d", "경기가 연기되었다.", "The match was postponed."],
    ]),
    correctOptionIndex: 1,
    recommendedSeconds: 60,
    explanationKo:
      "비가 왔다면 규칙에 따라 경기는 반드시 취소됐어야 한다. 취소되지 않았다는 사실이 비가 오지 않았음을 되짚어 준다.",
    explanationEn:
      "Had it rained, the rule would have forced a cancellation. The match surviving therefore rules the rain out.",
  }),
  Object.freeze({
    id: 12,
    domain: "verbalReasoning" as const,
    stimulus: textStimulus(
      "빨강·파랑·초록·노랑 책 네 권이 위에서 아래로 한 줄로 쌓여 있다. 파랑은 초록 바로 위에 있고, 빨강은 초록과 맞닿아 있지 않으며, 노랑은 맨 아래다. 맨 위에 있는 책은?",
      "Four books - red, blue, green and yellow - are stacked in a single pile from top to bottom. Blue sits directly on top of green, red is not touching green, and yellow is at the bottom. Which book is on top?",
    ),
    options: textOptions([
      ["v12a", "빨강", "Red"],
      ["v12b", "파랑", "Blue"],
      ["v12c", "초록", "Green"],
      ["v12d", "노랑", "Yellow"],
    ]),
    correctOptionIndex: 0,
    recommendedSeconds: 105,
    explanationKo:
      "노랑이 네 번째 자리이므로 파랑-초록 쌍은 1-2 또는 2-3에 놓인다. 1-2에 놓으면 빨강이 3번이 되어 초록(2번)과 맞닿아 조건을 어긴다. 남는 배치는 빨강-파랑-초록-노랑 하나뿐이고 맨 위는 빨강이다.",
    explanationEn:
      "Yellow takes the fourth slot, so the blue-green pair sits either at 1-2 or at 2-3. At 1-2 red would land in slot 3, touching green in slot 2, which is forbidden. Only red, blue, green, yellow survives, so red is on top.",
  }),
]);

const ROTATION_ITEMS: readonly RotationItem[] = Object.freeze([
  Object.freeze({
    id: 13,
    domain: "threeDimensionalRotation" as const,
    stimulus: polycube(SCREW_4, NO_ROTATION),
    options: Object.freeze([
      polycubeOption("r13a", SCREW_4_MIRROR, rotation(0, 0, 90)),
      polycubeOption("r13b", SCREW_4, rotation(0, 90, 0)),
      polycubeOption("r13c", FLAT_S_4, rotation(0, 0, 180)),
      polycubeOption("r13d", FLAT_L_4, rotation(90, 0, 0)),
    ]),
    correctOptionIndex: 1,
    recommendedSeconds: 60,
    explanationKo:
      "정답 보기는 자극과 같은 네 개의 정육면체를 y축으로 90도 돌려 놓은 것이다. 첫 번째 보기는 거울상이라 아무리 돌려도 겹치지 않고, 나머지 둘은 평면으로 눕혀진 다른 도형이다.",
    explanationEn:
      "The correct option is the same four cubes turned 90 degrees about the vertical axis. The first option is the mirror image, which no rotation can match, and the other two are flat figures with a different shape.",
  }),
  Object.freeze({
    id: 14,
    domain: "threeDimensionalRotation" as const,
    stimulus: polycube(SCREW_5, NO_ROTATION),
    options: Object.freeze([
      polycubeOption("r14a", FLAT_U_5, rotation(0, 0, 90)),
      polycubeOption("r14b", SCREW_5_MIRROR, rotation(90, 0, 0)),
      polycubeOption("r14c", SCREW_5, rotation(90, 0, 180)),
      polycubeOption("r14d", FLAT_ZIGZAG_5, rotation(0, 90, 0)),
      polycubeOption("r14e", SCREW_5_MIRROR, rotation(0, 180, 0)),
    ]),
    correctOptionIndex: 2,
    recommendedSeconds: 75,
    explanationKo:
      "긴 팔 세 칸 끝에서 한 번 꺾이고 다시 위로 꺾이는 순서가 자극과 같아야 한다. 정답 보기만 그 순서가 유지되고, 두 개의 거울상 보기는 꺾이는 방향이 반대다.",
    explanationEn:
      "The three-cube arm must bend once and then rise in the same order as the stimulus. Only the correct option preserves that order; the two mirror options bend the opposite way.",
  }),
  Object.freeze({
    id: 15,
    domain: "threeDimensionalRotation" as const,
    stimulus: polycube(TWIST_5, rotation(0, 0, 90)),
    options: Object.freeze([
      polycubeOption("r15a", TWIST_5_MIRROR, rotation(0, 90, 0)),
      polycubeOption("r15b", FLAT_STAIR_5, rotation(0, 0, 270)),
      polycubeOption("r15c", TWIST_5_MOVED, rotation(180, 0, 0)),
      polycubeOption("r15d", TWIST_5, rotation(180, 90, 0)),
      polycubeOption("r15e", TWIST_5_MIRROR, rotation(90, 0, 180)),
    ]),
    correctOptionIndex: 3,
    recommendedSeconds: 90,
    explanationKo:
      "자극은 두 번 꺾이며 한쪽으로 감기는 도형이다. 정답 보기는 그 도형을 두 축으로 돌린 것이고, 세 번째 보기는 정육면체 하나가 다른 자리로 옮겨져 감기는 방향이 끊긴다.",
    explanationEn:
      "The stimulus bends twice and winds to one side. The correct option is that figure turned about two axes, while the third option has one cube moved, breaking the winding.",
  }),
  Object.freeze({
    id: 16,
    domain: "threeDimensionalRotation" as const,
    stimulus: polycube(SPIRAL_6, rotation(90, 0, 0)),
    options: Object.freeze([
      polycubeOption("r16a", SPIRAL_6_MIRROR, rotation(0, 0, 180)),
      polycubeOption("r16b", BENT_6, rotation(90, 90, 0)),
      polycubeOption("r16c", SPIRAL_6_MOVED, rotation(0, 270, 0)),
      polycubeOption("r16d", FLAT_STAIR_6, rotation(0, 0, 90)),
      polycubeOption("r16e", SPIRAL_6, rotation(0, 270, 180)),
    ]),
    correctOptionIndex: 4,
    recommendedSeconds: 110,
    explanationKo:
      "여섯 칸이 세 번 꺾이며 나선을 그린다. 정답 보기만 꺾이는 방향과 순서가 모두 자극과 같고, 나머지는 거울상이거나 마지막 칸이 다른 방향으로 붙은 도형이다.",
    explanationEn:
      "The six cubes bend three times to form a spiral. Only the correct option keeps both the direction and the order of those bends; the rest are mirrored or have the last cube attached elsewhere.",
  }),
]);

/** 제시 순서. 형식별로 묶어 두면 응답자가 매 문항 사고방식을 갈아타지 않아도 된다. */
export const ITEMS: readonly Item[] = Object.freeze([
  ...SERIES_ITEMS,
  ...MATRIX_ITEMS,
  ...VERBAL_ITEMS,
  ...ROTATION_ITEMS,
]);

export function itemsOfDomain(domain: CognitiveDomain): readonly Item[] {
  return ITEMS.filter((item) => item.domain === domain);
}

export function itemById(id: number): Item | undefined {
  return ITEMS.find((item) => item.id === id);
}
