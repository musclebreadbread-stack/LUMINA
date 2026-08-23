import type { LocalizedText } from "@engine/shared/explanation";

/** 타로 78장 덱 — 메이저 22 + 마이너 56(4수트 × 14). 순수 데이터만 둔다. */

export type Suit = "major" | "wands" | "cups" | "swords" | "pentacles";

/**
 * 고전 4원소. 점성술의 ZodiacElement 와 같은 개념이지만 각 엔진이 독립 모듈이라는
 * 원칙에 따라 여기서 따로 정의한다. 마이너 수트의 색은 화면에 쓰지 않는다 —
 * 색은 오직 사주 오행에만 쓴다는 규율을 여기서도 지킨다.
 */
export type ClassicalElement = "fire" | "water" | "air" | "earth";

export interface SuitDef {
  readonly key: Suit;
  readonly ko: string;
  readonly en: string;
  readonly element: ClassicalElement | null; // 메이저는 특정 수트에 속하지 않는다
  readonly domain: string;
  readonly domainEn: string;
  readonly keywordsUpright: readonly string[];
  readonly keywordsUprightEn: readonly string[];
  readonly keywordsReversed: readonly string[];
  readonly keywordsReversedEn: readonly string[];
}

export const SUITS: readonly SuitDef[] = Object.freeze([
  Object.freeze({
    key: "wands",
    ko: "완드",
    en: "Wands",
    element: "fire",
    domain: "행동과 열정",
    domainEn: "Action and Passion",
    keywordsUpright: Object.freeze(["열정", "추진력", "도전"]),
    keywordsUprightEn: Object.freeze(["passion", "drive", "challenge"]),
    keywordsReversed: Object.freeze(["소진", "조급함"]),
    keywordsReversedEn: Object.freeze(["burnout", "impatience"]),
  }),
  Object.freeze({
    key: "cups",
    ko: "컵",
    en: "Cups",
    element: "water",
    domain: "감정과 관계",
    domainEn: "Emotion and Relationships",
    keywordsUpright: Object.freeze(["감정", "관계", "직관"]),
    keywordsUprightEn: Object.freeze(["emotion", "relationships", "intuition"]),
    keywordsReversed: Object.freeze(["과잉", "단절"]),
    keywordsReversedEn: Object.freeze(["excess", "disconnection"]),
  }),
  Object.freeze({
    key: "swords",
    ko: "소드",
    en: "Swords",
    element: "air",
    domain: "생각과 판단",
    domainEn: "Thought and Judgment",
    keywordsUpright: Object.freeze(["생각", "진실", "결단"]),
    keywordsUprightEn: Object.freeze(["thought", "truth", "decisiveness"]),
    keywordsReversed: Object.freeze(["갈등", "자기 비판"]),
    keywordsReversedEn: Object.freeze(["conflict", "self-criticism"]),
  }),
  Object.freeze({
    key: "pentacles",
    ko: "펜타클",
    en: "Pentacles",
    element: "earth",
    domain: "현실과 자원",
    domainEn: "Reality and Resources",
    keywordsUpright: Object.freeze(["현실", "자원", "꾸준함"]),
    keywordsUprightEn: Object.freeze(["reality", "resources", "consistency"]),
    keywordsReversed: Object.freeze(["불안정", "정체"]),
    keywordsReversedEn: Object.freeze(["instability", "stagnation"]),
  }),
]);

export function suitOf(key: Suit): SuitDef {
  const s = SUITS.find((x) => x.key === key);
  if (!s) throw new RangeError(`unknown suit: ${key}`);
  return s;
}

/** 마이너 수트의 위계 1(에이스)~14(왕). */
export interface RankDef {
  readonly rank: number;
  readonly ko: string;
  readonly en: string;
  readonly keywordUpright: string;
  readonly keywordUprightEn: string;
  readonly keywordReversed: string;
  readonly keywordReversedEn: string;
}

