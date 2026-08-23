import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import {
  ASPECTS,
  PLANETS,
  SIGNS,
  planetDef,
  type PlanetKey,
  type ZodiacSign,
} from "./constants";
import {
  ASTRO_CALCULATION_CITATIONS,
  ASTRO_TRADITION_CITATIONS,
} from "./citations";

const CULTURAL_TIER = "cultural" as const;

const DETAIL_CONTEXT: LocalizedText = Object.freeze({
  ko: " 이 상징은 계산된 천체 위치를 설명하는 은유이며, 실제 성향은 상황·학습·관계와 함께 형성됩니다. 따라서 이 항목은 자신에게 맞는 관찰 장면과 선택을 찾는 질문으로 읽고, 하나의 배치만으로 사람이나 사건을 결론내리지 않습니다.",
  en: " This symbol is a metaphor placed beside a calculated celestial position; lived tendencies also develop through context, learning, and relationships. Read it as a question for finding an observable situation and choice, not as a conclusion about a person or event from one placement.",
});

function detailWithContext(detail: LocalizedText): LocalizedText {
  if (detail.ko.length >= 150 && detail.en.length >= 150) return detail;
  return Object.freeze({
    ko: detail.ko + DETAIL_CONTEXT.ko,
    en: detail.en + DETAIL_CONTEXT.en,
  });
}

