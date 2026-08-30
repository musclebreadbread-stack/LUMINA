/*
 * LUMINA cognitive pilot item bank.
 *
 * These are original Korean/English items written for the pilot.  The
 * parameters below are explicitly provisional starting values for CAT item
 * selection; they are not empirical calibration and must never be used to
 * release an IQ score.  A separate restricted seed script writes the answer
 * keys and metadata to private_cognitive.
 */

const ITEM_BANK_VERSION = "cognitive-pilot-v1";
const CALIBRATION_VERSION = "ko-adult-pilot-2026-08";
const ALGORITHM_VERSION = "cat-v1";

function text(ko, en = ko) {
  return { kind: "text", textKo: ko, textEn: en };
}

function option(id, ko, en = ko, figure = null) {
  return { id, labelKo: ko, labelEn: en, figure };
}

function matrixCell(shape, fill = "solid", rotationDegrees = 0) {
  return { kind: "figure", shape, fill, rotationDegrees };
}

function blankCell() {
  return { kind: "blank", shape: null, fill: null, rotationDegrees: null };
}

function matrix(cells) {
  return { kind: "matrix", cells };
}

function matrixOption(id, cell) {
  return option(id, "", "", matrix([cell, blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell(), blankCell()]));
}

function spatial(cubes) {
  return { kind: "spatial", cubes };
}

function metadata(domain, visual, rationale) {
  return {
    construct: domain,
    sourceStandard: "CHC broad-ability taxonomy and ICAR task-format literature",
    sourceProvenance: "LUMINA original item; no proprietary item or norm was copied",
    calibrationStatus: "provisional_start_value",
    calibrationModel: "3pl",
    calibrationSampleSize: 0,
    contentReviewStatus: "pending_independent_review",
    cognitiveInterviewStatus: "pending",
    visualAccessibilityStatus: visual ? "vector_renderer_checked_participant_review_pending" : "not_applicable",
    distractorRationale: rationale,
    releaseConstraint: "pilot_only_no_iq_or_percentile",
    references: ["AERA/APA/NCME Standards for Educational and Psychological Testing (2014)", "Condon & Revelle (2014) ICAR format taxonomy"],
  };
}

function item({ id, domain, stimulus, options, correct, difficulty, visual = false, rationale }) {
  return {
    version_id: `pilot:${domain}:${id}`,
    item_bank_version: ITEM_BANK_VERSION,
    calibration_version: CALIBRATION_VERSION,
    domain,
    status: "pilot",
    presentation: { domain, stimulus, options },
    parameters: { discrimination: 1, difficulty, guessing: 0.25 },
    exposure_rate: 0.02,
    correct_option_id: `pilot:${domain}:${id}:${correct}`,
    metadata: metadata(domain, visual, rationale),
  };
}

const gfMatrix = matrix([
  matrixCell("circle"), matrixCell("square"), matrixCell("triangle"),
  matrixCell("square"), matrixCell("triangle"), matrixCell("diamond"),
  matrixCell("triangle"), matrixCell("diamond"), blankCell(),
]);

const gvMatrixShape = matrix([
  matrixCell("triangle", "none", 0), matrixCell("triangle", "none", 90), matrixCell("triangle", "none", 180),
  matrixCell("triangle", "none", 90), matrixCell("triangle", "none", 180), matrixCell("triangle", "none", 270),
  matrixCell("triangle", "none", 180), matrixCell("triangle", "none", 270), blankCell(),
]);

const gvMatrixFill = matrix([
  matrixCell("circle", "none"), matrixCell("circle", "hatch"), matrixCell("circle", "solid"),
  matrixCell("square", "none"), matrixCell("square", "hatch"), matrixCell("square", "solid"),
  matrixCell("diamond", "none"), matrixCell("diamond", "hatch"), blankCell(),
]);

