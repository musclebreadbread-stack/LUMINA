import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import type { BigFiveFactor } from "./items";
import { GOLDBERG_1992, GOW_2005, IPIP_TABLE } from "./citations";
import type { FactorScore } from "./scoring";

const FACTOR_LABELS: Readonly<Record<BigFiveFactor, LocalizedText>> = Object.freeze({
  extraversion: Object.freeze({ ko: "외향성", en: "Extraversion" }),
  agreeableness: Object.freeze({ ko: "친화성", en: "Agreeableness" }),
  conscientiousness: Object.freeze({ ko: "성실성", en: "Conscientiousness" }),
  emotionalStability: Object.freeze({ ko: "정서 안정성", en: "Emotional Stability" }),
  intellect: Object.freeze({ ko: "개방성·지적 탐구", en: "Openness / Intellect" }),
});

const DETAIL: Readonly<Record<BigFiveFactor, LocalizedText>> = Object.freeze({
  extraversion: Object.freeze({
    ko: "외향성 점수는 사람과 자극이 많은 환경에서 에너지를 얻고 행동을 시작하는 경향을 살펴봅니다. 높은 점수는 대화의 시작, 존재감의 표현, 여러 사람과 빠르게 연결되는 행동이 비교적 자연스러울 수 있음을 뜻합니다. 낮은 점수는 사회적 능력이 부족하다는 뜻이 아니라, 혼자 정리하는 시간과 작은 관계의 깊이를 더 편안하게 느낄 가능성을 보여 줍니다. 이 점수는 상황에 따라 달라지는 행동의 빈도를 요약한 것이므로 직업 적합성이나 고정된 성격 유형으로 읽지 않습니다. 회의·모임·창작처럼 자극의 양이 다른 장면에서 자신의 회복 속도와 집중력을 비교해 보면 점수의 의미를 현실적으로 확인할 수 있습니다.",
    en: "Extraversion describes the tendency to gain energy from social stimulation and to initiate activity. A higher score can make starting conversations, showing presence, and moving quickly among different people feel more available. A lower score does not mean poor social ability; it can indicate that quiet recovery time, smaller groups, or depth over breadth feel more sustainable. The score summarizes reported tendencies across these items, so it should not be read as a fixed type, a career-fit verdict, or a measure of social worth. Compare your recovery and focus across a busy meeting, a one-to-one conversation, and solitary work. That observation is more useful than treating one number as a permanent identity. The norm comparison describes where this response pattern sits in an English-language reference sample, not what you must become.",
  }),
  agreeableness: Object.freeze({
    ko: "친화성 점수는 다른 사람의 감정과 관점을 고려하면서 협력하는 경향을 살펴봅니다. 높은 점수는 공감, 배려, 관계의 긴장을 낮추는 행동이 비교적 쉽게 나타날 수 있음을 보여 줍니다. 낮은 점수는 냉정하거나 이기적이라는 판정이 아니라, 문제를 직접 말하고 독립적으로 판단하는 방식을 더 자주 선택할 가능성을 뜻합니다. 친화성은 모든 상황에서 양보하는 능력이 아니며, 경계를 세우고 의견을 분명히 하는 능력과 함께 보아야 합니다. 의견 충돌이 생겼을 때 사실·감정·요청을 분리해 말해 보는 습관이 점수의 장점과 사각지대를 모두 확인하는 데 도움이 됩니다. 높은 공감과 낮은 공감 어느 쪽도 도덕적 우열을 의미하지 않습니다.",
    en: "Agreeableness describes how readily a person considers other people's feelings and viewpoints while cooperating. A higher score can show up as empathy, patience, and actions that lower interpersonal friction. A lower score is not a verdict of coldness or selfishness; it may reflect a preference for direct problem solving, independent judgment, or clear disagreement. Agreeableness is not the same as always yielding. Healthy boundaries and the ability to state a different view are part of a balanced expression of the trait. When conflict appears, notice whether you can separate the observable fact, the feeling, and the request. That practice can preserve the advantages of consideration without making harmony the only goal. Neither high nor low agreeableness is a moral ranking; the score is a description of response tendencies against a reference distribution.",
  }),
  conscientiousness: Object.freeze({
    ko: "성실성 점수는 목표를 구조화하고 약속·순서·세부 사항을 관리하는 경향을 살펴봅니다. 높은 점수는 계획을 세우고 마감에 맞추며 작업을 정돈하는 행동이 비교적 안정적으로 나타날 수 있음을 뜻합니다. 낮은 점수는 무책임하다는 뜻이 아니라, 즉흥성·유연성·새로운 자극에 반응하는 방식을 더 편하게 느낄 수 있다는 의미입니다. 지나치게 높은 구조화는 완벽주의와 피로로 이어질 수 있고, 낮은 구조화는 작은 외부 장치가 있을 때 강점을 발휘할 수 있습니다. 한 주 동안 반복되는 일을 시작·진행·마무리 단계로 나누고 어느 단계에서 마찰이 생기는지 기록해 보면 점수보다 유용한 자기 관찰 자료가 됩니다. 성실성은 능력이나 가치의 서열이 아니라 작업 습관의 방향입니다.",
    en: "Conscientiousness describes the tendency to structure goals and manage order, commitments, and details. A higher score may appear as planning ahead, meeting deadlines, and keeping a reliable workflow. A lower score is not a diagnosis of irresponsibility; it can reflect comfort with spontaneity, flexible sequencing, and responding to new stimuli. Very high structure can become exhausting when it turns into perfectionistic checking, while lower structure can work well when a few external cues supply the scaffolding. Track one recurring task through starting, continuing, and finishing. The point where friction appears will tell you more than a label. A checklist, a visible deadline, or a smaller first step can support any score range. Conscientiousness is a description of work habits, not a hierarchy of competence or personal worth.",
  }),
  emotionalStability: Object.freeze({
    ko: "정서 안정성 점수는 걱정·긴장·기분 변화가 나타나는 빈도와 회복의 안정성을 살펴봅니다. 높은 점수는 스트레스 자극 속에서도 비교적 평온함을 유지하고 감정의 파도가 지나간 뒤 일상으로 돌아오는 경향과 연결될 수 있습니다. 낮은 점수는 약하거나 문제가 있다는 뜻이 아니라, 자극을 민감하게 감지하고 변화에 크게 반응하는 경험이 더 잦을 수 있다는 의미입니다. 이 검사는 현재의 감정 상태를 진단하지 않으며 우울·불안 같은 의료적 판단을 대신하지 않습니다. 잠·업무량·관계 갈등처럼 최근 환경을 함께 기록해야 점수가 맥락을 얻습니다. 긴장이 높을 때 호흡, 휴식, 신뢰할 수 있는 사람과의 대화 같은 회복 행동을 실험하고, 지속적인 고통이 있다면 전문적인 도움을 우선하세요.",
    en: "Emotional Stability summarizes the reported frequency of worry, tension, mood shifts, and steadiness during recovery. A higher score can be associated with staying relatively calm under ordinary stress and returning to routine after an emotional wave. A lower score is not weakness or a clinical problem; it may reflect greater sensitivity to signals and stronger reactions to changing circumstances. This scale does not diagnose anxiety, depression, or any other condition, and it should not replace professional care. Interpret it alongside recent sleep, workload, conflict, and health context. When tension rises, experiment with a concrete recovery action such as a pause, slower breathing, a walk, or a conversation with someone trustworthy. If distress is persistent or interferes with daily life, professional support matters more than any test score. The result is a momentary self-report profile, not a forecast of your future mood.",
  }),
  intellect: Object.freeze({
    ko: "개방성·지적 탐구 점수는 새로운 관점, 추상적 개념, 상상과 아이디어를 탐색하는 경향을 살펴봅니다. 높은 점수는 익숙하지 않은 주제를 연결하고 여러 해석을 시험하며 복잡한 질문을 오래 붙들 수 있음을 보여 줄 수 있습니다. 낮은 점수는 상상력이 부족하다는 뜻이 아니라, 검증된 절차와 구체적 경험을 통해 이해하는 방식을 더 선호할 가능성을 뜻합니다. 아이디어를 좋아하는 것과 실제로 실행하는 것은 다른 차원이므로 성실성·환경·전문성도 함께 보아야 합니다. 새로운 것을 무조건 추구하거나 익숙한 방식을 무조건 고집할 필요는 없습니다. 한 주에 하나의 낯선 주제를 선택해 사실 확인과 자유로운 발상을 번갈아 해 보면 자신의 탐구 폭과 깊이를 균형 있게 관찰할 수 있습니다.",
    en: "Openness / Intellect describes interest in new viewpoints, abstract ideas, imagination, and conceptual exploration. A higher score can make it natural to connect unfamiliar topics, test several interpretations, and stay with a complex question. A lower score does not mean a lack of imagination; it may indicate a preference for concrete evidence, familiar procedures, and learning by direct experience. Enjoying ideas and turning them into action are different dimensions, so conscientiousness, resources, and context also matter. There is no need to chase novelty or reject familiar methods. Choose one unfamiliar topic and alternate between checking evidence and generating possibilities. That small experiment reveals whether your preference is for breadth, depth, or practical application. The score is a tendency in self-report responses, not a measure of intelligence, creativity, or cultural sophistication.",
  }),
});