const RANK_DATA: readonly (readonly [number, string, string, string, string, string, string])[] = [
  [1, "에이스", "Ace", "시작", "Beginning", "놓친 기회", "Missed opportunity"],
  [2, "둘", "Two", "균형", "Balance", "망설임", "Hesitation"],
  [3, "셋", "Three", "성장", "Growth", "정체", "Stagnation"],
  [4, "넷", "Four", "안정", "Stability", "굳어진 안정", "Rigid stability"],
  [5, "다섯", "Five", "변화", "Change", "회피", "Avoidance"],
  [6, "여섯", "Six", "조화", "Harmony", "불균형", "Imbalance"],
  [7, "일곱", "Seven", "성찰", "Reflection", "자기 의심", "Self-doubt"],
  [8, "여덟", "Eight", "움직임", "Movement", "제자리걸음", "Standing still"],
  [9, "아홉", "Nine", "성취 직전", "On the verge", "지침", "Fatigue"],
  [10, "열", "Ten", "완성", "Completion", "짐", "Burden"],
  [11, "시종", "Page", "배움", "Learning", "미숙함", "Inexperience"],
  [12, "기사", "Knight", "추진", "Momentum", "성급함", "Rashness"],
  [13, "여왕", "Queen", "포용", "Nurturing", "과잉보호", "Overprotection"],
  [14, "왕", "King", "숙련", "Mastery", "독단", "Dogmatism"],
];

export const RANKS: readonly RankDef[] = Object.freeze(
  RANK_DATA.map(([rank, ko, en, keywordUpright, keywordUprightEn, keywordReversed, keywordReversedEn]) =>
    Object.freeze({ rank, ko, en, keywordUpright, keywordUprightEn, keywordReversed, keywordReversedEn }),
  ),
);

export function rankOf(rank: number): RankDef {
  const r = RANKS.find((x) => x.rank === rank);
  if (!r) throw new RangeError(`invalid minor rank: ${rank}`);
  return r;
}

export interface CardDef {
  /** 0~77. 덱 안에서 안정적인 위치 — 셔플·표시 키로 쓴다. */
  readonly id: number;
  readonly suit: Suit;
  /** 메이저: 0~21. 마이너: 1(에이스)~14(왕). */
  readonly number: number;
  readonly name: string;
  readonly nameEn: string;
  readonly keywordsUpright: readonly string[];
  readonly keywordsUprightEn: readonly string[];
  readonly keywordsReversed: readonly string[];
  readonly keywordsReversedEn: readonly string[];
  readonly iconography: LocalizedText;
  /** 라이더-웨이트 계열의 상징을 요약한 카드 고유 정·역방향 의미. 예언문이 아니다. */
  readonly meaning: Readonly<{
    readonly upright: LocalizedText;
    readonly reversed: LocalizedText;
  }>;
}