const SIGN_DETAILS: readonly LocalizedText[] = Object.freeze([
  Object.freeze({ ko: "양자리는 시작, 직접성, 빠른 착수를 상징하는 전통적 별자리 언어입니다. 행동을 먼저 시험하고 방향을 조정하는 장면을 성찰할 수 있지만, 충동적이거나 항상 리더라는 결론을 내리지는 않습니다. 실제 선택은 상황과 경험의 영향을 받습니다.", en: "Aries is traditionally associated with beginnings, directness, and quick initiation. It can be used to reflect on testing an action and adjusting direction, but it does not make someone impulsive or permanently a leader. Real choices depend on context and experience." }),
  Object.freeze({ ko: "황소자리는 감각, 지속성, 자원의 안정적인 구축을 상징하는 전통적 언어입니다. 몸에 맞는 속도와 오래 유지할 가치를 살필 수 있지만, 고집스럽거나 물질만 중시한다고 단정하지 않습니다. 안정과 변화 사이의 기준을 관찰합니다.", en: "Taurus is traditionally associated with sensation, persistence, and building resources steadily. It can invite reflection on sustainable pace and lasting value, but it does not prove stubbornness or materialism. Observe how you set a balance between stability and change." }),
  Object.freeze({ ko: "쌍둥이자리는 호기심, 언어, 여러 관점을 오가는 연결을 상징합니다. 질문을 나누고 정보를 번역하는 힘을 살필 수 있지만, 산만하거나 가볍다는 결정론은 피합니다. 무엇을 깊게 연결하고 어떤 정보를 검증하는지 함께 봅니다.", en: "Gemini is traditionally associated with curiosity, language, and connecting multiple viewpoints. It can support reflection on asking, translating, and exchanging information, but it does not establish fickleness or superficiality. Notice which connections you deepen and how you verify information." }),
  Object.freeze({ ko: "게자리는 보호, 기억, 정서적 소속의 상징으로 읽혀 왔습니다. 안전하다고 느끼는 환경과 돌봄의 경계를 살필 수 있지만, 예민하거나 가정적이라고 고정하지 않습니다. 보호와 자율성이 함께 있는 조건을 관찰합니다.", en: "Cancer has traditionally symbolized protection, memory, and emotional belonging. It can help explore the conditions that feel safe and the boundaries of care, but it does not fix someone as sensitive or domestic. Observe how protection and autonomy coexist." }),
  Object.freeze({ ko: "사자자리는 표현, 창조성, 따뜻한 존재감의 상징입니다. 자신이 만든 것을 기꺼이 보여 주고 타인의 빛도 인정하는 장면을 살필 수 있지만, 주목받기를 원한다고 단정하지 않습니다. 표현과 겸손이 어떻게 균형을 이루는지 봅니다.", en: "Leo is traditionally associated with expression, creativity, and warm presence. It can invite reflection on showing what you make while recognizing others' light, but it does not prove a need for attention. Observe how expression and humility balance." }),
  Object.freeze({ ko: "처녀자리는 분별, 정리, 구체적인 개선의 상징으로 읽혀 왔습니다. 세부를 다듬고 유용함을 높이는 습관을 살필 수 있지만, 완벽주의나 비판성으로 단정하지 않습니다. 충분히 좋은 기준과 개선 가능한 기준을 구분합니다.", en: "Virgo is traditionally associated with discernment, organization, and concrete improvement. It can support reflection on refining details and increasing usefulness, but it does not make someone a perfectionist or critic. Distinguish a sufficient standard from an endlessly improvable one." }),
  Object.freeze({ ko: "천칭자리는 균형, 교환, 관계 속의 공정한 조율을 상징합니다. 서로의 관점을 듣고 선택의 기준을 맞추는 장면을 살필 수 있지만, 결정을 못 내리거나 갈등을 피한다고 단정하지 않습니다. 평화와 명료함이 함께 있는 대화를 관찰합니다.", en: "Libra is traditionally associated with balance, exchange, and fair adjustment within relationships. It can invite reflection on listening and aligning decision criteria, but it does not prove indecision or conflict avoidance. Observe conversations that hold both peace and clarity." }),
  Object.freeze({ ko: "전갈자리는 깊이, 결속, 변환을 상징하는 전통적 언어입니다. 표면 아래의 동기와 신뢰의 조건을 살필 수 있지만, 비밀스럽거나 극단적이라고 결정하지 않습니다. 강한 감정을 안전하게 다루고 다시 선택하는 힘을 관찰합니다.", en: "Scorpio is traditionally associated with depth, commitment, and transformation. It can help explore motives beneath the surface and the conditions of trust, but it does not make someone secretive or extreme. Observe how strong feelings are handled safely and turned into a new choice." }),
  Object.freeze({ ko: "궁수자리는 탐험, 의미, 넓은 관점의 확장을 상징합니다. 익숙한 경계를 넘어 배우고 신념을 점검하는 장면을 살필 수 있지만, 무모하거나 현실을 모른다고 단정하지 않습니다. 큰 그림과 사실 확인을 함께 유지합니다.", en: "Sagittarius is traditionally associated with exploration, meaning, and a widening viewpoint. It can invite reflection on learning beyond familiar boundaries and testing beliefs, but it does not prove recklessness or impracticality. Hold the big picture together with fact checking." }),
  Object.freeze({ ko: "염소자리는 구조, 책임, 장기적인 성취의 상징으로 읽혀 왔습니다. 목표를 단계로 나누고 자원을 오래 관리하는 방식을 살필 수 있지만, 차갑거나 일만 한다고 단정하지 않습니다. 성취와 회복이 지속되는 구조를 찾습니다.", en: "Capricorn is traditionally associated with structure, responsibility, and long-term achievement. It can support reflection on sequencing goals and managing resources over time, but it does not prove coldness or workaholism. Look for structures where achievement and recovery can last together." }),
  Object.freeze({ ko: "물병자리는 독창성, 공동체적 관점, 기존 규칙의 재설계를 상징합니다. 개인의 차이를 존중하면서 더 나은 시스템을 상상하는 장면을 살필 수 있지만, 비현실적이거나 감정이 없다고 단정하지 않습니다. 아이디어와 사람 사이의 연결을 봅니다.", en: "Aquarius is traditionally associated with originality, a community perspective, and redesigning familiar rules. It can invite reflection on imagining better systems while respecting difference, but it does not prove impracticality or emotional distance. Observe the connection between ideas and people." }),
  Object.freeze({ ko: "물고기자리는 공감, 상상, 경계가 유연한 연결의 상징입니다. 감정과 이미지를 통해 의미를 발견하는 장면을 살필 수 있지만, 현실 감각이 없거나 희생적이라고 단정하지 않습니다. 공감과 경계, 상상과 확인의 균형을 관찰합니다.", en: "Pisces is traditionally associated with empathy, imagination, and fluid connection. It can support reflection on finding meaning through feeling and image, but it does not prove impracticality or self-sacrifice. Observe the balance between empathy and boundaries, imagination and verification." }),
]);