export const ITEM_BANK = Object.freeze([
  item({ id: "001", domain: "gf", stimulus: text("3, 6, 12, 24, ?", "3, 6, 12, 24, ?"), options: [option("pilot:gf:001:a", "36"), option("pilot:gf:001:b", "42"), option("pilot:gf:001:c", "48"), option("pilot:gf:001:d", "54")], correct: "c", difficulty: -0.8, rationale: { "pilot:gf:001:a": "증가량을 3으로 고정", "pilot:gf:001:b": "두 배 규칙을 한 번만 적용", "pilot:gf:001:d": "마지막 항에 30을 더함" } }),
  item({ id: "002", domain: "gf", stimulus: text("1, 4, 9, 16, ?", "1, 4, 9, 16, ?"), options: [option("pilot:gf:002:a", "20"), option("pilot:gf:002:b", "24"), option("pilot:gf:002:c", "25"), option("pilot:gf:002:d", "27")], correct: "c", difficulty: -0.2, rationale: { "pilot:gf:002:a": "차이의 증가를 과소추정", "pilot:gf:002:b": "마지막 항에 8을 더함", "pilot:gf:002:d": "제곱 대신 세제곱 일부를 사용" } }),
  item({ id: "003", domain: "gf", stimulus: gfMatrix, options: [matrixOption("pilot:gf:003:a", matrixCell("circle")), matrixOption("pilot:gf:003:b", matrixCell("square")), matrixOption("pilot:gf:003:c", matrixCell("triangle")), matrixOption("pilot:gf:003:d", matrixCell("arrow"))], correct: "d", difficulty: 0.1, visual: true, rationale: { "pilot:gf:003:a": "행의 첫 도형을 반복", "pilot:gf:003:b": "열의 두 번째 도형을 반복", "pilot:gf:003:c": "대각선의 중간 도형을 반복" } }),
  item({ id: "004", domain: "gf", stimulus: text("2, 5, 10, 17, ?", "2, 5, 10, 17, ?"), options: [option("pilot:gf:004:a", "24"), option("pilot:gf:004:b", "25"), option("pilot:gf:004:c", "26"), option("pilot:gf:004:d", "28")], correct: "c", difficulty: 0.5, rationale: { "pilot:gf:004:a": "차이를 3, 5, 7로 읽지 않음", "pilot:gf:004:b": "직전 항에 8을 더함", "pilot:gf:004:d": "차이를 3, 5, 7, 11로 가정" } }),

  item({ id: "001", domain: "gc", stimulus: text("낫 : 풀 = 가위 : ?", "Sickle : grass = scissors : ?"), options: [option("pilot:gc:001:a", "종이", "paper"), option("pilot:gc:001:b", "나무", "wood"), option("pilot:gc:001:c", "못", "nail"), option("pilot:gc:001:d", "물", "water")], correct: "a", difficulty: -0.7, rationale: { "pilot:gc:001:b": "재료 관계로 오해", "pilot:gc:001:c": "도구와 대상의 관계를 놓침", "pilot:gc:001:d": "기능과 무관한 선택" } }),
  item({ id: "002", domain: "gc", stimulus: text("‘유보하다’와 뜻이 가장 가까운 말은?", "Which word is closest in meaning to ‘유보하다’ (to defer)?"), options: [option("pilot:gc:002:a", "미루다", "defer"), option("pilot:gc:002:b", "서두르다", "hasten"), option("pilot:gc:002:c", "기록하다", "record"), option("pilot:gc:002:d", "확정하다", "finalize")], correct: "a", difficulty: -0.1, rationale: { "pilot:gc:002:b": "반대 방향의 행동", "pilot:gc:002:c": "기록 행위로 혼동", "pilot:gc:002:d": "결정을 끝내는 의미로 혼동" } }),
  item({ id: "003", domain: "gc", stimulus: text("모든 나무는 식물이다. 일부 정원수는 나무다. 반드시 참인 것은?", "All trees are plants. Some garden plants are trees. What must be true?"), options: [option("pilot:gc:003:a", "모든 정원수는 식물이다", "All garden plants are plants"), option("pilot:gc:003:b", "일부 정원수는 식물이다", "Some garden plants are plants"), option("pilot:gc:003:c", "모든 식물은 나무다", "All plants are trees"), option("pilot:gc:003:d", "나무가 아닌 식물은 없다", "There are no non-tree plants")], correct: "b", difficulty: 0.2, rationale: { "pilot:gc:003:a": "일부를 전체로 확대", "pilot:gc:003:c": "포함관계를 역전", "pilot:gc:003:d": "존재하지 않는 배제 조건을 추가" } }),
  item({ id: "004", domain: "gc", stimulus: text("도서관 좌석은 예약이 있어야 사용할 수 있다. 민서는 예약 없이 도서관에 갔다. 이 정보만으로 반드시 말할 수 있는 것은?", "Library seats can be used only with a reservation. Min visited without a reservation. What follows from this information alone?"), options: [option("pilot:gc:004:a", "민서는 책을 빌릴 수 없다", "Min cannot borrow a book"), option("pilot:gc:004:b", "민서는 좌석을 예약했다", "Min reserved a seat"), option("pilot:gc:004:c", "민서는 예약 없이 좌석을 사용할 수 없다", "Min cannot use a seat without a reservation"), option("pilot:gc:004:d", "도서관은 문을 닫았다", "The library is closed")], correct: "c", difficulty: 0.8, rationale: { "pilot:gc:004:a": "대출 규칙을 새로 가정", "pilot:gc:004:b": "주어진 사실과 반대", "pilot:gc:004:d": "운영 시간 정보를 추가" } }),

  item({ id: "001", domain: "gv", stimulus: gvMatrixShape, options: [matrixOption("pilot:gv:001:a", matrixCell("triangle", "none", 0)), matrixOption("pilot:gv:001:b", matrixCell("triangle", "none", 90)), matrixOption("pilot:gv:001:c", matrixCell("triangle", "none", 180)), matrixOption("pilot:gv:001:d", matrixCell("triangle", "none", 270))], correct: "a", difficulty: 0.3, visual: true, rationale: { "pilot:gv:001:a": "행과 열에서 90도씩 진행하는 회전 규칙", "pilot:gv:001:b": "두 번째 행의 회전을 그대로 복사", "pilot:gv:001:c": "대각선의 180도 회전만 반복" } }),
  item({ id: "002", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]), options: [option("pilot:gv:002:a", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }])), option("pilot:gv:002:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }])), option("pilot:gv:002:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }])), option("pilot:gv:002:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }]))], correct: "a", difficulty: 0.6, visual: true, rationale: { "pilot:gv:002:b": "한 큐브를 인접한 평면으로 이동", "pilot:gv:002:c": "수직 큐브를 같은 평면으로 접음", "pilot:gv:002:d": "연결 관계를 유지하지 않는 변형" } }),
  item({ id: "003", domain: "gv", stimulus: gvMatrixFill, options: [matrixOption("pilot:gv:003:a", matrixCell("diamond", "none")), matrixOption("pilot:gv:003:b", matrixCell("diamond", "hatch")), matrixOption("pilot:gv:003:c", matrixCell("diamond", "solid")), matrixOption("pilot:gv:003:d", matrixCell("circle", "solid"))], correct: "c", difficulty: 0.4, visual: true, rationale: { "pilot:gv:003:a": "열의 첫 채움을 반복", "pilot:gv:003:b": "열의 두 번째 채움을 반복", "pilot:gv:003:d": "행의 도형 규칙을 채움 규칙과 혼합" } }),
  item({ id: "004", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }]), options: [option("pilot:gv:004:a", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 2, z: 1 }])), option("pilot:gv:004:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }])), option("pilot:gv:004:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 1, z: 1 }])), option("pilot:gv:004:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 1 }]))], correct: "b", difficulty: 1.1, visual: true, rationale: { "pilot:gv:004:a": "회전 뒤의 축을 하나 바꿈", "pilot:gv:004:c": "마지막 두 큐브의 꺾임 위치를 변경", "pilot:gv:004:d": "대각선으로 큐브를 이동" } }),

  item({ id: "001", domain: "gwm", stimulus: text("다음 순서를 거꾸로 고르면? 소나무 – 달 – 강 – 별", "Choose the sequence in reverse order: pine – moon – river – star"), options: [option("pilot:gwm:001:a", "별 – 강 – 달 – 소나무", "star – river – moon – pine"), option("pilot:gwm:001:b", "별 – 달 – 강 – 소나무", "star – moon – river – pine"), option("pilot:gwm:001:c", "강 – 별 – 달 – 소나무", "river – star – moon – pine"), option("pilot:gwm:001:d", "달 – 강 – 별 – 소나무", "moon – river – star – pine")], correct: "a", difficulty: -0.4, rationale: { "pilot:gwm:001:b": "중간 두 항을 교환", "pilot:gwm:001:c": "첫 두 항의 순서를 유지", "pilot:gwm:001:d": "한 칸씩만 이동" } }),
  item({ id: "002", domain: "gwm", stimulus: text("4에서 시작해 +3, ×2, −5를 차례로 적용하면?", "Starting at 4, apply +3, ×2, then −5. What is the result?"), options: [option("pilot:gwm:002:a", "7"), option("pilot:gwm:002:b", "9"), option("pilot:gwm:002:c", "11"), option("pilot:gwm:002:d", "13")], correct: "b", difficulty: 0.2, rationale: { "pilot:gwm:002:a": "곱셈 단계를 생략", "pilot:gwm:002:c": "마지막 뺄셈을 적용하지 않음", "pilot:gwm:002:d": "연산 순서를 바꿈" } }),
  item({ id: "003", domain: "gwm", stimulus: text("A B C A D A E — 바로 앞의 A와 같은 위치에 있는 문자는 몇 개인가?", "A B C A D A E — how many letters are immediately preceded by A?"), options: [option("pilot:gwm:003:a", "1"), option("pilot:gwm:003:b", "2"), option("pilot:gwm:003:c", "3"), option("pilot:gwm:003:d", "4")], correct: "b", difficulty: 0.7, rationale: { "pilot:gwm:003:a": "첫 A를 세지 않음", "pilot:gwm:003:c": "A 자체를 모두 세기", "pilot:gwm:003:d": "마지막 항을 중복 계산" } }),
  item({ id: "004", domain: "gwm", stimulus: text("숫자 5에 다음 규칙을 순서대로 적용한다: 홀수면 +4, 짝수면 ÷2. 3회 적용 후 값은?", "Start at 5. Apply three times: if odd, add 4; if even, divide by 2. What is the final value?"), options: [option("pilot:gwm:004:a", "17"), option("pilot:gwm:004:b", "9"), option("pilot:gwm:004:c", "13"), option("pilot:gwm:004:d", "5")], correct: "a", difficulty: 1, rationale: { "pilot:gwm:004:b": "첫 두 단계까지만 계산", "pilot:gwm:004:c": "첫 단계만 계산", "pilot:gwm:004:d": "홀수 규칙의 결과를 잘못 적용" } }),

  item({ id: "001", domain: "gs", stimulus: text("다음 줄에서 ‘A7’은 몇 번 나타나는가? A7 · B3 · A7 · C2 · D4", "How many times does ‘A7’ appear? A7 · B3 · A7 · C2 · D4"), options: [option("pilot:gs:001:a", "1"), option("pilot:gs:001:b", "2"), option("pilot:gs:001:c", "3"), option("pilot:gs:001:d", "4")], correct: "b", difficulty: -0.6, rationale: { "pilot:gs:001:a": "첫 번째 표적만 탐색", "pilot:gs:001:c": "A로 시작하는 항을 모두 표적으로 처리", "pilot:gs:001:d": "문자와 숫자를 분리해 오탐" } }),
  item({ id: "002", domain: "gs", stimulus: text("기준 기호 ‘▲●’와 순서·모양이 모두 같은 것은?", "Which option matches the target symbols ‘▲●’ in both order and shape?"), options: [option("pilot:gs:002:a", "▲●"), option("pilot:gs:002:b", "●▲"), option("pilot:gs:002:c", "▲○"), option("pilot:gs:002:d", "△●")], correct: "a", difficulty: 0, rationale: { "pilot:gs:002:b": "순서를 뒤집음", "pilot:gs:002:c": "두 번째 기호의 채움을 변경", "pilot:gs:002:d": "첫 번째 기호의 윤곽을 변경" } }),
  item({ id: "003", domain: "gs", stimulus: text("문자열 K4 · M2 · K4 · P9 · K5에서 ‘K’로 시작하는 항은?", "How many entries begin with ‘K’? K4 · M2 · K4 · P9 · K5"), options: [option("pilot:gs:003:a", "1"), option("pilot:gs:003:b", "2"), option("pilot:gs:003:c", "3"), option("pilot:gs:003:d", "4")], correct: "c", difficulty: 0.5, rationale: { "pilot:gs:003:a": "첫 항만 선택", "pilot:gs:003:b": "중복된 K4를 하나로 처리", "pilot:gs:003:d": "K가 아닌 항을 포함" } }),
  item({ id: "004", domain: "gs", stimulus: text("규칙이 ◇=2, ○=3, △=4일 때 ○△◇의 합은?", "If ◇=2, ○=3 and △=4, what is the sum ○△◇?"), options: [option("pilot:gs:004:a", "7"), option("pilot:gs:004:b", "8"), option("pilot:gs:004:c", "9"), option("pilot:gs:004:d", "10")], correct: "c", difficulty: 0.9, rationale: { "pilot:gs:004:a": "세 기호 중 하나를 누락", "pilot:gs:004:b": "◇ 값을 1로 읽음", "pilot:gs:004:d": "기호 순서를 숫자 342로 연결" } }),
]);

export const CANDIDATE_NORM = Object.freeze({
  id: "ko-adult-pilot-candidate-2026-08",
  status: "candidate",
  target_population: "ko-adults-18-64",
  item_bank_version: ITEM_BANK_VERSION,
  algorithm_version: ALGORITHM_VERSION,
  norm_payload: {
    method: "theoretical_anchor_only",
    sampleSize: 0,
    iqScale: { mean: 100, standardDeviation: 15 },
    thetaAnchor: { mean: 0, standardDeviation: 1, grid: [-4, -3, -2, -1, 0, 1, 2, 3, 4] },
    releaseConstraint: "No population norm, percentile, or IQ estimate may be released until a preregistered Korean adult sample, holdout validation, fairness review, and independent sign-off are complete.",
    source: "No respondent data. Mean 100 / SD 15 is a scale definition only, not a Korean population estimate.",
  },
  validation_manifest_hash: "theoretical-anchor-no-sample",
  approved_at: null,
});

export const ITEM_BANK_EXPECTED_COUNT = 20;
export const ITEM_BANK_EXPECTED_PER_DOMAIN = Object.freeze({ gf: 4, gc: 4, gv: 4, gwm: 4, gs: 4 });
