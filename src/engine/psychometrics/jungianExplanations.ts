import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import {
  GOLDBERG_1992,
  IPIP_TABLE,
  MCCRAE_COSTA_1989,
  PITTENGER_1993,
  STEIN_SWAN_2019,
} from "./citations";
import type { JungianAxis, JungianPole } from "./jungian";

export interface AxisPoleExplanation {
  readonly axis: JungianAxis;
  readonly pole: JungianPole;
  readonly label: LocalizedText;
  readonly opposite: LocalizedText;
  readonly block: ExplanationBlock;
}

const AXIS_POLES: Readonly<Record<JungianAxis, Readonly<{ negative: JungianPole; positive: JungianPole }>>> = Object.freeze({
  EI: Object.freeze({ negative: "I", positive: "E" }),
  SN: Object.freeze({ negative: "S", positive: "N" }),
  TF: Object.freeze({ negative: "T", positive: "F" }),
  JP: Object.freeze({ negative: "J", positive: "P" }),
});

const AXIS_COPY: Readonly<Record<JungianAxis, Readonly<Partial<Record<JungianPole, Readonly<{ label: LocalizedText; detail: LocalizedText }>>>>>> = Object.freeze({
  EI: Object.freeze({
    I: Object.freeze({
      label: Object.freeze({ ko: "내향 쪽", en: "Introversion pole" }),
      detail: Object.freeze({
        ko: "혼자 정리하는 시간, 좁고 깊은 관계, 자극을 고르는 방식이 상대적으로 편안하게 보고된 방향입니다. 이는 사회적 능력이나 말솜씨의 부족을 뜻하지 않으며, 필요한 장면에서는 충분히 외향적인 행동을 할 수 있습니다.",
        en: "This direction reflects relatively greater comfort with solitary processing, depth in a smaller set of relationships, and selecting the amount of stimulation. It does not measure social ability or eloquence, and it does not prevent outward behavior when a situation calls for it.",
      }),
    }),
    E: Object.freeze({
      label: Object.freeze({ ko: "외향 쪽", en: "Extraversion pole" }),
      detail: Object.freeze({
        ko: "사람과 활동의 자극 속에서 에너지를 얻고 대화나 행동을 먼저 시작하는 경향이 상대적으로 높게 보고된 방향입니다. 항상 사교적이어야 한다는 뜻이 아니라, 관계와 활동을 통해 추진력을 회복하는 장면이 더 자주 나타날 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger tendency to gain energy from social or active stimulation and to initiate interaction. It does not require constant sociability; it describes contexts in which relationships and activity may more often restore momentum.",
      }),
    }),
  }),
  SN: Object.freeze({
    S: Object.freeze({
      label: Object.freeze({ ko: "감각 쪽", en: "Sensing pole" }),
      detail: Object.freeze({
        ko: "구체적인 경험, 관찰 가능한 정보, 이미 검증된 절차를 통해 상황을 이해하는 경향이 상대적으로 높게 보고된 방향입니다. 상상력이 없다는 뜻이 아니라, 아이디어를 현실의 사례와 단계로 확인할 때 강점이 잘 드러날 수 있다는 뜻입니다.",
        en: "This direction reflects a relatively stronger preference for concrete experience, observable information, and established procedures when making sense of a situation. It does not mean a lack of imagination; ideas may become most useful when checked against examples and steps.",
      }),
    }),
    N: Object.freeze({
      label: Object.freeze({ ko: "직관 쪽", en: "Intuition pole" }),
      detail: Object.freeze({
        ko: "새로운 관점, 추상적 개념, 가능성 사이의 연결을 탐색하는 경향이 상대적으로 높게 보고된 방향입니다. 현실 세부를 무시한다는 뜻은 아니며, 큰 패턴을 먼저 잡은 뒤 세부를 채우는 방식이 편할 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger interest in new perspectives, abstract concepts, and connections among possibilities. It does not mean ignoring practical detail; a person may prefer to identify a larger pattern and then fill in the specifics.",
      }),
    }),
  }),
  TF: Object.freeze({
    T: Object.freeze({
      label: Object.freeze({ ko: "사고 쪽", en: "Thinking pole" }),
      detail: Object.freeze({
        ko: "문제를 판단할 때 기준, 논리적 일관성, 직접적인 표현을 먼저 살피는 경향이 상대적으로 높게 보고된 방향입니다. 공감이 없다는 뜻이 아니라, 감정과 분리된 사실·원칙을 선명하게 만든 뒤 결정을 정리하는 방식이 편할 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger tendency to foreground criteria, logical consistency, and direct expression when judging a problem. It does not mean a lack of empathy; the person may prefer to clarify facts and principles before organizing a decision.",
      }),
    }),
    F: Object.freeze({
      label: Object.freeze({ ko: "감정 쪽", en: "Feeling pole" }),
      detail: Object.freeze({
        ko: "결정을 내릴 때 사람의 입장, 관계의 영향, 조화와 배려를 함께 살피는 경향이 상대적으로 높게 보고된 방향입니다. 논리를 쓰지 않는다는 뜻이 아니라, 판단의 결과가 사람에게 닿는 방식을 중요한 정보로 포함할 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger tendency to consider people's perspectives, relational effects, harmony, and care when deciding. It does not mean abandoning logic; interpersonal consequences may be treated as important information alongside a rule or criterion.",
      }),
    }),
  }),
  JP: Object.freeze({
    J: Object.freeze({
      label: Object.freeze({ ko: "판단 쪽", en: "Judging pole" }),
      detail: Object.freeze({
        ko: "일을 구조화하고 순서와 마감, 예측 가능한 기준을 세워 마무리하는 경향이 상대적으로 높게 보고된 방향입니다. 융통성이 없다는 뜻이 아니라, 열린 선택지를 줄이고 다음 행동을 분명히 할 때 집중이 잘 될 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger tendency to structure work, set order and deadlines, and close an open loop with a predictable criterion. It does not mean inflexibility; focus may improve when open choices are narrowed into a clear next action.",
      }),
    }),
    P: Object.freeze({
      label: Object.freeze({ ko: "인식 쪽", en: "Perceiving pole" }),
      detail: Object.freeze({
        ko: "상황이 바뀔 여지를 남기고 필요에 따라 순서를 조정하며 새로운 정보에 반응하는 경향이 상대적으로 높게 보고된 방향입니다. 계획이 없다는 뜻이 아니라, 마지막 결정을 늦추고 선택지를 열어 두는 것이 탐색에 도움이 될 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger tendency to keep room for change, adjust sequence as needed, and respond to new information. It does not mean having no plan; delaying closure and keeping options open can support exploration in some contexts.",
      }),
    }),
  }),
});

