import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const INTJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("INTJ", {
  AV: {
    nickname: { ko: "흔들림도 숨기지 않는 전략 설계자", en: "The Strategic Architect Who Shows the Cracks" },
    keywords: [
      { ko: "구조화", en: "Structured Thinking" },
      { ko: "당당한 추진력", en: "Bold Momentum" },
      { ko: "즉각적 감정 표출", en: "Visible Emotional Shifts" },
    ],
    summary: { ko: "복잡한 정보를 구조와 전략으로 정리하고, 장기적인 목표를 독립적으로 설계하는 탐구형입니다. 스트레스 앞에서도 확신을 유지하는 편이지만, 감정이 흔들릴 때는 짜증이나 기분 변화가 겉으로 먼저 드러나는 경향이 함께 보고됩니다.", en: "A structured, independent planner who turns complex information into long-term strategy and rarely loses composure under pressure. When emotions do shift, irritability or mood changes tend to surface outwardly before anything else." },
    strengths: { ko: "복잡한 문제를 흔들림 없이 정리하고, 어려운 상황에서도 확신을 갖고 밀어붙이는 힘이 강점으로 보고됩니다. 다만 그 확신이 강할수록 주변 신호를 놓치기 쉽고, 감정이 격해질 때 즉각적으로 표현되는 반응이 관계를 급하게 만들 수 있다는 점은 함께 살펴볼 성장 과제입니다.", en: "A striking ability to stay composed under pressure and push plans forward with real conviction stands out as a core strength. At the same time, that same certainty can crowd out outside input, and reactions that surface quickly when tension rises are worth noticing as a growth area." },
    relationships: { ko: "가까운 관계에서도 의견을 분명하게 전달하고 흔들리지 않는 태도를 보이는 편입니다. 다만 감정이 상했을 때는 짜증이나 날카로운 말투로 먼저 드러나는 경향이 있어, 상대가 그 신호를 서운함이나 갈등으로 받아들이지 않도록 속도를 조절하는 대화가 도움이 될 수 있습니다.", en: "In close relationships, opinions tend to be stated clearly and confidently, without much wavering. But when something stings emotionally, irritation or a sharper tone often shows up first, so pacing the conversation can help a partner read that signal as tension rather than rejection." },
    work: { ko: "명확한 방향과 자율성이 보장되는 환경에서 강점이 잘 드러나는 편입니다. 스트레스가 커져도 겉으로는 침착함을 유지하는 경우가 많지만, 즉각적인 감정 반응이 팀 분위기에 영향을 줄 수 있어 어떤 협업 방식이 자신에게도 편안한지 스스로 탐색해볼 만합니다.", en: "Strengths tend to surface most clearly in settings with clear direction and real autonomy. Composure often holds up on the outside even under pressure, but quick emotional reactions can ripple through a team, so it is worth exploring what collaboration style feels sustainable." },
    growth: [
      { ko: "확신이 강하게 들 때, 잠시 멈춰 다른 사람의 의견을 먼저 들어봐도 괜찮을까요?", en: "When conviction feels strongest, is there room to pause and hear someone else's view first?" },
      { ko: "짜증이 올라올 때, 말로 표현하기 전에 그 감정의 이유를 스스로에게 물어본 적이 있나요?", en: "Before irritation comes out in words, have you asked yourself what is actually behind it?" },
      { ko: "이번 주에 계획이 흔들려도 괜찮다고 스스로에게 말해줄 수 있는 순간이 있을까요?", en: "Is there a moment this week you could tell yourself it is okay if the plan wavers?" },
    ],
  },
  AW: {
    nickname: { ko: "속으로 다잡는 전략 설계자", en: "The Strategic Architect Who Steadies Quietly Within" },
    keywords: [
      { ko: "구조화", en: "Structured Thinking" },
      { ko: "차분한 확신", en: "Quiet Confidence" },
      { ko: "조용한 재정비", en: "Inward Recalibration" },
    ],
    summary: { ko: "복잡한 정보를 구조와 전략으로 정리하고, 장기적인 목표를 독립적으로 설계하는 탐구형입니다. 스트레스 앞에서도 겉으로는 흔들림 없이 확신을 유지하지만, 마음이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 있습니다.", en: "A structured, independent planner who turns complex information into long-term strategy and holds a steady, confident front even under stress. When something does unsettle them, worry or a quieter mood tends to surface inward before it shows on the outside." },
    strengths: { ko: "겉으로 흔들리지 않는 태도로 어려운 상황에서도 계획을 밀고 나가는 힘이 강점으로 보고됩니다. 다만 걱정이나 낮은 기분이 안으로 쌓이기 쉬워, 스스로도 알아채지 못한 채 부담이 누적될 수 있다는 점은 함께 돌봐야 할 성장 과제입니다.", en: "Holding a calm, unshaken front while pushing plans forward through difficulty is a clear strength here. At the same time, worry or a dip in mood can quietly accumulate inward, sometimes building up before it is even consciously noticed, which is worth tending to." },
    relationships: { ko: "가까운 관계에서도 침착하고 확신 있는 태도를 보이는 편이라 안정감을 주는 경우가 많습니다. 다만 서운함이나 걱정을 겉으로 잘 드러내지 않아, 상대는 아무 문제가 없다고 오해할 수 있어 마음 상태를 조금 더 말로 표현하는 연습이 도움이 될 수 있습니다.", en: "In close relationships, a calm and confident manner often gives partners a real sense of stability. But hurt feelings or worry rarely show on the surface, so a partner may assume nothing is wrong, making it worth practicing putting that inner state into words more often." },
    work: { ko: "명확한 목표와 독립적인 작업 방식이 보장되는 환경에서 강점이 잘 드러나는 편입니다. 겉으로는 흔들림이 거의 보이지 않아 신뢰를 얻기 쉽지만, 내면의 부담을 스스로 점검할 수 있는 여유를 두는 것이 장기적으로 어떤 도움이 될지 탐색해볼 만합니다.", en: "Strengths tend to show most clearly in roles with clear goals and room to work independently. A steady outward manner tends to build trust quickly, but it may be worth exploring what kind of space would help in checking in on inward pressure before it builds too far." },
    growth: [
      { ko: "걱정이 마음속에 쌓일 때, 그 무게를 누군가에게 말로 옮겨본 적이 있나요?", en: "When worry starts to build inside, have you tried putting that weight into words for someone else?" },
      { ko: "겉으로는 괜찮아 보여도, 오늘 하루 스스로에게 정말 괜찮은지 물어본 순간이 있었나요?", en: "Even when things look fine on the outside, was there a moment today you actually checked in with yourself?" },
      { ko: "계획이 뜻대로 되지 않을 때, 자책 대신 잠시 쉬어가도 괜찮은 이유를 찾아볼 수 있을까요?", en: "When a plan does not go as intended, could you look for a reason it is okay to rest instead of self-blame?" },
    ],
  },
  TV: {
    nickname: { ko: "예민하게 반응하는 전략 설계자", en: "The Strategic Architect Who Feels Every Shift" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sharp Self-Monitoring" },
      { ko: "즉각적 감정 표출", en: "Visible Emotional Shifts" },
      { ko: "높은 기준", en: "High Standards" },
    ],
    summary: { ko: "복잡한 정보를 구조와 전략으로 정리하고, 장기적인 목표를 독립적으로 설계하는 탐구형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 짜증이나 기분 변화가 겉으로 먼저 드러나는 경향이 함께 보고됩니다.", en: "A structured, independent planner who turns complex information into long-term strategy while staying closely attuned to change and how others perceive it, often checking in on themselves. When emotions shift, irritability or visible mood changes tend to surface first." },
    strengths: { ko: "세부적인 허점까지 놓치지 않는 예리한 점검력이 계획의 완성도를 높이는 강점으로 보고됩니다. 다만 그 예민함이 자기 비판으로 이어지기 쉽고, 감정이 격해질 때 즉각적으로 표현되는 반응이 스스로를 더 지치게 만들 수 있다는 점은 함께 돌봐야 할 성장 과제입니다.", en: "A sharp eye for catching the smallest gaps in a plan before anyone else notices stands out as a real strength here. At the same time, that same sensitivity can slide into self-criticism, and quick, visible emotional reactions can leave even more exhausted than the situation warrants." },
    relationships: { ko: "가까운 관계에서 상대의 말투나 표정 변화까지 놓치지 않고 알아차리며 세심하게 챙기는 모습을 보일 때가 많습니다. 다만 긴장이 커지면 짜증이나 날카로운 말투로 먼저 드러나는 경향이 있어, 그 반응이 관계 자체에 대한 불만이 아니라는 점을 서로 확인하는 대화가 도움이 될 수 있습니다.", en: "In close relationships, catching every shift in a partner's tone or expression often shows up as real attentiveness and care. But when tension rises, irritation or a sharper tone tends to appear first, so it can help to clarify together that this reaction is not about the relationship itself." },
    work: { ko: "명확한 기준과 성장의 여지가 함께 있는 환경에서 스스로를 점검하는 힘이 결과물의 완성도를 끌어올리는 강점으로 이어지는 편입니다. 다만 즉각적인 감정 반응이 주변에 전달될 수 있어 압박이 커질 때 어떤 방식으로 긴장을 풀 수 있을지 탐색해볼 만합니다.", en: "In settings that pair clear standards with room to grow, checking in on one's own work closely tends to translate into a stronger final result. But quick emotional reactions can be felt by others nearby, so it is worth exploring ways to release tension when pressure builds." },
    growth: [
      { ko: "스스로를 점검할 때, 잘한 부분을 먼저 떠올려본 적이 있나요?", en: "When checking in on yourself, have you started by naming what went well first?" },
      { ko: "짜증이 올라오는 순간, 그것이 상황 때문인지 스스로에 대한 기준 때문인지 구분해본 적이 있나요?", en: "In a moment of irritation, have you tried to separate what is about the situation from what is about your own standards?" },
      { ko: "타인의 평가를 확인하지 않고도 스스로 만족할 수 있는 기준을 하루쯤 시도해볼 수 있을까요?", en: "Could you try, just for a day, measuring your own satisfaction without checking anyone else's evaluation?" },
    ],
  },
  TW: {
    nickname: { ko: "혼자 곱씹는 전략 설계자", en: "The Strategic Architect Who Reflects in Silence" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sharp Self-Monitoring" },
      { ko: "조용한 되새김", en: "Silent Rumination" },
      { ko: "높은 기준", en: "High Standards" },
    ],
    summary: { ko: "복잡한 정보를 구조와 전략으로 정리하고, 장기적인 목표를 독립적으로 설계하는 탐구형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 있습니다.", en: "A structured, independent planner who turns complex information into long-term strategy while staying closely attuned to change and how others perceive it, often checking in on themselves. When something unsettles them, worry or a quieter mood tends to surface inward first." },
    strengths: { ko: "높은 기준을 놓지 않으면서 계획의 허점을 미리 짚어내는 신중함이 강점으로 보고됩니다. 다만 그 점검이 혼자만의 되새김으로 길어지기 쉽고, 걱정이 안으로 쌓여 정작 필요한 순간에 도움을 청하지 못하게 만들 수 있다는 점은 함께 돌봐야 할 성장 과제입니다.", en: "Holding a high bar while quietly spotting weak points in a plan ahead of time stands out as a real strength here. At the same time, that same checking can stretch into long, solitary rumination, and inward-building worry can make it harder to ask for help exactly when it is needed." },
    relationships: { ko: "가까운 관계에서 상대가 무심코 던진 말 한마디도 오래 마음에 담아두며 세심하게 챙기는 모습을 보일 때가 많습니다. 다만 걱정이나 서운함을 혼자 곱씹으며 안으로 삭이는 경향이 있어, 상대는 그 변화를 알아채기 어려울 수 있어 마음을 조금 더 일찍 나누는 연습이 도움이 될 수 있습니다.", en: "In close relationships, noticing and quietly holding onto even a single offhand comment from a partner often shows up as real attentiveness and care. But worry or hurt feelings tend to be mulled over alone and absorbed inward, making the shift hard for a partner to notice, so sharing it a little earlier can help." },
    work: { ko: "뚜렷한 기준과 성장의 여지가 함께 있는 환경에서 꼼꼼한 자기 점검이 결과물의 완성도를 끌어올리는 강점으로 이어지는 편입니다. 다만 걱정을 혼자 끌어안고 되새기는 시간이 길어질 수 있어 부담을 나눌 수 있는 협업 방식을 미리 탐색해볼 만합니다.", en: "In settings that pair well-defined standards with room to grow, careful self-checking tends to translate into a stronger final result. But worry can be carried alone for long stretches, so it is worth exploring collaboration styles that make room to share the load." },
    growth: [
      { ko: "걱정이 안으로 쌓일 때, 그것을 글로 적어 밖으로 꺼내본 적이 있나요?", en: "When worry builds up inside, have you tried writing it down to get it outside your head?" },
      { ko: "스스로를 점검하는 시간이 길어질 때, 잠시 멈추고 쉬어도 괜찮다고 말해줄 수 있을까요?", en: "When self-checking starts to run long, could you pause and tell yourself it is okay to rest?" },
      { ko: "혼자 해결하려 하기 전에, 이번 한 번은 다른 사람에게 먼저 물어봐도 괜찮을까요?", en: "Before trying to solve it alone, would it be okay just this once to ask someone else first?" },
    ],
  },
});
