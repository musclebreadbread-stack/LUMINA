import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import { meaningOf } from "./constants";
import { NUMEROLOGY_CITATIONS } from "./citations";

const CULTURAL_TIER = "cultural" as const;
export type NumerologyNumberKind = "lifePath" | "destiny";

const LENS: Readonly<Record<number, LocalizedText>> = Object.freeze({
  1: Object.freeze({ ko: "스스로 시작하고 이름 붙이는 장면", en: "starting and naming a direction" }),
  2: Object.freeze({ ko: "둘 사이의 균형과 협력", en: "balance and cooperation between two sides" }),
  3: Object.freeze({ ko: "생각을 표현하고 확장하는 과정", en: "expressing and expanding an idea" }),
  4: Object.freeze({ ko: "구조를 만들고 반복하는 습관", en: "building structure and repeating a practice" }),
  5: Object.freeze({ ko: "변화 속에서 자유를 조율하는 선택", en: "choosing how to balance freedom within change" }),
  6: Object.freeze({ ko: "돌봄과 책임의 경계", en: "the boundary between care and responsibility" }),
  7: Object.freeze({ ko: "질문을 깊게 파고드는 시간", en: "time spent following a question deeply" }),
  8: Object.freeze({ ko: "목표와 자원을 현실에 연결하는 실행", en: "connecting goals and resources through action" }),
  9: Object.freeze({ ko: "큰 의미와 포용을 현실에 번역하는 일", en: "translating broad meaning and inclusion into life" }),
  11: Object.freeze({ ko: "영감과 감각을 구체적인 언어로 바꾸는 과정", en: "turning inspiration and sensitivity into concrete language" }),
  22: Object.freeze({ ko: "큰 구상을 단계와 구조로 구현하는 작업", en: "turning a large vision into stages and structure" }),
  33: Object.freeze({ ko: "돌봄과 가르침을 지속 가능한 행동으로 만드는 일", en: "turning care and teaching into sustainable action" }),
});

function block(input: Omit<ExplanationBlock, "tier">): ExplanationBlock {
  return freezeExplanationBlock({ ...input, tier: CULTURAL_TIER });
}

export function numberExplanation(value: number, kind: NumerologyNumberKind): ExplanationBlock {
  const meaning = meaningOf(value);
  const lens = LENS[value] ?? LENS[1]!;
  const kindKo = kind === "lifePath" ? "생애수" : "운명수";
  const kindEn = kind === "lifePath" ? "Life Path Number" : "Destiny Number";
  const masterKo = meaning.isMaster
    ? "11·22·33은 이 전통에서 마스터 넘버로 취급해 한 자리로 더 줄이지 않습니다."
    : "마스터 넘버가 아닌 두 자리 합은 한 자리 또는 마스터 넘버가 될 때까지 줄입니다.";
  const masterEn = meaning.isMaster
    ? "In this tradition, 11, 22, and 33 are kept as Master Numbers rather than reduced to one digit."
    : "A non-master two-digit sum is reduced until it reaches one digit or a Master Number.";

  return block({
    id: `numerology-${kind}-${value}`,
    summary: Object.freeze({
      ko: `${kindKo} ${value}: ${meaning.gloss}`,
      en: `${kindEn} ${value}: ${meaning.glossEn}`,
    }),
    detail: Object.freeze({
      ko: `숫자 ${value}는 ${meaning.keywords.join("·")}라는 키워드와 연결되는 상징적 경향입니다. 이 숫자를 ${lens.ko}을 살펴보는 질문으로 사용할 수 있습니다. ${masterKo} 숫자가 높거나 낮다는 사실은 능력·도덕성·미래 사건의 서열이 아니며, 생애수와 운명수의 값이 같아도 입력 근거가 다르므로 같은 의미를 자동으로 확정하지 않습니다.`,
      en: `Number ${value} is a symbolic tendency associated with ${meaning.keywordsEn.join(", ")}. It can be used to reflect on ${lens.en}. ${masterEn} A number is not a ranking of ability or morality and does not predict a future event. Even when Life Path and Destiny share a value, their input bases differ, so the same number should not be treated as a fixed conclusion.`,
    }),
    method: Object.freeze({
      ko: `${kindKo}는 전통적 피타고라스 숫자 상징을 현대적으로 정리한 표현입니다. 생애수는 생년월일 자릿수 합, 운명수는 로마자 이름의 문자값 합에서 출발합니다. 이 체계는 과학적 성격검사가 아니라 역사적·문화적 상징 체계입니다.`,
      en: `${kindEn} uses a modern presentation of a traditional Pythagorean number-symbol system. Life Path starts from birth-date digits; Destiny starts from the letter values of a Roman-letter name. This is a historical and cultural symbolic system, not a scientifically validated personality test.`,
    }),
    evidenceRefs: Object.freeze([`numerology-${kind === "lifePath" ? "life-path" : "destiny"}`]),
    citations: Object.freeze([...NUMEROLOGY_CITATIONS]),
  });
}

export function numerologyMethodExplanation(): ExplanationBlock {
  return block({
    id: "numerology-method",
    summary: Object.freeze({
      ko: "수비학은 입력 숫자와 문자값의 합산 단계를 공개하고, 그 결과를 역사적 상징 체계로만 해석합니다.",
      en: "Numerology exposes each digit and letter-value reduction step, then treats the result only as a historical symbolic system.",
    }),
    detail: Object.freeze({
      ko: "생애수는 연·월·일을 각각 자릿수 합으로 줄인 뒤 세 값을 더해 다시 줄입니다. 운명수는 피타고라스 문자표의 A–Z 값을 더한 뒤 같은 규칙을 적용하며, 한글·숫자·기호는 계산에서 제외합니다. 11·22·33은 전통상 마스터 넘버로 보아 즉시 멈추고, 그 밖의 두 자리 수는 한 자리 또는 마스터 넘버까지 계속 줄입니다. 화면의 궤적은 이 규칙을 숨기지 않기 위한 계산 기록입니다.",
      en: "Life Path reduces the year, month, and day through digit sums, adds those reduced values, and reduces the total again. Destiny adds A–Z values from the Pythagorean letter table and applies the same rule; Korean characters, numbers, and punctuation are excluded. 11, 22, and 33 are treated as Master Numbers and stop immediately, while other two-digit values continue to one digit or a Master Number. The visible trail keeps this rule inspectable.",
    }),
    method: Object.freeze({
      ko: "Iamblichus의 피타고라스 전통 기록과 20세기 초 Balliett 계열의 현대 수비학 문헌을 역사적 참고점으로 표시합니다. 이 문헌은 계산 결과가 미래를 예측한다는 과학적 검증을 제공하지 않습니다.",
      en: "Iamblichus's account of Pythagorean traditions and early twentieth-century Balliett numerology texts are shown as historical reference points. They do not provide scientific validation that the calculations predict the future.",
    }),
    evidenceRefs: Object.freeze(["numerology-calculation-record"]),
    citations: Object.freeze([...NUMEROLOGY_CITATIONS]),
  });
}