const AXIS_METHOD: LocalizedText = Object.freeze({
  ko: "이 축은 IPIP-50의 기존 요인 점수를 새 문항 없이 선형 재표현합니다. 네 글자는 연속 점수를 보기 쉽게 요약한 표기이며, 경계에 가까우면 ?로 남깁니다. 상관 근거는 McCrae와 Costa(1989)의 NEO-PI 자기보고 결과를 요약한 참고값일 뿐, 개인의 상관이나 새로운 규준이 아닙니다.",
  en: "Each axis is a linear re-expression of an existing IPIP-50 factor with no new items. The four letters summarize continuous scores for readability; a near-midpoint axis remains ?. The correlation basis is a compact reference to McCrae and Costa's (1989) NEO-PI self-report results, not the user's personal correlation or a new norm.",
});

const AXIS_ORDER: readonly JungianAxis[] = Object.freeze(["EI", "SN", "TF", "JP"]);

function axisBlock(axis: JungianAxis, pole: JungianPole): ExplanationBlock {
  const copy = AXIS_COPY[axis]?.[pole];
  if (!copy) throw new Error(`missing Jungian axis copy for ${axis}/${pole}`);
  return freezeExplanationBlock({
    id: `jungian-axis-${axis}-${pole}`,
    summary: Object.freeze({
      ko: `${copy.label.ko} 경향 — ${axis} 축의 연속 점수 요약`,
      en: `${copy.label.en} — a summary of the continuous ${axis} axis score`,
    }),
    detail: copy.detail,
    method: AXIS_METHOD,
    evidenceRefs: Object.freeze([`jungian-axis:${axis}-${pole}`, `psychometric-factor:${axis}`]),
    citations: Object.freeze([MCCRAE_COSTA_1989, GOLDBERG_1992, IPIP_TABLE]),
    tier: "scientific",
  });
}