const MAJOR_ICONOGRAPHY: readonly LocalizedText[] = Object.freeze([
  Object.freeze({ ko: "절벽 끝의 여행자, 흰 장미와 작은 개, 가벼운 보따리가 아직 펼쳐지지 않은 길을 가리킵니다.", en: "A traveler stands at a cliff with a white rose, a small dog, and a light bundle: an unopened path rather than a guaranteed adventure." }),
  Object.freeze({ ko: "네 원소의 도구가 놓인 탁자와 머리 위의 무한대 기호가 의지와 자원의 연결을 보여 줍니다.", en: "A table holds the four elemental tools beneath an infinity sign, placing will beside the resources available to it." }),
  Object.freeze({ ko: "검은 기둥과 흰 기둥 사이의 인물, 무릎 위의 두루마리, 발치의 초승달이 숨은 지식과 침묵을 강조합니다.", en: "A figure sits between black and white pillars with a scroll and crescent moon, emphasizing hidden knowledge and stillness." }),
  Object.freeze({ ko: "곡식과 석류, 별 모양 왕관, 물가의 풍요로운 풍경이 돌봄과 창조의 장면을 만듭니다.", en: "Wheat, pomegranates, a starry crown, and a fertile waterside scene create an image of nurture and creation." }),
  Object.freeze({ ko: "양 머리 장식의 왕이 돌 왕좌에 앉아 십자가 모양 홀을 들고 질서와 경계를 상징합니다.", en: "A ram-crowned ruler on a stone throne holds a cross-shaped scepter, framing order and boundaries." }),
  Object.freeze({ ko: "두 기둥과 삼중관, 교차된 열쇠, 축복하는 손짓이 전승과 공동체의 가르침을 나타냅니다.", en: "Two pillars, a triple crown, crossed keys, and a blessing gesture point to teaching held by tradition and community." }),
  Object.freeze({ ko: "두 인물 위의 천사와 뒤편의 나무, 가운데 산이 선택과 연결이 만나는 장면을 구성합니다.", en: "An angel watches over two figures with trees and a mountain between them, composing a scene where choice meets connection." }),
  Object.freeze({ ko: "별이 드리운 천막 아래 갑옷 입은 전차의 주인과 흑백 스핑크스가 서로 다른 힘을 끌고 갑니다.", en: "An armored charioteer beneath a starry canopy is drawn by black and white sphinxes, holding contrasting forces in one vehicle." }),
  Object.freeze({ ko: "사람이 사자의 입을 부드럽게 감싸고 머리 위에 무한대 기호를 두어 힘과 인내의 관계를 보여 줍니다.", en: "A person gently closes a lion's jaws beneath an infinity sign, showing strength as a relationship with patience." }),
  Object.freeze({ ko: "지팡이와 등불을 든 노인이 눈 덮인 봉우리 위에서 발밑의 길을 비춥니다.", en: "An elder with a staff and lantern stands above snowy peaks, lighting only the next section of the path." }),
  Object.freeze({ ko: "회전하는 바퀴와 네 모서리의 생명체, 꼭대기의 스핑크스가 순환과 변화의 구조를 이룹니다.", en: "A turning wheel, four corner creatures, and a sphinx at the top form an image of cycles and changing position." }),
  Object.freeze({ ko: "한 손의 저울과 다른 손의 검, 정면을 향한 왕좌가 균형과 책임의 판단을 상징합니다.", en: "Scales in one hand, a sword in the other, and a frontal throne frame judgment as balance and responsibility." }),
  Object.freeze({ ko: "한 발이 나뭇가지에 묶인 인물과 머리 주위의 후광이 멈춤과 관점의 전환을 나타냅니다.", en: "A figure hangs by one ankle from a living tree with a halo around the head, turning suspension into a change of view." }),
  Object.freeze({ ko: "흰 말을 탄 해골, 검은 깃발의 흰 장미, 먼 곳의 떠오르는 해가 끝과 이행을 함께 보여 줍니다.", en: "A skeleton on a white horse carries a black flag with a white rose while a sun rises in the distance: ending beside transition." }),
  Object.freeze({ ko: "한 발은 물에, 한 발은 땅에 둔 천사가 두 컵 사이로 물을 옮기며 조율과 통합을 표현합니다.", en: "An angel with one foot on water and one on land pours between two cups, expressing calibration and integration." }),
  Object.freeze({ ko: "뿔과 날개를 가진 형상 아래 두 인물이 느슨한 사슬에 묶여 있고, 뒤집힌 별이 집착의 장면을 만듭니다.", en: "Two figures wear loose chains beneath a horned winged figure and an inverted star, making attachment visible without declaring a fate." }),
  Object.freeze({ ko: "번개가 왕관을 밀어내는 탑과 떨어지는 두 인물이 갑작스러운 구조의 붕괴와 인식을 묘사합니다.", en: "Lightning strikes a crowned tower as two figures fall, depicting a structure interrupted and a truth made visible." }),
  Object.freeze({ ko: "큰 별과 일곱 작은 별 아래 물을 붓는 인물, 웅덩이와 땅이 회복의 리듬을 이룹니다.", en: "A figure pours water beneath one large and seven small stars, with pool and land sharing a rhythm of recovery." }),
  Object.freeze({ ko: "두 탑 사이의 먼 길, 개와 늑대, 물에서 올라오는 생물이 달빛의 불확실성을 둘러쌉니다.", en: "A road between two towers, a dog and wolf, and a creature rising from water surround the moon's uncertain light." }),
  Object.freeze({ ko: "아이를 태운 흰 말, 해바라기와 붉은 깃발, 커다란 태양이 명료함과 생기를 비춥니다.", en: "A child on a white horse, sunflowers, a red banner, and a large sun illuminate clarity and vitality." }),
  Object.freeze({ ko: "천사가 나팔을 불고 관에서 사람들이 일어나 서로를 향해 팔을 펼치는 장면이 재평가를 부릅니다.", en: "An angel sounds a trumpet as figures rise from coffins with open arms, inviting reevaluation and recognition." }),
  Object.freeze({ ko: "월계수 화환 안의 춤추는 인물과 네 모서리의 상징이 완결과 통합의 틀을 만듭니다.", en: "A dancing figure inside a laurel wreath is framed by four corner symbols, creating an image of completion and integration." }),
]);