const PLANET_DETAILS: Readonly<Record<PlanetKey, LocalizedText>> = Object.freeze({
  sun: Object.freeze({ ko: "태양은 점성술 전통에서 의식적 자기표현, 생명력, 창조적 중심을 상징합니다. 실제 자존감이나 운명을 측정하는 천문 지표는 아니며, 무엇을 스스로 드러내고 책임지는지 성찰하는 언어입니다.", en: "The Sun traditionally symbolizes conscious self-expression, vitality, and a creative center. It is not an astronomical measure of self-esteem or destiny; it is a language for reflecting on what you choose to express and take responsibility for." }),
  moon: Object.freeze({ ko: "달은 정서적 리듬, 기억, 익숙한 안전감의 상징으로 읽혀 왔습니다. 감정 상태를 진단하거나 어머니·가정을 결정하는 값이 아니며, 어떤 환경에서 회복하고 반응하는지 관찰하는 렌즈입니다.", en: "The Moon is traditionally associated with emotional rhythm, memory, and familiar safety. It does not diagnose a mood or determine a mother or home; it is a lens for observing how you respond and recover in different environments." }),
  mercury: Object.freeze({ ko: "수성은 사고, 언어, 정보 교환을 상징합니다. 말하는 방식과 배우는 방식을 살피는 전통적 언어지만 지능이나 의사소통 능력을 점수화하지 않습니다. 실제 대화와 자료 확인을 우선합니다.", en: "Mercury traditionally symbolizes thought, language, and exchange of information. It can describe how one reflects on speaking and learning, but it does not score intelligence or communication ability. Real conversations and evidence come first." }),
  venus: Object.freeze({ ko: "금성은 기호, 관계의 끌림, 아름다움과 가치의 교환을 상징합니다. 사랑의 성공이나 취향을 결정하지 않으며, 무엇을 소중히 여기고 어떤 방식으로 호의를 주고받는지 성찰하는 언어입니다.", en: "Venus traditionally symbolizes taste, attraction, and the exchange of beauty and value in relationships. It does not determine romantic success or preference; it is a language for reflecting on what you value and how you exchange care." }),
  mars: Object.freeze({ ko: "화성은 추진, 욕구, 경계, 갈등을 다루는 힘을 상징합니다. 공격성이나 사건을 예언하는 값이 아니며, 목표를 향해 움직일 때 어떤 속도와 경계가 안전한지 살피는 렌즈입니다.", en: "Mars traditionally symbolizes drive, desire, boundaries, and the way conflict is handled. It does not predict aggression or events; it is a lens for asking what pace and boundaries keep action safe and effective." }),
  jupiter: Object.freeze({ ko: "목성은 확장, 신념, 교육과 의미의 넓어짐을 상징합니다. 행운이나 성공을 보장하지 않으며, 무엇을 크게 믿고 배우며 어디에서 과장이 생길 수 있는지 점검하는 언어입니다.", en: "Jupiter traditionally symbolizes expansion, belief, education, and widening meaning. It does not guarantee luck or success; it helps examine what you enlarge through belief and learning, and where exaggeration could enter." }),
  saturn: Object.freeze({ ko: "토성은 경계, 시간, 책임, 구조를 상징합니다. 제한이나 실패를 예언하는 값이 아니며, 어떤 규칙과 반복이 신뢰를 만들고 어떤 부담을 줄여야 하는지 성찰하는 렌즈입니다.", en: "Saturn traditionally symbolizes boundaries, time, responsibility, and structure. It does not predict limitation or failure; it invites reflection on which rules and repetitions build trust and which burdens need reducing." }),
  uranus: Object.freeze({ ko: "천왕성은 갑작스러운 관점 전환, 독립, 기존 시스템의 재설계를 상징합니다. 변화를 반드시 겪는다는 예언이 아니라, 낡은 규칙을 어디에서 실험적으로 바꿀 수 있는지 묻는 언어입니다.", en: "Uranus traditionally symbolizes sudden shifts in perspective, independence, and redesigning familiar systems. It is not a prophecy of disruption; it asks where an old rule could be tested and changed experimentally." }),
  neptune: Object.freeze({ ko: "해왕성은 상상, 이상, 공감, 경계가 흐려지는 경험을 상징합니다. 혼란이나 속임수를 예언하지 않으며, 영감과 사실 확인을 함께 유지하고 감정적 경계를 보호하는 방법을 살피는 렌즈입니다.", en: "Neptune traditionally symbolizes imagination, ideals, empathy, and experiences in which boundaries blur. It does not predict confusion or deception; it invites balancing inspiration with verification and protecting emotional boundaries." }),
  pluto: Object.freeze({ ko: "명왕성은 깊은 변화, 권한, 상실 뒤의 재구성을 상징하는 현대 점성술의 언어입니다. 파괴나 재난을 예언하지 않으며, 무엇을 내려놓고 어떤 힘의 관계를 다시 협상할지 성찰하는 렌즈입니다.", en: "Pluto is a modern astrological symbol for deep change, power, and reconstruction after loss. It does not predict destruction or disaster; it is a lens for reflecting on what to release and which power relationship to renegotiate." }),
});