const QUESTION: Readonly<Record<BigFiveFactor, Readonly<{ low: LocalizedText; middle: LocalizedText; high: LocalizedText }>>> = Object.freeze({
  extraversion: Object.freeze({
    low: Object.freeze({ ko: "혼자 회복한 뒤에도 꼭 이어 가고 싶은 관계는 무엇인가요?", en: "After recovering alone, which relationship do you still want to keep investing in?" }),
    middle: Object.freeze({ ko: "사람과 혼자 있는 시간의 비율이 지금의 에너지에 맞나요?", en: "Does your current balance between people and solitude fit your energy?" }),
    high: Object.freeze({ ko: "사람들과 에너지를 나눈 뒤 회복을 위해 필요한 경계는 무엇인가요?", en: "What boundary helps you recover after sharing energy with people?" }),
  }),
  agreeableness: Object.freeze({
    low: Object.freeze({ ko: "직접적인 판단을 유지하면서도 상대가 들을 수 있게 말하려면 무엇이 필요할까요?", en: "What would help you stay direct while making your view easier for another person to hear?" }),
    middle: Object.freeze({ ko: "배려와 자기 경계가 동시에 지켜졌던 최근의 대화는 무엇이었나요?", en: "Which recent conversation protected both consideration and your own boundary?" }),
    high: Object.freeze({ ko: "도움을 주기 전에 내 필요를 확인하는 짧은 질문은 무엇일까요?", en: "What short question could you ask yourself before offering help, so your own needs stay visible?" }),
  }),
  conscientiousness: Object.freeze({
    low: Object.freeze({ ko: "유연함을 지키면서도 반복해서 놓치는 한 가지를 어떤 장치로 보완할까요?", en: "What small device could support one recurring miss while preserving your flexibility?" }),
    middle: Object.freeze({ ko: "계획이 실제 행동으로 이어졌던 조건은 무엇이었나요?", en: "What conditions helped one of your plans become actual action?" }),
    high: Object.freeze({ ko: "완벽하게 끝내려는 마음과 충분히 끝내는 기준을 어떻게 구분할까요?", en: "How can you distinguish the need to finish perfectly from a sufficient finish?" }),
  }),
  emotionalStability: Object.freeze({
    low: Object.freeze({ ko: "긴장이 올라올 때 가장 먼저 줄일 수 있는 자극은 무엇인가요?", en: "When tension rises, which stimulus can you reduce first?" }),
    middle: Object.freeze({ ko: "평온함을 지켜 준 최근의 습관 하나는 무엇이었나요?", en: "Which recent habit helped you preserve steadiness?" }),
    high: Object.freeze({ ko: "침착함을 유지하면서도 도움을 요청해야 하는 신호는 무엇일까요?", en: "What signal would tell you to ask for help even while you remain composed?" }),
  }),
  intellect: Object.freeze({
    low: Object.freeze({ ko: "구체적인 경험에서 출발해 탐색해 보고 싶은 새로운 질문은 무엇인가요?", en: "What new question could you explore starting from a concrete experience?" }),
    middle: Object.freeze({ ko: "새로운 관점과 검증된 방법을 함께 사용했던 순간은 언제였나요?", en: "When did you use a new perspective together with a tested method?" }),
    high: Object.freeze({ ko: "아이디어를 넓히는 시간과 하나를 실행하는 시간을 어떻게 나눌까요?", en: "How will you divide time between expanding ideas and executing one of them?" }),
  }),
});

