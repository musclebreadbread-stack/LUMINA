import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import {
  DEYOUNG_QUILTY_PETERSON_2007,
  GOLDBERG_1992,
  IPIP_TABLE,
  MCCRAE_COSTA_1989,
  OPEN_PSYCHOMETRICS_DATA,
} from "../citations";
import type { JungianAxis, JungianPole } from "../jungian";

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
  AT: Object.freeze({ negative: "T", positive: "A" }),
  VW: Object.freeze({ negative: "W", positive: "V" }),
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
  AT: Object.freeze({
    A: Object.freeze({
      label: Object.freeze({ ko: "주장 쪽", en: "Assertive pole" }),
      detail: Object.freeze({
        ko: "스트레스 상황에서도 비교적 차분하고 안정된 정서를 유지한다고 보고되는 방향입니다. 자기 판단에 확신을 갖는 경우가 많다고 보고되지만, 이는 판단이 항상 옳다는 뜻이 아니라 정서적 동요가 판단을 자주 흔들지는 않는다는 의미에 가깝습니다.",
        en: "This direction reflects relatively calmer, more stable self-reported emotion under stress. It often comes with confidence in one's own judgment — not that the judgment is always correct, but that emotional swings do not frequently unsettle it.",
      }),
    }),
    T: Object.freeze({
      label: Object.freeze({ ko: "격정 쪽", en: "Turbulent pole" }),
      detail: Object.freeze({
        ko: "상황 변화나 타인의 평가에 상대적으로 민감하게 반응하고, 스스로를 자주 점검하는 경향이 보고되는 방향입니다. 불안정하다는 뜻이 아니라, 세심한 자기 점검이 완성도를 높이는 동력이 될 수 있다는 의미입니다.",
        en: "This direction reflects a relatively stronger sensitivity to changing situations or others' evaluations, along with frequent self-checking. It does not mean instability; that close self-monitoring can become a driver of higher-quality work.",
      }),
    }),
  }),
  VW: Object.freeze({
    V: Object.freeze({
      label: Object.freeze({ ko: "표출 쪽", en: "Volatility-leaning pole" }),
      detail: Object.freeze({
        ko: "감정이 흔들릴 때 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 걱정·낮은 기분 같은 안으로 향하는 신호보다 상대적으로 더 보고된 방향입니다. 감정 기복이 심하다는 뜻이 아니라, 불편함이 생겼을 때 표출 쪽 신호가 먼저 눈에 띄는 경향을 말합니다.",
        en: "When emotion is unsettled, this direction reflects outward signals — irritability, mood swings — being relatively more reported than inward signals such as worry or low mood. It does not mean strong mood swings overall; it describes which signal tends to surface first under discomfort.",
      }),
    }),
    W: Object.freeze({
      label: Object.freeze({ ko: "침잠 쪽", en: "Withdrawal-leaning pole" }),
      detail: Object.freeze({
        ko: "감정이 흔들릴 때 걱정이나 낮은 기분처럼 안으로 향하는 신호가 짜증·기분 변화 같은 겉으로 드러나는 신호보다 상대적으로 더 보고된 방향입니다. 위축되어 있다는 뜻이 아니라, 불편함이 생겼을 때 침잠 쪽 신호가 먼저 눈에 띄는 경향을 말합니다.",
        en: "When emotion is unsettled, this direction reflects inward signals — worry, low mood — being relatively more reported than outward signals such as irritability or mood swings. It does not mean withdrawal from others; it describes which signal tends to surface first under discomfort.",
      }),
    }),
  }),
});

const FACTOR_AXIS_METHOD: LocalizedText = Object.freeze({
  ko: "이 MBTI 참고 축은 IPIP-50의 기존 요인 점수를 새 문항 없이 선형 재표현합니다. 네 글자는 연속 점수를 보기 쉽게 요약한 표기이며, 경계에 가까우면 ?로 남깁니다. 상관 근거는 McCrae와 Costa(1989)의 NEO-PI 자기보고 결과를 요약한 참고값일 뿐, 개인의 상관이나 새로운 규준이 아닙니다.",
  en: "Each MBTI-style preference axis is a linear interpretation of an existing IPIP-50 factor with no new items. The four letters summarize continuous scores for readability; a near-midpoint axis remains ?. The correlation basis is a compact reference to McCrae and Costa's (1989) NEO-PI self-report results, not the user's personal correlation or a new norm.",
});