const HOUSE_DETAILS: readonly LocalizedText[] = Object.freeze([
  Object.freeze({ ko: "1하우스는 외부에 드러나는 자기표현과 시작하는 방식의 상징적 자리입니다. 외모나 성격을 결정하지 않고, 첫 반응과 주도권을 어떻게 관찰할지 안내합니다.", en: "The 1st house is traditionally a symbolic place for outward self-presentation and the way one begins. It does not determine appearance or personality; it guides observation of first responses and agency." }),
  Object.freeze({ ko: "2하우스는 자원, 가치, 소유와 안정감을 성찰하는 자리입니다. 재산의 크기를 예언하지 않으며, 시간과 돈과 능력을 어떤 기준으로 관리하는지 살핍니다.", en: "The 2nd house is a lens for resources, values, ownership, and security. It does not forecast wealth; it asks how time, money, and ability are managed according to values." }),
  Object.freeze({ ko: "3하우스는 가까운 환경, 학습, 언어와 이동의 자리입니다. 학업 성취를 보장하지 않고, 정보를 주고받고 주변을 이해하는 습관을 관찰합니다.", en: "The 3rd house concerns nearby environment, learning, language, and movement. It does not guarantee academic success; it supports observation of how information is exchanged and surroundings understood." }),
  Object.freeze({ ko: "4하우스는 뿌리, 사적 공간, 기억과 정서적 기반의 자리입니다. 가족사를 고정하지 않으며, 어떤 공간에서 회복하고 소속감을 만드는지 살핍니다.", en: "The 4th house concerns roots, private space, memory, and emotional ground. It does not fix family history; it invites reflection on where recovery and belonging are built." }),
  Object.freeze({ ko: "5하우스는 창작, 놀이, 표현과 즐거운 위험 감수의 자리입니다. 자녀나 인기를 결정하지 않으며, 무엇을 만들고 기꺼이 보여 주는지 관찰합니다.", en: "The 5th house concerns creation, play, expression, and enjoyable risk. It does not determine children or popularity; it invites observation of what one makes and is willing to show." }),
  Object.freeze({ ko: "6하우스는 일상의 기술, 돌봄, 루틴과 조정의 자리입니다. 질병을 예언하지 않으며, 반복 가능한 습관과 업무 환경이 몸과 집중에 어떤 영향을 주는지 살핍니다.", en: "The 6th house concerns daily skills, care, routines, and adjustment. It does not predict illness; it supports reflection on how repeatable habits and work conditions affect focus and wellbeing." }),
  Object.freeze({ ko: "7하우스는 일대일 관계, 계약, 거울처럼 만나는 타인의 자리입니다. 결혼이나 특정 상대를 예언하지 않고, 상호성·경계·협상의 방식을 살핍니다.", en: "The 7th house concerns one-to-one relationships, agreements, and others as mirrors. It does not predict marriage or a specific partner; it invites reflection on reciprocity, boundaries, and negotiation." }),
  Object.freeze({ ko: "8하우스는 공동 자원, 신뢰, 의존과 변환의 자리입니다. 죽음이나 손실을 예언하지 않으며, 공유된 책임과 취약성을 어떻게 안전하게 다루는지 살핍니다.", en: "The 8th house concerns shared resources, trust, dependence, and transformation. It does not predict death or loss; it examines how shared responsibility and vulnerability can be handled safely." }),
  Object.freeze({ ko: "9하우스는 먼 여행, 고등 학습, 신념과 의미의 자리입니다. 행운이나 정답을 보장하지 않고, 자신의 관점을 넓히면서도 근거를 점검하는 방식을 살핍니다.", en: "The 9th house concerns distant travel, higher learning, belief, and meaning. It does not guarantee luck or truth; it supports widening a view while continuing to check evidence." }),
  Object.freeze({ ko: "10하우스는 공적 역할, 평판, 목표와 사회적 방향의 자리입니다. 직업 성공을 결정하지 않으며, 어떤 책임을 공개적으로 맡고 어떤 기준으로 성취를 정의하는지 성찰합니다.", en: "The 10th house concerns public role, reputation, goals, and social direction. It does not determine career success; it invites reflection on public responsibility and the standards used to define achievement." }),
  Object.freeze({ ko: "11하우스는 친구, 네트워크, 집단의 미래와 공동의 이상을 살피는 자리입니다. 인맥이나 소원을 보장하지 않으며, 어떤 공동체에 기여하고 무엇을 함께 만들지 관찰합니다.", en: "The 11th house concerns friends, networks, collective futures, and shared ideals. It does not guarantee connections or wishes; it asks which communities you contribute to and what you build together." }),
  Object.freeze({ ko: "12하우스는 내면, 휴식, 숨은 과정과 경계 밖의 경험을 성찰하는 자리입니다. 고립이나 불행을 예언하지 않으며, 혼자 회복하고 보이지 않는 부담을 알아차리는 방법을 살핍니다.", en: "The 12th house concerns inner life, rest, hidden processes, and experiences beyond familiar boundaries. It does not predict isolation or misfortune; it supports noticing unseen burdens and ways of recovering alone." }),
]);