function majorIconography(number: number): LocalizedText {
  const value = MAJOR_ICONOGRAPHY[number];
  if (!value) throw new Error(`missing major iconography for card ${number}`);
  return value;
}

const SUIT_ICONOGRAPHY: Readonly<Record<Exclude<Suit, "major">, LocalizedText>> = Object.freeze({
  wands: Object.freeze({ ko: "나뭇가지와 잎, 불꽃처럼 뻗는 선이 행동과 생명력의 영역을 시각화합니다.", en: "Branches, leaves, and flame-like lines visualize the suit's domain of action and vitality." }),
  cups: Object.freeze({ ko: "받아 들고 건네는 잔과 흐르는 물이 감정과 관계의 움직임을 시각화합니다.", en: "Offered cups and flowing water visualize the suit's movement of emotion and relationship." }),
  swords: Object.freeze({ ko: "곧게 선 칼날과 하늘의 선이 사고, 언어, 판단이 만들어 내는 방향을 시각화합니다.", en: "Upright blades and lines in the air visualize the direction made by thought, language, and judgment." }),
  pentacles: Object.freeze({ ko: "손에 닿는 동전과 땅, 정원과 건축물이 현실과 자원의 구조를 시각화합니다.", en: "Coins, earth, gardens, and built forms visualize the structure of reality and resources." }),
});

const RANK_ICONOGRAPHY: Readonly<Record<number, LocalizedText>> = Object.freeze({
  1: Object.freeze({ ko: "한 개의 상징이 화면을 열며 씨앗처럼 시작점을 만듭니다.", en: "One central emblem opens the scene like a seed and creates a starting point." }),
  2: Object.freeze({ ko: "서로 마주 보거나 나란히 놓인 두 요소가 균형과 선택의 간격을 만듭니다.", en: "Two elements face or accompany one another, creating a visual interval for balance and choice." }),
  3: Object.freeze({ ko: "세 요소의 반복과 연결이 성장의 첫 구조와 공유되는 움직임을 만듭니다.", en: "Three repeated or connected elements form the first structure of growth and shared movement." }),
  4: Object.freeze({ ko: "네 방향으로 안정된 배치가 잠시 멈추어 지키는 구조를 만듭니다.", en: "A four-sided arrangement creates a stable structure that pauses to preserve what exists." }),
  5: Object.freeze({ ko: "다섯 요소의 어긋남과 빈틈이 변화가 시작되는 긴장을 만듭니다.", en: "Five elements shift out of alignment, creating the tension through which change can begin." }),
  6: Object.freeze({ ko: "여섯 요소가 서로 응답하는 배열로 놓여 조화와 교환의 장면을 만듭니다.", en: "Six elements answer one another in an arrangement of harmony and exchange." }),
  7: Object.freeze({ ko: "일곱 요소가 중심에서 한 걸음 물러나 관찰과 재검토의 공간을 만듭니다.", en: "Seven elements step back from the center, creating room for observation and review." }),
  8: Object.freeze({ ko: "여덟 요소의 반복되는 선과 리듬이 움직임 또는 멈춤의 속도를 만듭니다.", en: "Eight repeated lines and rhythms create a sense of movement or a deliberate standstill." }),
  9: Object.freeze({ ko: "아홉 요소가 거의 완성된 장면을 만들지만, 마지막 여백도 함께 남깁니다.", en: "Nine elements make a nearly complete scene while leaving a final space visible." }),
  10: Object.freeze({ ko: "열 요소가 한 주기의 끝을 채우며 완성과 그에 따르는 무게를 동시에 보여 줍니다.", en: "Ten elements fill the end of a cycle, showing completion together with the weight it can carry." }),
  11: Object.freeze({ ko: "페이지의 젊은 인물과 도구가 아직 배우고 전달하는 중인 움직임을 만듭니다.", en: "The youthful page and its tool create movement that is still learning and carrying a message." }),
  12: Object.freeze({ ko: "기사가 탈것과 방향을 통해 같은 영역을 앞으로 밀어가는 추진력을 만듭니다.", en: "The knight uses a mount and direction to create momentum through the same domain." }),
  13: Object.freeze({ ko: "여왕의 중심 자세와 주변의 상징이 영역을 돌보고 깊게 익히는 장면을 만듭니다.", en: "The queen's centered posture and surrounding symbols create a scene of tending and deepening a domain." }),
  14: Object.freeze({ ko: "왕의 정면성과 반복되는 상징이 영역을 숙련하고 규칙화하는 장면을 만듭니다.", en: "The king's frontal presence and repeated symbols create a scene of mastering and structuring a domain." }),
});