export const JUNGIAN_AXIS_EXPLANATIONS: readonly AxisPoleExplanation[] = Object.freeze(
  AXIS_ORDER.flatMap((axis) => {
    const poles = AXIS_POLES[axis];
    if (!poles) return [];
    return [poles.negative, poles.positive].map((pole) => {
      const copy = AXIS_COPY[axis]?.[pole];
      if (!copy) throw new Error(`missing Jungian axis copy for ${axis}/${pole}`);
      const oppositePole = pole === poles.negative ? poles.positive : poles.negative;
      const oppositeCopy = AXIS_COPY[axis]?.[oppositePole];
      if (!oppositeCopy) throw new Error(`missing opposite Jungian axis copy for ${axis}/${oppositePole}`);
      return Object.freeze({
        axis,
        pole,
        label: copy.label,
        opposite: oppositeCopy.label,
        block: axisBlock(axis, pole),
      });
    });
  }),
);

export const JUNGIAN_AXIS_EXPLANATION_BY_KEY: Readonly<Record<string, ExplanationBlock>> = Object.freeze(
  Object.fromEntries(JUNGIAN_AXIS_EXPLANATIONS.map((item) => [`${item.axis}:${item.pole}`, item.block])),
);

const TYPE_COPY: Readonly<Record<string, LocalizedText>> = Object.freeze({
  ISTJ: Object.freeze({ ko: "구체적인 사실과 약속을 중시하고, 정해 둔 순서로 일을 끝까지 책임지는 조용한 실무형입니다. 변화를 받아들일 때에도 확인 가능한 단계와 충분한 준비가 있으면 안정적으로 움직입니다.", en: "A quiet practical style that values concrete facts, commitments, and finishing work in an established order. Change is easier to approach when there are verifiable steps and enough preparation." }),
  ISFJ: Object.freeze({ ko: "관계의 필요를 세심하게 살피면서 구체적인 도움을 꾸준히 제공하는 돌봄형입니다. 익숙한 방식에 안정감을 느끼지만, 중요한 사람을 위해 조용히 새로운 방법도 배워 갑니다.", en: "A caring style that notices relational needs and offers concrete help consistently. Familiar methods can feel grounding, while care for important people can also motivate quiet learning of new approaches." }),
  INFJ: Object.freeze({ ko: "사람과 상황의 의미를 깊이 읽고, 하나의 방향을 세운 뒤 차분하게 실현해 가는 통찰형입니다. 혼자 생각하는 시간과 관계의 진정성이 모두 중요하며, 이상을 작게 나누면 실행력이 커집니다.", en: "An insightful style that reads meaning in people and situations, then pursues a considered direction. Solitary reflection and authentic relationships both matter; breaking an ideal into small steps can strengthen action." }),
  INTJ: Object.freeze({ ko: "복잡한 정보를 구조와 전략으로 정리하고, 장기적인 목표를 독립적으로 설계하는 탐구형입니다. 높은 기준은 강점이지만, 다른 사람의 속도와 현장 정보가 계획을 더 현실적으로 다듬을 수 있습니다.", en: "An exploratory style that organizes complex information into structure and strategy and designs long-range goals independently. High standards help, while other people's pace and field information can make plans more workable." }),
  ISTP: Object.freeze({ ko: "실제 상황을 빠르게 관찰하고 필요한 도구와 원리로 문제를 해결하는 실험형입니다. 자유로운 순서와 직접 확인을 선호하며, 중요한 관계나 장기 과제에는 보이는 체크포인트를 두면 힘이 오래 갑니다.", en: "An experimental style that observes the practical situation quickly and solves problems through useful tools and principles. Freedom and direct testing help; visible checkpoints can sustain effort in relationships or long projects." }),
  ISFP: Object.freeze({ ko: "현재의 감각과 사람의 분위기를 섬세하게 느끼며, 자신만의 가치에 맞는 방식으로 행동하는 조율형입니다. 억지로 앞에 서기보다 진정성이 드러나는 작은 선택을 이어 갈 때 존재감이 커집니다.", en: "A sensitive style that notices present experience and interpersonal atmosphere and acts in ways aligned with personal values. Presence grows through a series of authentic small choices rather than forced visibility." }),
  INFP: Object.freeze({ ko: "내면의 가치와 가능성을 소중히 여기고, 사람과 아이디어의 숨은 의미를 오래 탐색하는 성찰형입니다. 이상을 보호하면서도 현실의 첫 단계를 정하면 상상력이 실제 변화로 이어질 수 있습니다.", en: "A reflective style that protects inner values and possibilities while exploring the hidden meaning of people and ideas. Naming a first practical step lets imagination become change without abandoning the ideal." }),
  INTP: Object.freeze({ ko: "개념을 분해하고 원리와 예외를 탐구하며, 독립적인 방식으로 가장 정확한 설명을 찾는 분석형입니다. 생각을 오래 확장하는 힘이 큰 만큼, 공유할 때는 결론과 다음 행동을 짧게 먼저 제시하면 좋습니다.", en: "An analytical style that breaks concepts apart, examines principles and exceptions, and seeks an accurate explanation independently. Because ideas can expand for a long time, sharing the conclusion and next action first can help others follow." }),
  ESTP: Object.freeze({ ko: "현장에서 바로 부딪히며 사람과 정보의 흐름을 읽고, 빠른 선택으로 기회를 시험하는 실행형입니다. 즉각적인 감각이 강점이지만, 큰 결정 앞에서는 결과를 한 번 더 계산할 짧은 멈춤이 유용합니다.", en: "An action-oriented style that reads people and information in the moment and tests opportunities through quick choices. Immediate awareness is a strength; a short pause to calculate consequences helps with larger decisions." }),
  ESFP: Object.freeze({ ko: "사람과 장면의 생생한 에너지를 잘 포착하고, 관계를 따뜻하게 만드는 행동을 자연스럽게 만들어 내는 활력형입니다. 즐거움을 나누는 힘과 함께, 미래의 자신을 위한 작은 약속도 남겨 두면 균형이 생깁니다.", en: "A lively style that catches the energy of people and moments and naturally creates actions that warm a relationship. Sharing enjoyment is a strength; a few promises to your future self add balance." }),
  ENFP: Object.freeze({ ko: "사람과 아이디어의 가능성을 빠르게 연결하고, 의미 있는 방향을 발견하면 주변에 에너지를 전하는 확장형입니다. 많은 시작을 한 가지 실험으로 좁히고 마무리할 장치를 두면 창의성이 현실에 남습니다.", en: "An expansive style that rapidly connects possibilities in people and ideas and spreads energy when a meaningful direction appears. Narrowing many starts to one experiment and adding a finishing device helps creativity remain tangible." }),
  ENTP: Object.freeze({ ko: "익숙한 전제를 뒤집어 보고 여러 해법을 실험하며, 대화 속에서 더 나은 구조를 발견하는 발상형입니다. 논쟁의 재미가 관계의 목적을 가리지 않도록 상대가 지키려는 가치부터 확인하면 영향력이 커집니다.", en: "An inventive style that challenges familiar assumptions, tests several solutions, and finds better structures through dialogue. Influence grows when the value another person is protecting is acknowledged before enjoying the debate." }),
  ESTJ: Object.freeze({ ko: "목표와 기준을 분명히 정하고, 사람과 자원을 조직해 결과를 만들어 내는 운영형입니다. 책임감과 실행력이 강점이며, 효율만큼 현장의 목소리와 개인별 상황을 듣는 시간이 결과의 질을 높입니다.", en: "An organizing style that clarifies goals and standards and coordinates people and resources toward a result. Responsibility and execution are strengths; listening to local knowledge and individual circumstances improves quality beyond efficiency alone." }),
  ESFJ: Object.freeze({ ko: "구체적인 필요와 관계의 분위기를 빠르게 알아차리고, 함께 지킬 수 있는 질서와 돌봄을 만드는 협력형입니다. 모두를 챙기는 힘을 오래 쓰려면 자신의 한계와 요청도 같은 표에 올려야 합니다.", en: "A cooperative style that notices concrete needs and relational atmosphere quickly and builds shared order and care. To sustain that support, personal limits and requests deserve a place on the same table." }),
  ENFJ: Object.freeze({ ko: "사람의 가능성과 공동의 방향을 연결해 서로가 움직일 수 있는 의미를 만드는 촉진형입니다. 격려와 조직력이 강점이지만, 상대의 선택을 대신하지 않고 질문으로 남겨 둘 때 자율성이 함께 자랍니다.", en: "A facilitating style that connects people's potential with a shared direction and creates meaning that helps a group move. Encouragement and coordination are strengths; autonomy grows when questions replace deciding for others." }),
  ENTJ: Object.freeze({ ko: "복잡한 목표를 구조화하고 필요한 결정을 빠르게 내려 장기적인 변화를 추진하는 지휘형입니다. 큰 그림과 기준을 세우는 힘이 강하며, 속도가 다른 사람의 관점을 과정에 포함하면 전략이 더 오래 작동합니다.", en: "A directing style that structures complex goals, makes necessary decisions, and drives long-term change. Big-picture standards are a strength; including people with different tempos makes a strategy more durable." }),
});