const ASPECT_DETAILS: Readonly<Record<string, LocalizedText>> = Object.freeze({
  conjunction: Object.freeze({ ko: "합은 두 상징이 한 지점에 가까워져 서로의 주제가 섞이는 관계입니다. 시너지나 집중으로도, 구분이 어려운 과잉으로도 읽을 수 있어 실제 맥락을 함께 봅니다.", en: "Conjunction brings two symbols close together so their themes blend. It can be read as focus or synergy, but also as difficulty separating signals; the lived context matters." }),
  sextile: Object.freeze({ ko: "육분은 기회와 협력의 통로를 상징하는 조화 각입니다. 자동으로 좋은 결과를 보장하지 않으며, 작은 선택과 연습이 있어야 가능성이 행동으로 연결됩니다.", en: "Sextile traditionally suggests a cooperative opening or opportunity. It does not guarantee a good outcome; small choices and practice are needed for possibility to become action." }),
  square: Object.freeze({ ko: "사분은 서로 다른 요구가 긴장을 만드는 관계입니다. 갈등이나 실패를 예언하지 않고, 두 욕구를 동시에 다루기 위해 어떤 조정과 경계가 필요한지 살핍니다.", en: "Square describes tension between different demands. It does not predict conflict or failure; it invites reflection on the adjustment and boundaries needed to hold both needs." }),
  trine: Object.freeze({ ko: "삼분은 흐름과 익숙한 재능을 상징하는 조화 각입니다. 쉽게 느껴지는 힘을 당연하게 여기지 않고, 어디에 의식적으로 사용할지 살핍니다.", en: "Trine traditionally suggests flow and familiar ease. Rather than taking an easy strength for granted, observe where you choose to use it deliberately." }),
  opposition: Object.freeze({ ko: "대치는 서로 반대편의 요구를 거울처럼 마주 보게 하는 관계입니다. 승패를 예언하지 않으며, 타인과 자기 안의 두 극을 협상하는 방법을 성찰합니다.", en: "Opposition places contrasting demands across from one another like a mirror. It does not predict victory or defeat; it supports reflection on negotiating two poles within self or relationship." }),
});

function block(input: Omit<ExplanationBlock, "tier">): ExplanationBlock {
  return freezeExplanationBlock({ ...input, detail: detailWithContext(input.detail), tier: CULTURAL_TIER });
}

