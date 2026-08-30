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

// 확장 문항(005-008)용 추가 행렬 자극. 기존 3개와 같은 방식(귀납 규칙을 행마다 한 칸씩 밀어
// 3칸 창으로 보여주는 패턴)이며, 도형·순환만 다르게 해서 문항을 재사용하지 않는다.
const gfMatrix2 = matrix([
  matrixCell("diamond"), matrixCell("circle"), matrixCell("arrow"),
  matrixCell("circle"), matrixCell("arrow"), matrixCell("square"),
  matrixCell("arrow"), matrixCell("square"), blankCell(),
]);

const gvMatrixShape2 = matrix([
  matrixCell("square", "none", 90), matrixCell("square", "none", 180), matrixCell("square", "none", 270),
  matrixCell("square", "none", 180), matrixCell("square", "none", 270), matrixCell("square", "none", 0),
  matrixCell("square", "none", 270), matrixCell("square", "none", 0), blankCell(),
]);

const gvMatrixFill2 = matrix([
  matrixCell("triangle", "none"), matrixCell("triangle", "hatch"), matrixCell("triangle", "solid"),
  matrixCell("diamond", "none"), matrixCell("diamond", "hatch"), matrixCell("diamond", "solid"),
  matrixCell("circle", "none"), matrixCell("circle", "hatch"), blankCell(),
]);