function band(score: FactorScore): "low" | "middle" | "high" {
  const tScore = score.norm?.tScore ?? 50 + (score.scalePosition0to100 - 50) * 0.3;
  if (tScore < 43) return "low";
  if (tScore > 57) return "high";
  return "middle";
}

export function factorExplanation(score: FactorScore): ExplanationBlock {
  const label = FACTOR_LABELS[score.factor];
  const normLabel = score.norm
    ? {
        ko: `현재 응답은 ${score.norm.percentile}백분위, T점수 ${score.norm.tScore.toFixed(1)}로 ${label.ko}의 기준 표본 분포와 비교됩니다.`,
        en: `This response pattern falls at the ${score.norm.percentile}th percentile with a T-score of ${score.norm.tScore.toFixed(1)} against the reference distribution for ${label.en}.`,
      }
    : {
        ko: `${label.ko}의 원점수는 인구 규준 없이 자기 응답 안에서만 해석됩니다.`,
        en: `The raw ${label.en} score is interpreted within this response set because no population norm is available.`,
      };

  return freezeExplanationBlock({
    id: `psychometric-factor-${score.factor}`,
    summary: Object.freeze({ ko: `${label.ko}: ${normLabel.ko}`, en: `${label.en}: ${normLabel.en}` }),
    detail: DETAIL[score.factor],
    method: Object.freeze({
      ko: "IPIP-50의 10개 문항을 역채점 규칙에 따라 합산했습니다. 신뢰도 표시는 공식 IPIP 표의 Cronbach's α를 사용하며, SEM과 95% 구간은 영어권 공개 기준 표본의 SD를 바탕으로 계산했습니다. 이는 진단용 신뢰구간이 아닙니다.",
      en: "Ten IPIP-50 items are summed after reverse scoring where keyed. The displayed reliability uses the published IPIP alpha, while SEM and the 95% interval use the English-language reference sample's SD. This is not a diagnostic confidence interval.",
    }),
    evidenceRefs: Object.freeze([`psychometric-factor:${score.factor}`]),
    citations: Object.freeze([GOLDBERG_1992, GOW_2005, IPIP_TABLE]),
    tier: "scientific",
  });
}