export function astroMethodExplanation(houseSystem: "whole" | "equal" | "placidus"): ExplanationBlock {
  const systemKo = houseSystem === "whole" ? "홀사인" : houseSystem === "equal" ? "이퀄" : "플라시두스";
  const systemEn = houseSystem === "whole" ? "Whole Sign" : houseSystem === "equal" ? "Equal" : "Placidus";
  return block({
    id: "astro-method",
    summary: Object.freeze({
      ko: "점성술 위치는 지심 겉보기 황경과 트로피컬 진분점을 계산하고, 그 위치의 의미는 문화적 해석으로 별도 표시합니다.",
      en: "The chart calculates geocentric apparent longitude on the tropical true equinox, then presents its meanings as cultural interpretation.",
    }),
    detail: Object.freeze({
      ko: `출생 시각은 IANA 시간대에서 절대 시각으로 바꾸고, 천체는 지구 중심의 겉보기 황경으로 계산합니다. J2000 평균 황도가 아니라 해당 날짜의 진황도와 진분점을 사용해 세차 운동으로 인한 통째의 오차를 피합니다. 시각이 없으면 정오를 기준으로 삼고 달·상승궁·하우스의 불확실성을 따로 표시합니다. 현재 선택한 하우스 체계는 ${systemKo}(${systemEn})이며, 플라시두스는 반호 반복식으로 계산하고 극권에서는 이퀄로 폴백합니다. 계산된 위치의 상징적 의미가 실제 사건이나 성격을 예측한다는 주장은 하지 않습니다.`,
      en: `Birth time is converted from the IANA time zone to an absolute instant, and bodies are calculated as geocentric apparent ecliptic positions. The engine uses the true ecliptic and equinox of date rather than the J2000 mean ecliptic, avoiding a wholesale precession offset. When time is missing, noon is used and uncertainty around the Moon, Ascendant, and houses is shown separately. The selected house system is ${systemEn} (${systemKo}); Placidus uses an iterative semi-arc calculation and falls back to Equal at polar latitudes. The symbolic meanings do not claim to predict events or personality.`,
    }),
    method: Object.freeze({
      ko: "실제 계산은 astronomy-engine을 사용하고, 저장소 테스트에서 독립 구현체 astronomia(VSOP87/Meeus 계열)와 20개 검증 차트를 0.05° 게이트로 대조합니다. 행성 위치의 계산 정확성과 해석 전통의 예측 타당도는 서로 다른 주장입니다.",
      en: "The calculation uses Astronomy Engine. The repository cross-checks 20 validation charts against the independent astronomia implementation in the VSOP87/Meeus lineage with a 0.05° gate. Numerical agreement and predictive validity of an interpretive tradition are different claims.",
    }),
    evidenceRefs: Object.freeze(["astro-calculation-record"]),
    citations: Object.freeze([...ASTRO_CALCULATION_CITATIONS]),
  });
}

export function signExplanation(signIndex: number): ExplanationBlock {
  const sign: ZodiacSign = SIGNS[signIndex] ?? SIGNS[0]!;
  const detail = SIGN_DETAILS[sign.index] ?? SIGN_DETAILS[0]!;
  return block({
    id: `astro-sign-${sign.index}`,
    summary: Object.freeze({ ko: `${sign.ko}: ${detail.ko.split(".")[0] ?? detail.ko}`, en: `${sign.en}: ${detail.en.split(".")[0] ?? detail.en}` }),
    detail,
    method: Object.freeze({ ko: "별자리는 황경을 30도씩 나눈 트로피컬 황도대의 상징 체계입니다. 별자리 하나가 사람의 본질을 고정하지 않으며, 실제 행성의 계산 위치와 전통적 의미를 분리합니다.", en: "A sign is a symbolic division of the tropical zodiac into twelve 30-degree sectors. One sign does not fix a person's essence; the calculated position and its traditional meaning are kept separate." }),
    evidenceRefs: Object.freeze(["astro-chart-placements"]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS]),
  });
}

export function planetExplanation(key: PlanetKey): ExplanationBlock {
  const planet = planetDef(key);
  const detail = PLANET_DETAILS[key];
  return block({
    id: `astro-planet-${key}`,
    summary: Object.freeze({ ko: `${planet.ko}: ${detail.ko.split(".")[0] ?? detail.ko}`, en: `${planet.en}: ${detail.en.split(".")[0] ?? detail.en}` }),
    detail,
    method: Object.freeze({ ko: "행성은 실제 천체의 계산 위치를 가리키며, 아래 의미는 고전·현대 점성술의 상징 언어입니다. 천문학적 위치가 심리적 원인을 증명하는 것은 아닙니다.", en: "The planet label refers to a calculated celestial position; the meaning below is symbolic language from astrological traditions. An astronomical position does not prove a psychological cause." }),
    evidenceRefs: Object.freeze(["astro-chart-placements"]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS]),
  });
}