export const ITEM_BANK = Object.freeze([
  item({ id: "001", domain: "gf", stimulus: text("3, 6, 12, 24, ?", "3, 6, 12, 24, ?"), options: [option("pilot:gf:001:a", "36"), option("pilot:gf:001:b", "42"), option("pilot:gf:001:c", "48"), option("pilot:gf:001:d", "54")], correct: "c", difficulty: -0.8, rationale: { "pilot:gf:001:a": "증가량을 3으로 고정", "pilot:gf:001:b": "두 배 규칙을 한 번만 적용", "pilot:gf:001:d": "마지막 항에 30을 더함" } }),
  item({ id: "002", domain: "gf", stimulus: text("1, 4, 9, 16, ?", "1, 4, 9, 16, ?"), options: [option("pilot:gf:002:a", "20"), option("pilot:gf:002:b", "24"), option("pilot:gf:002:c", "25"), option("pilot:gf:002:d", "27")], correct: "c", difficulty: -0.2, rationale: { "pilot:gf:002:a": "차이의 증가를 과소추정", "pilot:gf:002:b": "마지막 항에 8을 더함", "pilot:gf:002:d": "제곱 대신 세제곱 일부를 사용" } }),
  item({ id: "003", domain: "gf", stimulus: gfMatrix, options: [matrixOption("pilot:gf:003:a", matrixCell("circle")), matrixOption("pilot:gf:003:b", matrixCell("square")), matrixOption("pilot:gf:003:c", matrixCell("triangle")), matrixOption("pilot:gf:003:d", matrixCell("arrow"))], correct: "d", difficulty: 0.1, visual: true, rationale: { "pilot:gf:003:a": "행의 첫 도형을 반복", "pilot:gf:003:b": "열의 두 번째 도형을 반복", "pilot:gf:003:c": "대각선의 중간 도형을 반복" } }),
  item({ id: "004", domain: "gf", stimulus: text("2, 5, 10, 17, ?", "2, 5, 10, 17, ?"), options: [option("pilot:gf:004:a", "24"), option("pilot:gf:004:b", "25"), option("pilot:gf:004:c", "26"), option("pilot:gf:004:d", "28")], correct: "c", difficulty: 0.5, rationale: { "pilot:gf:004:a": "차이를 3, 5, 7로 읽지 않음", "pilot:gf:004:b": "직전 항에 8을 더함", "pilot:gf:004:d": "차이를 3, 5, 7, 11로 가정" } }),
  item({ id: "005", domain: "gf", stimulus: text("4, 8, 12, 16, ?", "4, 8, 12, 16, ?"), options: [option("pilot:gf:005:a", "18"), option("pilot:gf:005:b", "20"), option("pilot:gf:005:c", "24"), option("pilot:gf:005:d", "22")], correct: "b", difficulty: -1.5, rationale: { "pilot:gf:005:a": "증가량을 2로 착각", "pilot:gf:005:c": "증가량을 두 배로 적용", "pilot:gf:005:d": "증가량을 6으로 착각" } }),
  item({ id: "006", domain: "gf", stimulus: text("3, 4, 6, 9, 13, ?", "3, 4, 6, 9, 13, ?"), options: [option("pilot:gf:006:a", "17"), option("pilot:gf:006:b", "16"), option("pilot:gf:006:c", "18"), option("pilot:gf:006:d", "19")], correct: "c", difficulty: 0, rationale: { "pilot:gf:006:a": "차이 증가량을 4로 착각", "pilot:gf:006:b": "차이 증가량을 3으로 착각", "pilot:gf:006:d": "차이 증가량을 6으로 착각" } }),
  item({ id: "007", domain: "gf", stimulus: gfMatrix2, options: [matrixOption("pilot:gf:007:a", matrixCell("square")), matrixOption("pilot:gf:007:b", matrixCell("arrow")), matrixOption("pilot:gf:007:c", matrixCell("circle")), matrixOption("pilot:gf:007:d", matrixCell("triangle"))], correct: "d", difficulty: 0.9, visual: true, rationale: { "pilot:gf:007:a": "행의 두 번째 도형을 반복", "pilot:gf:007:b": "행의 첫 도형을 반복", "pilot:gf:007:c": "이전 행의 첫 도형을 반복" } }),
  item({ id: "008", domain: "gf", stimulus: text("2, 3, 5, 8, 13, ?", "2, 3, 5, 8, 13, ?"), options: [option("pilot:gf:008:a", "20"), option("pilot:gf:008:b", "21"), option("pilot:gf:008:c", "23"), option("pilot:gf:008:d", "18")], correct: "b", difficulty: 1.8, rationale: { "pilot:gf:008:a": "직전 두 항의 합에서 1을 뺌", "pilot:gf:008:c": "직전 두 항의 합에 2를 더함", "pilot:gf:008:d": "직전 항에 5를 더함" } }),

  item({ id: "001", domain: "gc", stimulus: text("낫 : 풀 = 가위 : ?", "Sickle : grass = scissors : ?"), options: [option("pilot:gc:001:a", "종이", "paper"), option("pilot:gc:001:b", "나무", "wood"), option("pilot:gc:001:c", "못", "nail"), option("pilot:gc:001:d", "물", "water")], correct: "a", difficulty: -0.7, rationale: { "pilot:gc:001:b": "재료 관계로 오해", "pilot:gc:001:c": "도구와 대상의 관계를 놓침", "pilot:gc:001:d": "기능과 무관한 선택" } }),
  item({ id: "002", domain: "gc", stimulus: text("‘유보하다’와 뜻이 가장 가까운 말은?", "Which word is closest in meaning to ‘유보하다’ (to defer)?"), options: [option("pilot:gc:002:a", "미루다", "defer"), option("pilot:gc:002:b", "서두르다", "hasten"), option("pilot:gc:002:c", "기록하다", "record"), option("pilot:gc:002:d", "확정하다", "finalize")], correct: "a", difficulty: -0.1, rationale: { "pilot:gc:002:b": "반대 방향의 행동", "pilot:gc:002:c": "기록 행위로 혼동", "pilot:gc:002:d": "결정을 끝내는 의미로 혼동" } }),
  item({ id: "003", domain: "gc", stimulus: text("모든 나무는 식물이다. 일부 정원수는 나무다. 반드시 참인 것은?", "All trees are plants. Some garden plants are trees. What must be true?"), options: [option("pilot:gc:003:a", "모든 정원수는 식물이다", "All garden plants are plants"), option("pilot:gc:003:b", "일부 정원수는 식물이다", "Some garden plants are plants"), option("pilot:gc:003:c", "모든 식물은 나무다", "All plants are trees"), option("pilot:gc:003:d", "나무가 아닌 식물은 없다", "There are no non-tree plants")], correct: "b", difficulty: 0.2, rationale: { "pilot:gc:003:a": "일부를 전체로 확대", "pilot:gc:003:c": "포함관계를 역전", "pilot:gc:003:d": "존재하지 않는 배제 조건을 추가" } }),
  item({ id: "004", domain: "gc", stimulus: text("도서관 좌석은 예약이 있어야 사용할 수 있다. 민서는 예약 없이 도서관에 갔다. 이 정보만으로 반드시 말할 수 있는 것은?", "Library seats can be used only with a reservation. Min visited without a reservation. What follows from this information alone?"), options: [option("pilot:gc:004:a", "민서는 책을 빌릴 수 없다", "Min cannot borrow a book"), option("pilot:gc:004:b", "민서는 좌석을 예약했다", "Min reserved a seat"), option("pilot:gc:004:c", "민서는 예약 없이 좌석을 사용할 수 없다", "Min cannot use a seat without a reservation"), option("pilot:gc:004:d", "도서관은 문을 닫았다", "The library is closed")], correct: "c", difficulty: 0.8, rationale: { "pilot:gc:004:a": "대출 규칙을 새로 가정", "pilot:gc:004:b": "주어진 사실과 반대", "pilot:gc:004:d": "운영 시간 정보를 추가" } }),
  item({ id: "005", domain: "gc", stimulus: text("열쇠 : 자물쇠 = 리모컨 : ?", "Key : lock = remote control : ?"), options: [option("pilot:gc:005:a", "텔레비전", "television"), option("pilot:gc:005:b", "건전지", "battery"), option("pilot:gc:005:c", "채널", "channel"), option("pilot:gc:005:d", "거실", "living room")], correct: "a", difficulty: -1.3, rationale: { "pilot:gc:005:b": "부품 관계로 오해", "pilot:gc:005:c": "조작 결과와 대상을 혼동", "pilot:gc:005:d": "장소로 대상을 대체" } }),
  item({ id: "006", domain: "gc", stimulus: text("‘신중하다’와 뜻이 가장 가까운 말은?", "Which word is closest in meaning to ‘신중하다’ (prudent)?"), options: [option("pilot:gc:006:a", "성급하다", "hasty"), option("pilot:gc:006:b", "조심스럽다", "careful"), option("pilot:gc:006:c", "무관심하다", "indifferent"), option("pilot:gc:006:d", "활발하다", "active")], correct: "b", difficulty: -0.3, rationale: { "pilot:gc:006:a": "반대 의미의 단어", "pilot:gc:006:c": "무관한 태도로 오해", "pilot:gc:006:d": "활동성과 혼동" } }),
  item({ id: "007", domain: "gc", stimulus: text("모든 새는 날개가 있다. 참새는 새다. 반드시 참인 것은?", "All birds have wings. A sparrow is a bird. What must be true?"), options: [option("pilot:gc:007:a", "날개가 있으면 새다", "Anything with wings is a bird"), option("pilot:gc:007:b", "참새는 날개가 있다", "The sparrow has wings"), option("pilot:gc:007:c", "모든 동물은 날개가 있다", "All animals have wings"), option("pilot:gc:007:d", "참새는 날 수 있다", "The sparrow can fly")], correct: "b", difficulty: 0.4, rationale: { "pilot:gc:007:a": "조건의 방향을 뒤집음", "pilot:gc:007:c": "전제를 모든 동물로 확대", "pilot:gc:007:d": "날개 보유에서 비행 능력을 추론" } }),
  item({ id: "008", domain: "gc", stimulus: text("회의에 참석한 사람은 모두 보고서를 받는다. 준호는 보고서를 받지 못했다. 이 정보만으로 반드시 참인 것은?", "Everyone who attends the meeting receives a report. Junho did not receive a report. What follows from this information alone?"), options: [option("pilot:gc:008:a", "준호는 회의에 참석했다", "Junho attended the meeting"), option("pilot:gc:008:b", "회의는 취소되었다", "The meeting was cancelled"), option("pilot:gc:008:c", "준호는 회의에 참석하지 않았다", "Junho did not attend the meeting"), option("pilot:gc:008:d", "보고서가 아직 작성되지 않았다", "The report has not been written yet")], correct: "c", difficulty: 1, rationale: { "pilot:gc:008:a": "주어진 사실과 반대", "pilot:gc:008:b": "근거 없는 상황을 추가", "pilot:gc:008:d": "작성 여부에 대한 새 가정" } }),

  item({ id: "001", domain: "gv", stimulus: gvMatrixShape, options: [matrixOption("pilot:gv:001:a", matrixCell("triangle", "none", 0)), matrixOption("pilot:gv:001:b", matrixCell("triangle", "none", 90)), matrixOption("pilot:gv:001:c", matrixCell("triangle", "none", 180)), matrixOption("pilot:gv:001:d", matrixCell("triangle", "none", 270))], correct: "a", difficulty: 0.3, visual: true, rationale: { "pilot:gv:001:a": "행과 열에서 90도씩 진행하는 회전 규칙", "pilot:gv:001:b": "두 번째 행의 회전을 그대로 복사", "pilot:gv:001:c": "대각선의 180도 회전만 반복" } }),
  item({ id: "002", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]), options: [option("pilot:gv:002:a", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }])), option("pilot:gv:002:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }])), option("pilot:gv:002:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }])), option("pilot:gv:002:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }]))], correct: "a", difficulty: 0.6, visual: true, rationale: { "pilot:gv:002:b": "한 큐브를 인접한 평면으로 이동", "pilot:gv:002:c": "수직 큐브를 같은 평면으로 접음", "pilot:gv:002:d": "연결 관계를 유지하지 않는 변형" } }),
  item({ id: "003", domain: "gv", stimulus: gvMatrixFill, options: [matrixOption("pilot:gv:003:a", matrixCell("diamond", "none")), matrixOption("pilot:gv:003:b", matrixCell("diamond", "hatch")), matrixOption("pilot:gv:003:c", matrixCell("diamond", "solid")), matrixOption("pilot:gv:003:d", matrixCell("circle", "solid"))], correct: "c", difficulty: 0.4, visual: true, rationale: { "pilot:gv:003:a": "열의 첫 채움을 반복", "pilot:gv:003:b": "열의 두 번째 채움을 반복", "pilot:gv:003:d": "행의 도형 규칙을 채움 규칙과 혼합" } }),
  item({ id: "004", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }]), options: [option("pilot:gv:004:a", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 2, z: 1 }])), option("pilot:gv:004:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }])), option("pilot:gv:004:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 1, z: 1 }])), option("pilot:gv:004:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 1 }]))], correct: "b", difficulty: 1.1, visual: true, rationale: { "pilot:gv:004:a": "회전 뒤의 축을 하나 바꿈", "pilot:gv:004:c": "마지막 두 큐브의 꺾임 위치를 변경", "pilot:gv:004:d": "대각선으로 큐브를 이동" } }),
  item({ id: "005", domain: "gv", stimulus: gvMatrixShape2, options: [matrixOption("pilot:gv:005:a", matrixCell("square", "none", 0)), matrixOption("pilot:gv:005:b", matrixCell("square", "none", 90)), matrixOption("pilot:gv:005:c", matrixCell("square", "none", 180)), matrixOption("pilot:gv:005:d", matrixCell("square", "none", 270))], correct: "b", difficulty: -1.2, visual: true, rationale: { "pilot:gv:005:a": "회전 순환의 시작 각도로 되돌아감", "pilot:gv:005:c": "직전 행의 각도를 반복", "pilot:gv:005:d": "두 행 전의 각도를 반복" } }),
  item({ id: "006", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]), options: [option("pilot:gv:006:a", "", "", spatial([{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }])), option("pilot:gv:006:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }])), option("pilot:gv:006:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }])), option("pilot:gv:006:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 1 }]))], correct: "a", difficulty: -0.3, visual: true, rationale: { "pilot:gv:006:b": "꺾인 지점을 원점에서 팔 끝으로 이동", "pilot:gv:006:c": "한 팔의 길이를 2칸으로 늘려 간격을 만듦", "pilot:gv:006:d": "한 큐브를 세로 축으로 들어올림" } }),
  item({ id: "007", domain: "gv", stimulus: gvMatrixFill2, options: [matrixOption("pilot:gv:007:a", matrixCell("circle", "none")), matrixOption("pilot:gv:007:b", matrixCell("circle", "hatch")), matrixOption("pilot:gv:007:c", matrixCell("circle", "solid")), matrixOption("pilot:gv:007:d", matrixCell("diamond", "solid"))], correct: "c", difficulty: 0.7, visual: true, rationale: { "pilot:gv:007:a": "열의 첫 채움을 반복", "pilot:gv:007:b": "열의 두 번째 채움을 반복", "pilot:gv:007:d": "이전 행의 도형과 채움을 혼합" } }),
  item({ id: "008", domain: "gv", stimulus: spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }, { x: 3, y: 2, z: 0 }]), options: [option("pilot:gv:008:a", "", "", spatial([{ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 3, y: 2, z: 0 }, { x: 2, y: 2, z: 0 }])), option("pilot:gv:008:b", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }, { x: 3, y: 3, z: 0 }])), option("pilot:gv:008:c", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }])), option("pilot:gv:008:d", "", "", spatial([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }, { x: 2, y: 2, z: 0 }, { x: 3, y: 2, z: 0 }]))], correct: "a", difficulty: 1.6, visual: true, rationale: { "pilot:gv:008:b": "마지막 계단의 위치를 어긋나게 이동", "pilot:gv:008:c": "마지막 두 계단이 다시 내려감", "pilot:gv:008:d": "세 번째 계단을 세로로만 늘림" } }),

  item({ id: "001", domain: "gwm", stimulus: text("다음 순서를 거꾸로 고르면? 소나무 – 달 – 강 – 별", "Choose the sequence in reverse order: pine – moon – river – star"), options: [option("pilot:gwm:001:a", "별 – 강 – 달 – 소나무", "star – river – moon – pine"), option("pilot:gwm:001:b", "별 – 달 – 강 – 소나무", "star – moon – river – pine"), option("pilot:gwm:001:c", "강 – 별 – 달 – 소나무", "river – star – moon – pine"), option("pilot:gwm:001:d", "달 – 강 – 별 – 소나무", "moon – river – star – pine")], correct: "a", difficulty: -0.4, rationale: { "pilot:gwm:001:b": "중간 두 항을 교환", "pilot:gwm:001:c": "첫 두 항의 순서를 유지", "pilot:gwm:001:d": "한 칸씩만 이동" } }),
  item({ id: "002", domain: "gwm", stimulus: text("4에서 시작해 +3, ×2, −5를 차례로 적용하면?", "Starting at 4, apply +3, ×2, then −5. What is the result?"), options: [option("pilot:gwm:002:a", "7"), option("pilot:gwm:002:b", "9"), option("pilot:gwm:002:c", "11"), option("pilot:gwm:002:d", "13")], correct: "b", difficulty: 0.2, rationale: { "pilot:gwm:002:a": "곱셈 단계를 생략", "pilot:gwm:002:c": "마지막 뺄셈을 적용하지 않음", "pilot:gwm:002:d": "연산 순서를 바꿈" } }),
  item({ id: "003", domain: "gwm", stimulus: text("A B C A D A E — 바로 앞의 A와 같은 위치에 있는 문자는 몇 개인가?", "A B C A D A E — how many letters are immediately preceded by A?"), options: [option("pilot:gwm:003:a", "1"), option("pilot:gwm:003:b", "2"), option("pilot:gwm:003:c", "3"), option("pilot:gwm:003:d", "4")], correct: "b", difficulty: 0.7, rationale: { "pilot:gwm:003:a": "첫 A를 세지 않음", "pilot:gwm:003:c": "A 자체를 모두 세기", "pilot:gwm:003:d": "마지막 항을 중복 계산" } }),
  item({ id: "004", domain: "gwm", stimulus: text("숫자 5에 다음 규칙을 순서대로 적용한다: 홀수면 +4, 짝수면 ÷2. 3회 적용 후 값은?", "Start at 5. Apply three times: if odd, add 4; if even, divide by 2. What is the final value?"), options: [option("pilot:gwm:004:a", "17"), option("pilot:gwm:004:b", "9"), option("pilot:gwm:004:c", "13"), option("pilot:gwm:004:d", "5")], correct: "a", difficulty: 1, rationale: { "pilot:gwm:004:b": "첫 두 단계까지만 계산", "pilot:gwm:004:c": "첫 단계만 계산", "pilot:gwm:004:d": "홀수 규칙의 결과를 잘못 적용" } }),
  item({ id: "005", domain: "gwm", stimulus: text("다음 순서를 거꾸로 고르면? 7 – 2 – 9 – 4", "Choose the sequence in reverse order: 7 – 2 – 9 – 4"), options: [option("pilot:gwm:005:a", "4 – 9 – 2 – 7"), option("pilot:gwm:005:b", "4 – 2 – 9 – 7"), option("pilot:gwm:005:c", "9 – 4 – 2 – 7"), option("pilot:gwm:005:d", "2 – 4 – 9 – 7")], correct: "a", difficulty: -1.2, rationale: { "pilot:gwm:005:b": "중간 두 항을 교환", "pilot:gwm:005:c": "첫 두 항의 순서를 유지", "pilot:gwm:005:d": "한 칸씩만 이동" } }),
  item({ id: "006", domain: "gwm", stimulus: text("6에서 시작해 ×2, −3, +5를 차례로 적용하면?", "Starting at 6, apply ×2, −3, then +5. What is the result?"), options: [option("pilot:gwm:006:a", "9"), option("pilot:gwm:006:b", "14"), option("pilot:gwm:006:c", "17"), option("pilot:gwm:006:d", "10")], correct: "b", difficulty: -0.1, rationale: { "pilot:gwm:006:a": "마지막 덧셈 단계를 생략", "pilot:gwm:006:c": "가운데 뺄셈 단계를 생략", "pilot:gwm:006:d": "첫 곱셈 대신 덧셈을 적용" } }),
  item({ id: "007", domain: "gwm", stimulus: text("P Q R P S P T — P 바로 다음에 오는 문자는 모두 몇 개인가?", "P Q R P S P T — how many letters immediately follow a P?"), options: [option("pilot:gwm:007:a", "1"), option("pilot:gwm:007:b", "2"), option("pilot:gwm:007:c", "3"), option("pilot:gwm:007:d", "4")], correct: "c", difficulty: 0.6, rationale: { "pilot:gwm:007:a": "첫 P만 세기", "pilot:gwm:007:b": "마지막 P 뒤는 세지 않음", "pilot:gwm:007:d": "P 자체를 함께 세기" } }),
  item({ id: "008", domain: "gwm", stimulus: text("숫자 3에 다음 규칙을 순서대로 4회 적용한다: 짝수면 ÷2, 홀수면 ×3+1. 4회 적용 후 값은?", "Start at 3. Apply four times: if even, divide by 2; if odd, multiply by 3 and add 1. What is the final value?"), options: [option("pilot:gwm:008:a", "16"), option("pilot:gwm:008:b", "5"), option("pilot:gwm:008:c", "10"), option("pilot:gwm:008:d", "8")], correct: "d", difficulty: 1.9, rationale: { "pilot:gwm:008:a": "세 번째 단계까지만 계산", "pilot:gwm:008:b": "두 번째 단계까지만 계산", "pilot:gwm:008:c": "첫 단계까지만 계산" } }),

  item({ id: "001", domain: "gs", stimulus: text("다음 줄에서 ‘A7’은 몇 번 나타나는가? A7 · B3 · A7 · C2 · D4", "How many times does ‘A7’ appear? A7 · B3 · A7 · C2 · D4"), options: [option("pilot:gs:001:a", "1"), option("pilot:gs:001:b", "2"), option("pilot:gs:001:c", "3"), option("pilot:gs:001:d", "4")], correct: "b", difficulty: -0.6, rationale: { "pilot:gs:001:a": "첫 번째 표적만 탐색", "pilot:gs:001:c": "A로 시작하는 항을 모두 표적으로 처리", "pilot:gs:001:d": "문자와 숫자를 분리해 오탐" } }),
  item({ id: "002", domain: "gs", stimulus: text("기준 기호 ‘▲●’와 순서·모양이 모두 같은 것은?", "Which option matches the target symbols ‘▲●’ in both order and shape?"), options: [option("pilot:gs:002:a", "▲●"), option("pilot:gs:002:b", "●▲"), option("pilot:gs:002:c", "▲○"), option("pilot:gs:002:d", "△●")], correct: "a", difficulty: 0, rationale: { "pilot:gs:002:b": "순서를 뒤집음", "pilot:gs:002:c": "두 번째 기호의 채움을 변경", "pilot:gs:002:d": "첫 번째 기호의 윤곽을 변경" } }),
  item({ id: "003", domain: "gs", stimulus: text("문자열 K4 · M2 · K4 · P9 · K5에서 ‘K’로 시작하는 항은?", "How many entries begin with ‘K’? K4 · M2 · K4 · P9 · K5"), options: [option("pilot:gs:003:a", "1"), option("pilot:gs:003:b", "2"), option("pilot:gs:003:c", "3"), option("pilot:gs:003:d", "4")], correct: "c", difficulty: 0.5, rationale: { "pilot:gs:003:a": "첫 항만 선택", "pilot:gs:003:b": "중복된 K4를 하나로 처리", "pilot:gs:003:d": "K가 아닌 항을 포함" } }),
  item({ id: "004", domain: "gs", stimulus: text("규칙이 ◇=2, ○=3, △=4일 때 ○△◇의 합은?", "If ◇=2, ○=3 and △=4, what is the sum ○△◇?"), options: [option("pilot:gs:004:a", "7"), option("pilot:gs:004:b", "8"), option("pilot:gs:004:c", "9"), option("pilot:gs:004:d", "10")], correct: "c", difficulty: 0.9, rationale: { "pilot:gs:004:a": "세 기호 중 하나를 누락", "pilot:gs:004:b": "◇ 값을 1로 읽음", "pilot:gs:004:d": "기호 순서를 숫자 342로 연결" } }),
  item({ id: "005", domain: "gs", stimulus: text("다음 줄에서 ‘Q9’는 몇 번 나타나는가? Q9 · R2 · Q9 · Q9 · S1", "How many times does ‘Q9’ appear? Q9 · R2 · Q9 · Q9 · S1"), options: [option("pilot:gs:005:a", "2"), option("pilot:gs:005:b", "3"), option("pilot:gs:005:c", "4"), option("pilot:gs:005:d", "1")], correct: "b", difficulty: -1.4, rationale: { "pilot:gs:005:a": "마지막 등장을 세지 않음", "pilot:gs:005:c": "R2를 표적으로 착각해 포함", "pilot:gs:005:d": "첫 등장만 세기" } }),
  item({ id: "006", domain: "gs", stimulus: text("기준 기호 ‘■▲’와 순서·모양이 모두 같은 것은?", "Which option matches the target symbols ‘■▲’ in both order and shape?"), options: [option("pilot:gs:006:a", "■▲"), option("pilot:gs:006:b", "▲■"), option("pilot:gs:006:c", "■△"), option("pilot:gs:006:d", "□▲")], correct: "a", difficulty: -0.1, rationale: { "pilot:gs:006:b": "순서를 뒤집음", "pilot:gs:006:c": "두 번째 기호의 채움을 변경", "pilot:gs:006:d": "첫 번째 기호의 채움을 변경" } }),
  item({ id: "007", domain: "gs", stimulus: text("문자열 T7 · V3 · T7 · W2 · T8에서 ‘T’로 시작하는 항은 몇 개인가?", "How many entries begin with ‘T’? T7 · V3 · T7 · W2 · T8"), options: [option("pilot:gs:007:a", "1"), option("pilot:gs:007:b", "2"), option("pilot:gs:007:c", "3"), option("pilot:gs:007:d", "4")], correct: "c", difficulty: 0.6, rationale: { "pilot:gs:007:a": "첫 항만 선택", "pilot:gs:007:b": "중복된 T7을 하나로 처리", "pilot:gs:007:d": "T가 아닌 항을 포함" } }),
  item({ id: "008", domain: "gs", stimulus: text("규칙이 ★=5, ◆=3, ▼=7일 때 ★▼◆의 합은?", "If ★=5, ◆=3 and ▼=7, what is the sum ★▼◆?"), options: [option("pilot:gs:008:a", "13"), option("pilot:gs:008:b", "15"), option("pilot:gs:008:c", "17"), option("pilot:gs:008:d", "10")], correct: "b", difficulty: 1.7, rationale: { "pilot:gs:008:a": "◆ 값을 1로 읽음", "pilot:gs:008:c": "▼ 값을 9로 착각", "pilot:gs:008:d": "세 기호 중 하나를 누락" } }),
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

export const ITEM_BANK_EXPECTED_COUNT = 40;
export const ITEM_BANK_EXPECTED_PER_DOMAIN = Object.freeze({ gf: 8, gc: 8, gv: 8, gwm: 8, gs: 8 });