const TYPE_CODES = Object.freeze([
  "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ",
] as const);

function typeBlock(typeCode: string): ExplanationBlock {
  const copy = TYPE_COPY[typeCode];
  if (!copy) throw new Error(`unknown Jungian type code: ${typeCode}`);
  const detail = Object.freeze({
    ko: `${copy.ko} 이 문장은 판정이 아니라 현재 응답을 관찰하기 위한 출발점입니다.`,
    en: `${copy.en} Read this as a prompt for observing the current response pattern, not as a verdict.`,
  });
  return freezeExplanationBlock({
    id: `jungian-type-${typeCode.toLowerCase()}`,
    summary: Object.freeze({
      ko: `${typeCode} — 네 축의 조합을 읽는 자기성찰 요약`,
      en: `${typeCode} — a self-reflection summary of the four axes`,
    }),
    detail,
    method: Object.freeze({
      ko: "이 네 글자는 네 개의 연속 점수를 읽기 쉽게 압축한 요약입니다. 경계값에 가까운 축은 ?로 표시되며, 글자 조합이 서로 다른 사람을 질적으로 나누거나 행동·진로를 예언한다는 뜻은 아닙니다.",
      en: "These four letters compress four continuous scores for readability. Axes near their midpoint appear as ?, and the combination does not divide people into qualitatively distinct groups or predict behavior or careers.",
    }),
    evidenceRefs: Object.freeze([`jungian-type:${typeCode}`, "jungian-four-axis-continuous"]),
    citations: Object.freeze([MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]),
    tier: "scientific",
  });
}