export function placementExplanation(key: PlanetKey, signIndex: number): ExplanationBlock {
  const planet = planetDef(key);
  const sign = SIGNS[signIndex] ?? SIGNS[0]!;
  const planetDetail = PLANET_DETAILS[key];
  const signDetail = SIGN_DETAILS[sign.index] ?? SIGN_DETAILS[0]!;
  return block({
    id: `astro-placement-${key}-${sign.index}`,
    summary: Object.freeze({
      ko: `${planet.ko} ${sign.ko}: ${planetDetail.ko.split(".")[0] ?? planetDetail.ko}와 ${sign.ko}의 표현을 함께 봅니다.`,
      en: `${planet.en} in ${sign.en}: read the planet's theme together with the sign's mode of expression.`,
    }),
    detail: Object.freeze({
      ko: `${planetDetail.ko} ${signDetail.ko} 이 조합은 행성의 주제와 별자리의 표현 방식을 병치한 것입니다. 두 요소를 합쳐 성격 유형이나 사건을 새로 만들어 내지 않고, 실제 장면에서 어떤 욕구가 어떤 방식으로 표현되는지 관찰하는 질문으로 사용합니다.`,
      en: `${planetDetail.en} ${signDetail.en} This pairing places a planet's theme beside a sign's mode of expression. It does not create a new personality type or event forecast; use it to observe how a desire or function is expressed in an actual situation.`,
    }),
    method: Object.freeze({ ko: "행성×별자리 120개를 독립적인 예언 문장으로 만들지 않고, 행성 사전과 별자리 사전을 인수분해해 조합합니다. 실제 위치는 해당 행성의 황경과 별자리 index에서 옵니다.", en: "The 120 planet-by-sign possibilities are factored into a planet dictionary and a sign dictionary rather than written as independent predictions. The actual placement comes from the planet's longitude and sign index." }),
    evidenceRefs: Object.freeze([`astro-placement-${key}-${sign.index}`]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS]),
  });
}

export type BigThreeKey = "sun" | "moon" | "rising";

const BIG_THREE_FOCUS: Readonly<Record<BigThreeKey, LocalizedText>> = Object.freeze({
  sun: Object.freeze({
    ko: "태양은 의식적으로 드러내고 방향을 잡는 힘을 상징합니다.",
    en: "The Sun symbolically describes conscious direction and what one chooses to express outwardly.",
  }),
  moon: Object.freeze({
    ko: "달은 익숙한 반응, 정서적 리듬, 혼자 있을 때의 회복 방식을 상징합니다.",
    en: "The Moon symbolically describes familiar responses, emotional rhythm, and ways of recovering in private.",
  }),
  rising: Object.freeze({
    ko: "상승궁은 첫 장면에서 보이는 접근 방식과 환경에 반응하는 표면 리듬을 상징합니다.",
    en: "The Rising sign symbolically describes an approach visible in first encounters and the surface rhythm of responding to an environment.",
  }),
});

export function bigThreePlacementExplanation(
  key: BigThreeKey,
  signIndex: number,
): ExplanationBlock {
  const sign = SIGNS[signIndex] ?? SIGNS[0]!;
  const focus = BIG_THREE_FOCUS[key];
  const labelKo = key === "sun" ? "태양" : key === "moon" ? "달" : "상승궁";
  const labelEn = key === "sun" ? "Sun" : key === "moon" ? "Moon" : "Rising";
  return block({
    id: `astro-big-three-${key}-${sign.index}`,
    summary: Object.freeze({
      ko: `${labelKo} ${sign.ko} · ${focus.ko}`,
      en: `${labelEn} in ${sign.en} · ${focus.en}`,
    }),
    detail: Object.freeze({
      ko: `${focus.ko} ${sign.ko}의 ${SIGN_DETAILS[sign.index]!.ko} 이 조합은 태양·달·상승궁의 위치와 별자리 표현 방식을 병치한 것입니다. 특정 성격이나 첫인상을 고정하지 않고, 실제 관계와 환경에서 어떤 반응을 선택하는지 관찰하는 질문으로 사용합니다.`,
      en: `${focus.en} ${SIGN_DETAILS[sign.index]!.en} This focused combination places the Big Three position beside the sign's mode of expression. It does not fix personality or first impressions; use it to observe which responses you choose in actual relationships and environments.`,
    }),
    method: Object.freeze({
      ko: "태양·달·상승궁은 기본 차트 요약에서 따로 다루는 핵심 위치입니다. 행성 또는 각도의 계산값과 별자리의 문화적 의미를 분리해 표시합니다.",
      en: "The Sun, Moon, and Rising sign are the three focused positions in the chart summary. Calculated planetary or angular positions are kept separate from the sign's cultural meaning.",
    }),
    evidenceRefs: Object.freeze([`astro-big-three-${key}-${sign.index}`]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS]),
  });
}