export function reflectionQuestion(score: FactorScore): LocalizedText {
  return QUESTION[score.factor][band(score)];
}

export function profileCombinationExplanation(scores: readonly FactorScore[]): ExplanationBlock | null {
  const ranked = [...scores].sort((left, right) => (right.norm?.tScore ?? right.mean * 10) - (left.norm?.tScore ?? left.mean * 10));
  const first = ranked[0];
  const second = ranked[1];
  if (!first || !second || first.factor === second.factor) return null;
  const firstLabel = FACTOR_LABELS[first.factor];
  const secondLabel = FACTOR_LABELS[second.factor];
  return freezeExplanationBlock({
    id: "psychometric-profile-combination",
    summary: Object.freeze({
      ko: `${firstLabel.ko}와 ${secondLabel.ko}를 함께 살펴보는 자기성찰 조합`,
      en: `A self-reflection pairing of ${firstLabel.en} and ${secondLabel.en}`,
    }),
    detail: Object.freeze({
      ko: `두 점수가 동시에 높거나 낮다는 사실만으로 새로운 성격 유형이나 행동 결과를 추론할 수는 없습니다. 이 블록은 각각의 측정 차원을 한 장면에서 관찰하기 위한 질문을 제공합니다. ${firstLabel.ko}가 작동하는 방식과 ${secondLabel.ko}가 요구하는 조건이 서로 잘 맞았던 상황, 혹은 충돌했던 상황을 하나씩 떠올려 보세요. 조합은 계산된 상관계수나 임상적 판단이 아니라 두 개의 연속 점수를 나란히 읽는 방법입니다.`,
      en: `Two scores do not establish a new personality type or prove a behavioral outcome. This block simply offers a prompt for observing the two measured dimensions in one situation. Recall one context where the way ${firstLabel.en} operated fit the demands of ${secondLabel.en}, and one context where they pulled in different directions. The pairing is a side-by-side reading of two continuous scores, not a calculated interaction coefficient or a clinical judgment.`,
    }),
    method: Object.freeze({
      ko: "조합 문장은 두 요인의 점수와 문헌의 측정 개념만 연결하며, 조합 자체의 예측 타당도를 주장하지 않습니다.",
      en: "The pairing connects two measured dimensions and their published constructs; it does not claim predictive validity for the combination itself.",
    }),
    evidenceRefs: Object.freeze([`psychometric-factor:${first.factor}`, `psychometric-factor:${second.factor}`]),
    citations: Object.freeze([GOLDBERG_1992, GOW_2005]),
    tier: "scientific",
  });
}