function minorIconography(suit: Exclude<Suit, "major">, rank: number): LocalizedText {
  const suitText = SUIT_ICONOGRAPHY[suit];
  const rankText = RANK_ICONOGRAPHY[rank];
  if (!suitText || !rankText) throw new Error(`missing minor iconography for ${suit} ${rank}`);
  return Object.freeze({
    ko: `${rankText.ko} ${suitText.ko}`,
    en: `${rankText.en} ${suitText.en}`,
  });
}

function ensureMeaningLength(text: string, suffix: string): string {
  return text.length >= 150 ? text : `${text} ${suffix}`;
}

const MEANING_SUFFIX_KO = "실제 장면에서 자신의 선택과 필요한 조정을 구체적으로 적어 보는 것이 이 상징을 안전하게 활용하는 방법입니다.";
const MEANING_SUFFIX_EN = "A safe way to use this symbol is to write down a concrete situation, your available choice, and the adjustment you may need.";

function majorMeaning(
  name: string,
  nameEn: string,
  keywords: readonly string[],
  keywordsEn: readonly string[],
  reversed: readonly string[],
  reversedEn: readonly string[],
): CardDef["meaning"] {
  return Object.freeze({
    upright: Object.freeze({
      ko: ensureMeaningLength(`${name}은 ${keywords.join("·")}의 상징을 한 장면에 모읍니다. 정방향에서는 지금의 질문을 ${keywords[0] ?? "핵심 주제"}의 관점에서 바라보고, 내가 가진 자원과 다음의 작은 선택을 확인하게 합니다. 이 카드는 정해진 사건을 예고하지 않으며, 이미지와 현실의 맥락을 연결하는 자기성찰용 문장입니다.`, MEANING_SUFFIX_KO),
      en: ensureMeaningLength(`${nameEn} gathers the symbols of ${keywordsEn.join(", ")} into one scene. Upright, it invites you to view the question through ${keywordsEn[0] ?? "its central theme"} and identify the resource and small next choice available now. It does not forecast a fixed event; it is a self-reflection prompt connecting image with context.`, MEANING_SUFFIX_EN),
    }),
    reversed: Object.freeze({
      ko: ensureMeaningLength(`${name}의 역방향은 ${reversed.join("·")}처럼 같은 상징이 막히거나 안쪽으로 돌아오는 장면을 살핍니다. 부족함이나 불운으로 단정하기보다, 무엇이 과해졌고 어떤 신호를 다시 읽어야 하는지 질문합니다. 타로의 정역 방향은 문화적 읽기 방식이며 실제 결과의 확률을 뜻하지 않습니다.`, MEANING_SUFFIX_KO),
      en: ensureMeaningLength(`${nameEn} reversed explores a scene in which the same symbols turn inward or become obstructed, here associated with ${reversedEn.join(", ")}. Rather than calling it lack or bad luck, ask what has become excessive and which signal needs rereading. Upright and reversed are cultural reading conventions, not probabilities of real outcomes.`, MEANING_SUFFIX_EN),
    }),
  });
}

function minorMeaning(suit: SuitDef, rank: RankDef): CardDef["meaning"] {
  return Object.freeze({
    upright: Object.freeze({
      ko: ensureMeaningLength(`${suit.ko} ${rank.ko}는 ${suit.domain} 안에서 ${rank.keywordUpright}의 움직임이 나타나는 고유한 장면입니다. 정방향에서는 이 영역에서 무엇을 시작·조정·완성하고 싶은지, 그리고 그 흐름을 지속하게 할 현실 자원이 무엇인지 살핍니다. 카드는 사건을 단정하지 않고 질문의 초점을 제공합니다.`, MEANING_SUFFIX_KO),
      en: ensureMeaningLength(`${rank.en} of ${suit.en} is a distinct scene in ${suit.domainEn}, where the movement of ${rank.keywordUprightEn} appears. Upright, ask what you want to begin, adjust, or complete in this domain and which real resource can sustain the flow. The card focuses a question; it does not determine an event.`, MEANING_SUFFIX_EN),
    }),
    reversed: Object.freeze({
      ko: ensureMeaningLength(`${suit.ko} ${rank.ko}의 역방향은 ${suit.domain}에서 ${rank.keywordReversed}의 마찰을 살피는 장면입니다. 흐름이 막혔다고 예언하기보다, 속도·경계·정보·자원 중 무엇을 다시 조율해야 하는지 확인합니다. 이 카드는 전통적 상징의 변형이며 현실 판단을 대신하지 않습니다.`, MEANING_SUFFIX_KO),
      en: ensureMeaningLength(`${rank.en} of ${suit.en} reversed examines friction around ${rank.keywordReversedEn} in the domain of ${suit.domainEn}. Rather than predicting a blocked flow, check whether pace, boundaries, information, or resources need adjustment. This is a traditional symbolic variation, not a substitute for real-world judgment.`, MEANING_SUFFIX_EN),
    }),
  });
}