export function aspectExplanation(key: string): ExplanationBlock {
  const aspect = ASPECTS.find((item) => item.key === key) ?? ASPECTS[0]!;
  const detail = ASPECT_DETAILS[aspect.key] ?? ASPECT_DETAILS.conjunction!;
  return block({
    id: `astro-aspect-${aspect.key}`,
    summary: Object.freeze({ ko: `${aspect.ko}(${aspect.angle}°): ${detail.ko.split(".")[0] ?? detail.ko}`, en: `${aspect.en} (${aspect.angle}°): ${detail.en.split(".")[0] ?? detail.en}` }),
    detail,
    method: Object.freeze({ ko: `두 행성의 황경 차이가 ${aspect.angle}°에 기본 orb ${aspect.orb}° 이내인지 계산합니다. 해·달이 포함되면 기본 보너스 orb가 더해지며, 이 허용값은 유파마다 다를 수 있습니다.`, en: `The engine checks whether the ecliptic separation is within the base ${aspect.orb}° orb of ${aspect.angle}°. A luminary bonus orb may be added when the Sun or Moon is involved; traditions vary on this allowance.` }),
    evidenceRefs: Object.freeze(["astro-aspects"]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS]),
  });
}

export function houseExplanation(house: number): ExplanationBlock {
  const index = Math.max(1, Math.min(12, house)) - 1;
  const detail = HOUSE_DETAILS[index] ?? HOUSE_DETAILS[0]!;
  return block({
    id: `astro-house-${index + 1}`,
    summary: Object.freeze({ ko: `${index + 1}하우스: ${detail.ko.split(".")[0] ?? detail.ko}`, en: `${index + 1}th house: ${detail.en.split(".")[0] ?? detail.en}` }),
    detail,
    method: Object.freeze({ ko: "상승궁이 속한 별자리의 0도를 1하우스 시작으로 삼는 홀사인, 상승궁에서 30도씩 나누는 이퀄, 반호를 반복 계산하는 플라시두스를 제공합니다. 극권에서는 플라시두스를 이퀄로 대체하고 그 사실을 기록합니다.", en: "The implementation offers Whole Sign, which starts the 1st house at 0° of the Ascendant's sign, Equal houses, which advances 30° from the Ascendant, and Placidus using an iterative semi-arc calculation. At polar latitudes, Placidus falls back to Equal and records that fallback." }),
    evidenceRefs: Object.freeze(["astro-house-system"]),
    citations: Object.freeze([...ASTRO_TRADITION_CITATIONS, ...ASTRO_CALCULATION_CITATIONS.slice(0, 2)]),
  });
}

export const ASTRO_SIGN_EXPLANATIONS: readonly ExplanationBlock[] = Object.freeze(
  SIGNS.map((sign) => signExplanation(sign.index)),
);

export const ASTRO_PLANET_EXPLANATIONS: readonly ExplanationBlock[] = Object.freeze(
  PLANETS.map((planet) => planetExplanation(planet.key)),
);

export const ASTRO_BIG_THREE_EXPLANATIONS: readonly ExplanationBlock[] = Object.freeze(
  (["sun", "moon", "rising"] as const).flatMap((key) =>
    SIGNS.map((sign) => bigThreePlacementExplanation(key, sign.index)),
  ),
);

export const ASTRO_ASPECT_EXPLANATIONS: readonly ExplanationBlock[] = Object.freeze(
  ASPECTS.map((aspect) => aspectExplanation(aspect.key)),
);

export const ASTRO_HOUSE_EXPLANATIONS: readonly ExplanationBlock[] = Object.freeze(
  Array.from({ length: 12 }, (_, index) => houseExplanation(index + 1)),
);
