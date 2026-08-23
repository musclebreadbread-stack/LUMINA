/** 스프레드 — 카드를 놓는 자리와 그 자리가 무엇을 묻는지. 순수 데이터만 둔다. */

export type SpreadKey = "single" | "three" | "celtic-cross";

export interface SpreadPosition {
  readonly index: number;
  readonly key: string;
  readonly ko: string;
  readonly en: string;
  /** 이 자리에서 스스로에게 던질 질문 한 줄 */
  readonly prompt: string;
  readonly promptEn: string;
}

export interface SpreadDef {
  readonly key: SpreadKey;
  readonly ko: string;
  readonly en: string;
  readonly positions: readonly SpreadPosition[];
}

function pos(
  index: number,
  key: string,
  ko: string,
  en: string,
  prompt: string,
  promptEn: string,
): SpreadPosition {
  return Object.freeze({ index, key, ko, en, prompt, promptEn });
}

const SINGLE: SpreadDef = Object.freeze({
  key: "single",
  ko: "한 장",
  en: "One Card",
  positions: Object.freeze([
    pos(0, "now", "지금", "Now", "지금 이 순간 눈여겨볼 것은 무엇인가요?", "What's worth noticing right now?"),
  ]),
});

const THREE: SpreadDef = Object.freeze({
  key: "three",
  ko: "세 장",
  en: "Three Cards",
  positions: Object.freeze([
    pos(0, "past", "과거", "Past", "여기까지 오는 동안 무엇을 지나왔나요?", "What have you moved through to get here?"),
    pos(1, "present", "현재", "Present", "지금 가장 붙잡고 있는 것은 무엇인가요?", "What are you holding onto most right now?"),
    pos(2, "future", "미래", "Future", "이 흐름에서 내가 정말 원하는 방향은 무엇인가요?", "In this flow, what direction do you really want?"),
  ]),
});

const CELTIC_CROSS: SpreadDef = Object.freeze({
  key: "celtic-cross",
  ko: "켈틱 크로스",
  en: "Celtic Cross",
  positions: Object.freeze([
    pos(0, "present", "현재 상황", "Present Situation", "지금 서 있는 자리를 한 문장으로 적는다면?", "If you put where you stand right now into one sentence, what would it be?"),
    pos(1, "challenge", "장애물", "Challenge", "이 카드가 가로막는 것, 아니면 마주하게 하는 것은?", "What is this card blocking, or what is it asking you to face?"),
    pos(2, "conscious", "의식하는 목표", "Conscious Goal", "스스로 알고 있는 바람은 무엇인가요?", "What do you know you're hoping for?"),
    pos(3, "subconscious", "무의식의 기반", "Subconscious Foundation", "말하지 않았지만 깔려 있는 마음은?", "What's underneath, unspoken but present?"),
    pos(4, "past", "지나온 과거", "Recent Past", "최근에 지나온 일 중 지금과 이어진 것은?", "What have you recently moved through that connects to now?"),
    pos(5, "future", "다가올 미래", "Near Future", "이 흐름이 향하는 곳은 어디인가요?", "Where does this flow seem to be heading?"),
    pos(6, "self", "나의 태도", "Your Attitude", "이 상황에서 나는 어떤 자세를 취하고 있나요?", "What stance are you taking in this situation?"),
    pos(7, "environment", "주변의 영향", "External Influences", "내 뜻과 무관하게 작용하는 것은 무엇인가요?", "What's at play here, regardless of what you intend?"),
    pos(8, "hopesFears", "희망과 두려움", "Hopes and Fears", "바라는 것과 두려운 것이 같은 곳을 가리키나요?", "Do what you hope for and what you fear point to the same place?"),
    pos(9, "outcome", "결과", "Outcome", "지금 흐름대로라면 어디에 닿을 것 같나요?", "If this flow continues, where does it seem to lead?"),
  ]),
});

export const SPREADS: Readonly<Record<SpreadKey, SpreadDef>> = Object.freeze({
  single: SINGLE,
  three: THREE,
  "celtic-cross": CELTIC_CROSS,
});

export function spreadOf(key: SpreadKey): SpreadDef {
  return SPREADS[key];
}

export function spreadSize(key: SpreadKey): number {
  return SPREADS[key].positions.length;
}