const MAJOR_DATA: readonly (readonly [
  number,
  string,
  string,
  readonly string[],
  readonly string[],
  readonly string[],
  readonly string[],
])[] = [
  [0, "바보", "The Fool", ["새로운 시작", "자유로움", "모험"], ["new beginnings", "freedom", "adventure"], ["무모함", "망설임"], ["recklessness", "hesitation"]],
  [1, "마법사", "The Magician", ["의지", "시작하는 힘", "자원의 활용"], ["will", "the power to begin", "using your resources"], ["헛된 계획", "자신감 부족"], ["empty plans", "lack of confidence"]],
  [2, "여사제", "The High Priestess", ["직관", "고요함", "숨은 앎"], ["intuition", "stillness", "hidden knowledge"], ["단절된 직관", "감춰진 것"], ["disconnected intuition", "what's hidden"]],
  [3, "여황제", "The Empress", ["풍요", "돌봄", "창조성"], ["abundance", "nurturing", "creativity"], ["과잉보호", "막힌 창조력"], ["overprotection", "blocked creativity"]],
  [4, "황제", "The Emperor", ["질서", "안정", "주도권"], ["order", "stability", "taking the lead"], ["경직됨", "통제 과잉"], ["rigidity", "excessive control"]],
  [5, "교황", "The Hierophant", ["전통", "가르침", "공동체"], ["tradition", "teaching", "community"], ["관습에 대한 의문", "독단"], ["questioning convention", "dogmatism"]],
  [6, "연인", "The Lovers", ["선택", "연결", "가치관"], ["choice", "connection", "values"], ["엇갈린 마음", "우유부단"], ["conflicted feelings", "indecision"]],
  [7, "전차", "The Chariot", ["추진력", "의지의 결집", "방향성"], ["drive", "focused will", "direction"], ["방향 상실", "제어력 약화"], ["loss of direction", "weakened control"]],
  [8, "힘", "Strength", ["부드러운 용기", "인내", "내면의 힘"], ["gentle courage", "patience", "inner strength"], ["자기 의심", "소진"], ["self-doubt", "burnout"]],
  [9, "은둔자", "The Hermit", ["성찰", "혼자만의 시간", "내면 탐구"], ["reflection", "time alone", "inner exploration"], ["고립감", "길을 찾기 어려움"], ["isolation", "trouble finding your way"]],
  [10, "운명의 수레바퀴", "Wheel of Fortune", ["전환점", "흐름의 변화", "순환"], ["turning point", "a shift in flow", "cycles"], ["저항", "반복되는 패턴"], ["resistance", "repeating patterns"]],
  [11, "정의", "Justice", ["균형", "책임", "인과"], ["balance", "responsibility", "cause and effect"], ["불균형", "회피"], ["imbalance", "avoidance"]],
  [12, "매달린 사람", "The Hanged Man", ["멈춤", "다른 시각", "기다림"], ["pause", "a different perspective", "waiting"], ["헛된 희생", "제자리"], ["wasted sacrifice", "stuck in place"]],
  [13, "죽음", "Death", ["끝과 시작", "전환", "비움"], ["endings and beginnings", "transition", "letting go"], ["변화에 대한 저항", "머뭇거림"], ["resistance to change", "hesitation"]],
  [14, "절제", "Temperance", ["조화", "균형 잡기", "통합"], ["harmony", "finding balance", "integration"], ["과유불급", "엇박자"], ["too much of a good thing", "being out of sync"]],
  [15, "악마", "The Devil", ["집착", "속박", "물질적 유혹"], ["attachment", "bondage", "material temptation"], ["속박에서 벗어남", "자각"], ["breaking free", "awareness"]],
  [16, "탑", "The Tower", ["급격한 변화", "드러난 진실", "전환"], ["sudden change", "a revealed truth", "turning point"], ["더딘 변화", "지연된 자각"], ["slow change", "delayed awareness"]],
  [17, "별", "The Star", ["희망", "회복", "영감"], ["hope", "recovery", "inspiration"], ["잃어버린 희망", "자신감 저하"], ["lost hope", "lowered confidence"]],
  [18, "달", "The Moon", ["불확실함", "무의식", "환상"], ["uncertainty", "the unconscious", "illusion"], ["안개가 걷힘", "혼란의 해소"], ["the fog clearing", "confusion easing"]],
  [19, "태양", "The Sun", ["활력", "명료함", "성취감"], ["vitality", "clarity", "a sense of accomplishment"], ["일시적 그늘", "과도한 낙관"], ["a passing shadow", "excessive optimism"]],
  [20, "심판", "Judgement", ["재평가", "깨달음", "부름"], ["reevaluation", "realization", "a calling"], ["자기 비판", "주저함"], ["self-criticism", "hesitation"]],
  [21, "세계", "The World", ["완성", "통합", "마무리"], ["completion", "integration", "closure"], ["미완의 매듭", "지연된 완성"], ["an unfinished thread", "delayed completion"]],
];