export const JUNGIAN_TYPE_EXPLANATIONS: Readonly<Record<string, ExplanationBlock>> = Object.freeze(
  Object.fromEntries(TYPE_CODES.map((code) => [code, typeBlock(code)])),
);

export const JUNGIAN_TYPE_CODES: readonly string[] = TYPE_CODES;

/** 유형 화면 머리말에 쓰이는 별명·키워드. 판정이 아니라 자기성찰의 출발점이다. */
export interface TypeProfile {
  readonly nickname: LocalizedText;
  readonly keywords: readonly LocalizedText[];
}

const TYPE_PROFILES: Readonly<Record<string, TypeProfile>> = Object.freeze({
  ISTJ: Object.freeze({
    nickname: Object.freeze({ ko: "원칙의 실무가", en: "The Conscientious Organizer" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "사실과 약속", en: "facts & commitments" }),
      Object.freeze({ ko: "체계적 마무리", en: "systematic follow-through" }),
      Object.freeze({ ko: "조용한 책임", en: "quiet responsibility" }),
    ]),
  }),
  ISFJ: Object.freeze({
    nickname: Object.freeze({ ko: "조용한 수호자", en: "The Quiet Guardian" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "세심한 돌봄", en: "attentive care" }),
      Object.freeze({ ko: "신뢰의 관계", en: "trusted relationships" }),
      Object.freeze({ ko: "꾸준한 도움", en: "consistent support" }),
    ]),
  }),
  INFJ: Object.freeze({
    nickname: Object.freeze({ ko: "통찰의 이상주의자", en: "The Insightful Idealist" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "의미 읽기", en: "reading meaning" }),
      Object.freeze({ ko: "깊은 관계", en: "deep bonds" }),
      Object.freeze({ ko: "조용한 실현", en: "quiet realization" }),
    ]),
  }),
  INTJ: Object.freeze({
    nickname: Object.freeze({ ko: "전략 설계자", en: "The Strategic Architect" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "구조화", en: "structuring" }),
      Object.freeze({ ko: "장기 설계", en: "long-range design" }),
      Object.freeze({ ko: "높은 기준", en: "high standards" }),
    ]),
  }),
  ISTP: Object.freeze({
    nickname: Object.freeze({ ko: "현장 해결사", en: "The Practical Solver" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "빠른 관찰", en: "rapid observation" }),
      Object.freeze({ ko: "도구와 원리", en: "tools & principles" }),
      Object.freeze({ ko: "직접 확인", en: "hands-on testing" }),
    ]),
  }),
  ISFP: Object.freeze({
    nickname: Object.freeze({ ko: "감각의 조율자", en: "The Gentle Aesthete" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "현재의 감각", en: "present-moment senses" }),
      Object.freeze({ ko: "진정성", en: "authenticity" }),
      Object.freeze({ ko: "가치 중심 행동", en: "values-led action" }),
    ]),
  }),
  INFP: Object.freeze({
    nickname: Object.freeze({ ko: "가치의 성찰가", en: "The Reflective Idealist" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "내면의 가치", en: "inner values" }),
      Object.freeze({ ko: "가능성 탐색", en: "exploring possibilities" }),
      Object.freeze({ ko: "공감적 상상", en: "empathic imagination" }),
    ]),
  }),
  INTP: Object.freeze({
    nickname: Object.freeze({ ko: "원리 탐구자", en: "The Independent Analyst" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "개념 분해", en: "breaking down concepts" }),
      Object.freeze({ ko: "논리적 정확성", en: "logical precision" }),
      Object.freeze({ ko: "자율적 질문", en: "independent inquiry" }),
    ]),
  }),
  ESTP: Object.freeze({
    nickname: Object.freeze({ ko: "즉응 실행가", en: "The Bold Operator" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "현장 반응", en: "in-the-moment response" }),
      Object.freeze({ ko: "기회 포착", en: "seizing opportunities" }),
      Object.freeze({ ko: "행동으로 배움", en: "learning by doing" }),
    ]),
  }),
  ESFP: Object.freeze({
    nickname: Object.freeze({ ko: "현장의 활력소", en: "The Warm Entertainer" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "생생한 에너지", en: "vivid energy" }),
      Object.freeze({ ko: "분위기 조율", en: "tuning the mood" }),
      Object.freeze({ ko: "즐거움의 공유", en: "shared enjoyment" }),
    ]),
  }),
  ENFP: Object.freeze({
    nickname: Object.freeze({ ko: "가능성의 연결자", en: "The Possibility Connector" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "아이디어 연결", en: "linking ideas" }),
      Object.freeze({ ko: "의미 발견", en: "finding meaning" }),
      Object.freeze({ ko: "열정 전달", en: "spreading enthusiasm" }),
    ]),
  }),
  ENTP: Object.freeze({
    nickname: Object.freeze({ ko: "전제를 여는 발상가", en: "The Inventive Debater" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "관점 전환", en: "flipping assumptions" }),
      Object.freeze({ ko: "다중 실험", en: "parallel experiments" }),
      Object.freeze({ ko: "대화로 구조화", en: "structuring through dialogue" }),
    ]),
  }),
  ESTJ: Object.freeze({
    nickname: Object.freeze({ ko: "체계의 운영자", en: "The Decisive Organizer" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "목표 명확화", en: "clear goals" }),
      Object.freeze({ ko: "자원 조직", en: "coordinating resources" }),
      Object.freeze({ ko: "결과 집행", en: "delivering results" }),
    ]),
  }),
  ESFJ: Object.freeze({
    nickname: Object.freeze({ ko: "관계의 협력자", en: "The Attentive Supporter" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "필요 알아차림", en: "noticing needs" }),
      Object.freeze({ ko: "함께의 질서", en: "shared order" }),
      Object.freeze({ ko: "따뜻한 조율", en: "warm coordination" }),
    ]),
  }),
  ENFJ: Object.freeze({
    nickname: Object.freeze({ ko: "사람의 촉진자", en: "The Encouraging Facilitator" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "가능성 격려", en: "encouraging potential" }),
      Object.freeze({ ko: "공동의 방향", en: "shared direction" }),
      Object.freeze({ ko: "조직력", en: "bringing people together" }),
    ]),
  }),
  ENTJ: Object.freeze({
    nickname: Object.freeze({ ko: "방향의 지휘자", en: "The Determined Director" }),
    keywords: Object.freeze([
      Object.freeze({ ko: "큰 그림", en: "the big picture" }),
      Object.freeze({ ko: "빠른 결단", en: "decisive calls" }),
      Object.freeze({ ko: "장기 추진", en: "long-term drive" }),
    ]),
  }),
});

/** 완성된 4글자 코드에 대한 유형 프로필. 경계 코드(?)에는 null. */
export function mbtiTypeProfile(typeCode: string): TypeProfile | null {
  return TYPE_PROFILES[typeCode] ?? null;
}

export const JUNGIAN_TYPE_PROFILE_CODES: readonly string[] = Object.freeze(Object.keys(TYPE_PROFILES));

export function axisExplanation(axis: JungianAxis, pole: JungianPole): ExplanationBlock {
  const block = JUNGIAN_AXIS_EXPLANATION_BY_KEY[`${axis}:${pole}`];
  if (!block) throw new Error(`unknown Jungian axis/pole: ${axis}/${pole}`);
  return block;
}

export function typeExplanation(typeCode: string): ExplanationBlock | null {
  return JUNGIAN_TYPE_EXPLANATIONS[typeCode] ?? null;
}