const AT_METHOD: LocalizedText = Object.freeze({
  ko: "이 축은 새 문항 없이 IPIP-50 정서안정성(Emotional Stability) 요인 점수를 그대로 다시 표기합니다. 16유형 확장판이 흔히 쓰는 A(주장)/T(격정) 접미사와 이름을 맞췄지만, 이 대비는 공식 MBTI나 McCrae·Costa(1989)의 비교 연구에 포함되지 않은 독자적 확장이라 상관 참고값을 제시하지 않습니다.",
  en: "This axis re-labels the existing IPIP-50 Emotional Stability factor score with no new items. Its name matches the A(ssertive)/T(urbulent) suffix a well-known 16-type variant popularized, but that contrast is not part of official MBTI or McCrae and Costa's (1989) comparison study, so no published correlation reference is shown.",
});

const VW_METHOD: LocalizedText = Object.freeze({
  ko: "이 축은 정서안정성 10문항을 새 문항 없이 두 국면(DeYoung, Quilty & Peterson, 2007)으로 재편성한 대비입니다. 성마름·기분 변화 5문항과 불안·낮은 기분 5문항의 상대적 크기 차이를 보여주며, 두 국면 모두 낮으면(정서적으로 안정되어 있으면) 이 축의 위치는 해석상 의미가 작아집니다. 공개 원자료(N=551,607)로 두 국면의 신뢰도와 문항 판별 타당도를 확인했습니다.",
  en: "This axis re-partitions the existing 10 Emotional Stability items into two aspects (DeYoung, Quilty & Peterson, 2007) with no new items. It shows the relative size of a 5-item irritability/mood-swing cluster against a 5-item worry/low-mood cluster; when both are low (i.e., generally stable), this axis carries less interpretive weight. Reliability and item-level discriminant validity for both aspects were confirmed against public reference data (N=551,607).",
});

const AXIS_ORDER: readonly JungianAxis[] = Object.freeze(["EI", "SN", "TF", "JP", "AT", "VW"]);

function methodFor(axis: JungianAxis): LocalizedText {
  if (axis === "AT") return AT_METHOD;
  if (axis === "VW") return VW_METHOD;
  return FACTOR_AXIS_METHOD;
}

function citationsFor(axis: JungianAxis) {
  if (axis === "AT") return Object.freeze([IPIP_TABLE, OPEN_PSYCHOMETRICS_DATA]);
  if (axis === "VW") return Object.freeze([DEYOUNG_QUILTY_PETERSON_2007, OPEN_PSYCHOMETRICS_DATA]);
  return Object.freeze([MCCRAE_COSTA_1989, GOLDBERG_1992, IPIP_TABLE]);
}

function axisBlock(axis: JungianAxis, pole: JungianPole): ExplanationBlock {
  const copy = AXIS_COPY[axis]?.[pole];
  if (!copy) throw new Error(`missing Jungian axis copy for ${axis}/${pole}`);
  return freezeExplanationBlock({
    id: `jungian-axis-${axis}-${pole}`,
    summary: Object.freeze({
      ko: `MBTI ${axis} 축의 ${copy.label.ko} 경향 — 연속 점수 요약`,
      en: `MBTI-style ${axis} preference — ${copy.label.en} and its continuous score`,
    }),
    detail: copy.detail,
    method: methodFor(axis),
    evidenceRefs: Object.freeze([`jungian-axis:${axis}-${pole}`, `psychometric-factor:${axis}`]),
    citations: citationsFor(axis),
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

export function axisExplanation(axis: JungianAxis, pole: JungianPole): ExplanationBlock {
  const block = JUNGIAN_AXIS_EXPLANATION_BY_KEY[`${axis}:${pole}`];
  if (!block) throw new Error(`unknown Jungian axis/pole: ${axis}/${pole}`);
  return block;
}