const MAJOR_ARCANA: readonly CardDef[] = Object.freeze(
  MAJOR_DATA.map(([number, name, nameEn, keywordsUpright, keywordsUprightEn, keywordsReversed, keywordsReversedEn]) =>
    Object.freeze({
      id: number,
      suit: "major" as const,
      number,
      name,
      nameEn,
      keywordsUpright: Object.freeze([...keywordsUpright]),
      keywordsUprightEn: Object.freeze([...keywordsUprightEn]),
      keywordsReversed: Object.freeze([...keywordsReversed]),
      keywordsReversedEn: Object.freeze([...keywordsReversedEn]),
      iconography: majorIconography(number),
      meaning: majorMeaning(name, nameEn, keywordsUpright, keywordsUprightEn, keywordsReversed, keywordsReversedEn),
    }),
  ),
);

/** 수트 × 위계를 조합해 마이너 아르카나 56장을 만든다. */
function buildMinorArcana(): readonly CardDef[] {
  const cards: CardDef[] = [];
  let id = MAJOR_ARCANA.length;

  for (const suit of SUITS) {
    if (suit.key === "major") throw new Error("major suit cannot build minor arcana");
    for (const rank of RANKS) {
      const keywordsUpright = Object.freeze(
        Array.from(new Set([rank.keywordUpright, ...suit.keywordsUpright])).slice(0, 4),
      );
      const keywordsUprightEn = Object.freeze(
        Array.from(new Set([rank.keywordUprightEn, ...suit.keywordsUprightEn])).slice(0, 4),
      );
      const keywordsReversed = Object.freeze(
        Array.from(new Set([rank.keywordReversed, ...suit.keywordsReversed])).slice(0, 4),
      );
      const keywordsReversedEn = Object.freeze(
        Array.from(new Set([rank.keywordReversedEn, ...suit.keywordsReversedEn])).slice(0, 4),
      );
      cards.push(
        Object.freeze({
          id: id++,
          suit: suit.key,
          number: rank.rank,
          name: `${suit.ko} ${rank.ko}`,
          nameEn: `${rank.en} of ${suit.en}`,
          keywordsUpright,
          keywordsUprightEn,
          keywordsReversed,
          keywordsReversedEn,
          iconography: minorIconography(suit.key, rank.rank),
          meaning: minorMeaning(suit, rank),
        }),
      );
    }
  }
  return Object.freeze(cards);
}

const MINOR_ARCANA: readonly CardDef[] = buildMinorArcana();

/** 78장 전체 — 메이저 다음 완드·컵·소드·펜타클 순, id 0~77. */
export const DECK: readonly CardDef[] = Object.freeze([...MAJOR_ARCANA, ...MINOR_ARCANA]);

export const MAJOR_ARCANA_COUNT = 22;
export const MINOR_ARCANA_COUNT = 56;

export function cardAt(id: number): CardDef {
  const c = DECK[id];
  if (!c) throw new RangeError(`invalid card id: ${id}`);
  return c;
}
