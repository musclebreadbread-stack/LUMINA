import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ISTJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ISTJ", {
  AV: {
    nickname: { ko: "감정을 숨기지 않는 원칙의 실무가", en: "The Principled Practitioner Who Wears Feelings Openly" },
    keywords: [
      { ko: "표정에 드러나는 신호", en: "Visible Emotional Cues" },
      { ko: "흔들림 없는 확신", en: "Steady Composure" },
      { ko: "체계적 마무리", en: "Systematic Follow-through" },
    ],
    summary: { ko: "구체적인 사실과 약속을 중시하고 정해 둔 순서로 일을 끝까지 책임지는 원칙의 실무가입니다. 스트레스 상황에서도 흔들림 없는 확신을 유지하는 편이지만, 감정이 움직일 때는 표정이나 말투처럼 겉으로 드러나는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant values concrete facts and commitments, quietly carrying tasks through to completion in a set order. Even under pressure, a steady sense of confidence tends to hold, though when emotions do shift, signals like expression or tone tend to surface outwardly first, more often than not." },
    strengths: { ko: "계획을 끝까지 지키는 꾸준함과 스트레스 상황에서도 흔들리지 않는 침착함이 강점으로 보고됩니다. 다만 감정이 격해질 때 짜증이나 표정 변화가 먼저 드러나 주변이 그 신호를 먼저 알아차리는 경우가 있어, 스스로 그 신호를 알아차리는 연습이 성장 과제로 함께 다뤄질 수 있습니다.", en: "A steady follow-through on plans and a calm composure that holds up under pressure are commonly reported strengths. At the same time, when emotions run high, irritability or a shift in expression tends to surface first and others may notice it before you do, which makes recognizing that early signal in yourself a worthwhile growth area." },
    relationships: { ko: "가까운 관계에서는 약속을 지키고 필요한 일을 묵묵히 처리하는 방식으로 신뢰를 쌓는 편입니다. 갈등이 생기면 겉으로 짜증이나 냉랭한 태도가 먼저 드러날 수 있어, 상대가 그 신호를 갈등의 신호로 읽고 대화를 시도할 여지가 상대적으로 큰 편입니다.", en: "In close relationships, trust tends to build through quietly following through on promises and handling what needs doing. When conflict arises, irritation or a cooler tone often surfaces first on the outside, which can actually give the other person an early, visible cue to start a conversation about what is wrong." },
    work: { ko: "정해진 절차와 명확한 역할 분담이 있는 환경에서 안정적으로 움직이는 편이며, 스트레스가 큰 순간에도 확신을 유지하는 힘이 있습니다. 다만 감정의 신호가 표정이나 말투로 먼저 나오는 편이라, 바쁜 시기에 동료에게 상황을 미리 짧게 알려두는 습관이 도움이 될 수 있습니다. 어떤 업무 환경에서 이 확신을 가장 편하게 유지할 수 있을지 스스로 살펴볼 만합니다.", en: "This variant tends to move steadily in environments with clear procedures and well-defined roles, holding onto confidence even under real pressure. Because emotional signals tend to show up first in expression or tone, briefly flagging a busy stretch to colleagues in advance can help keep things smooth. It may be worth exploring what kind of work setting lets that steadiness feel most natural." },
    growth: [
      { ko: "짜증이 표정으로 나오기 전에, 스스로 알아차릴 수 있는 신호가 있을까요?", en: "Is there a signal you could notice in yourself before irritation shows up on your face?" },
      { ko: "계획이 어긋났을 때, 침착함을 유지하면서도 감정을 한 문장으로 표현해 본다면 어떨까요?", en: "When a plan goes off track, what would it be like to name the feeling in one sentence while staying composed?" },
      { ko: "동료나 가족에게 컨디션이 안 좋은 날을 미리 짧게 알려보면 무엇이 달라질까요?", en: "What might change if you gave a colleague or family member a quick heads-up on an off day?" },
    ],
  },
  AW: {
    nickname: { ko: "속으로 다잡는 원칙의 실무가", en: "The Principled Practitioner Who Steadies Things Within" },
    keywords: [
      { ko: "안으로 쌓이는 신호", en: "Inward-Building Signals" },
      { ko: "겉으로는 침착", en: "Outward Calm" },
      { ko: "체계적 마무리", en: "Systematic Follow-through" },
    ],
    summary: { ko: "구체적인 사실과 약속을 중시하고 정해 둔 순서로 일을 끝까지 책임지는 원칙의 실무가입니다. 스트레스 상황에서도 겉으로는 확신을 유지하는 편이지만, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant values concrete facts and commitments, and quietly sees tasks through in a set order. On the outside, a sense of confidence tends to hold even under pressure, but when emotions shift, signals like worry or low mood tend to turn inward first, more often than not." },
    strengths: { ko: "압박 속에서도 겉으로 동요를 드러내지 않고 맡은 일을 끝까지 해내는 힘이 강점으로 보고됩니다. 다만 걱정이나 낮은 기분을 혼자 안고 가는 편이라, 스스로도 그 무게를 알아차리기 어려울 때가 있어 그 신호를 미리 알아차리고 나누는 연습이 성장 과제로 다뤄질 수 있습니다.", en: "Staying outwardly composed under pressure while still carrying tasks through to completion is a commonly reported strength. At the same time, worry or a low mood tends to be carried alone, sometimes to the point that even you may not notice its weight, which makes catching that signal early and sharing it a worthwhile growth area." },
    relationships: { ko: "가까운 관계에서는 겉으로 동요하지 않고 필요한 일을 묵묵히 처리하며 신뢰를 쌓는 편입니다. 갈등이 생기면 걱정이나 위축된 기분이 안으로 먼저 쌓여, 상대가 눈치채기 전에 스스로 먼저 이야기를 꺼내는 습관이 관계에 도움이 될 수 있습니다.", en: "In close relationships, trust tends to build through staying outwardly steady and quietly handling what needs doing. When conflict arises, worry or a withdrawn mood tends to build up inside first, so speaking up before the other person notices something is off can be a helpful habit for the relationship." },
    work: { ko: "명확한 기준과 예측 가능한 절차가 있는 환경에서 안정적으로 움직이며, 스트레스가 큰 순간에도 겉으로는 확신을 유지하는 힘이 있습니다. 다만 걱정을 혼자 처리하려는 경향이 있어, 부담이 쌓이기 전에 신뢰할 수 있는 동료와 상황을 나누는 구조가 있는 팀이 잘 맞을 수 있습니다. 어떤 업무 방식이 내면의 부담을 가장 가볍게 만드는지 살펴볼 만합니다.", en: "This variant tends to move steadily in environments with clear standards and predictable procedures, staying outwardly confident even under real pressure. Because worry tends to be handled alone, a team with structured ways to check in with trusted colleagues before pressure builds up may be a good fit. It may be worth exploring which way of working eases that inward weight the most." },
    growth: [
      { ko: "걱정이 쌓이기 시작하는 순간을 며칠 동안 기록해 본다면 무엇을 발견하게 될까요?", en: "What might you discover by tracking, over a few days, the moment worry starts to build?" },
      { ko: "낮은 기분을 느낄 때, 혼자 해결하기 전에 한 사람에게만 먼저 말해본다면 어떨까요?", en: "What would it be like to tell just one person before trying to work through a low mood alone?" },
      { ko: "겉으로 괜찮아 보이는 날에도, 스스로에게 '지금 정말 괜찮은가'라고 물어본 적이 있나요?", en: "On days when you look fine on the outside, have you ever paused to ask yourself if you truly are?" },
    ],
  },
  TV: {
    nickname: { ko: "점검하며 흔들리는 원칙의 실무가", en: "The Principled Practitioner Who Checks and Shows It" },
    keywords: [
      { ko: "잦은 자기점검", en: "Frequent Self-Checking" },
      { ko: "겉으로 드러나는 동요", en: "Visible Unease" },
      { ko: "체계적 마무리", en: "Systematic Follow-through" },
    ],
    summary: { ko: "구체적인 사실과 약속을 중시하고 정해 둔 순서로 일을 끝까지 책임지는 원칙의 실무가입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant values concrete facts and commitments, quietly carrying tasks through to completion in a set order. It tends to react sensitively to changes in a situation or other people's evaluations and check in on itself often, and when emotions shift, signals like irritability or a mood swing tend to surface outwardly first." },
    strengths: { ko: "세부 사항을 놓치지 않고 스스로를 자주 점검하며 일의 완성도를 높이는 힘이 강점으로 보고됩니다. 다만 평가나 변화에 민감하게 반응하다 보니 감정이 짜증이나 표정으로 먼저 드러나는 경우가 있어, 긴장이 쌓일 때 스스로를 다그치기보다 잠시 멈추는 연습이 성장 과제로 함께 다뤄질 수 있습니다.", en: "Catching small details and checking in on yourself often to raise the quality of your work are commonly reported strengths. At the same time, sensitivity to evaluation or change can mean irritability or a shift in expression surfaces first, so pausing rather than pushing yourself harder when tension builds can be a worthwhile growth area." },
    relationships: { ko: "가까운 관계에서는 약속을 지키고 세심하게 챙기는 방식으로 신뢰를 쌓는 편이지만, 상대의 반응이나 평가에 민감하게 반응할 수 있습니다. 갈등이 생기면 짜증이나 예민한 말투가 먼저 겉으로 드러날 수 있어, 감정이 올라오는 순간을 알아차리고 잠깐의 틈을 두는 습관이 관계에 도움이 될 수 있습니다.", en: "In close relationships, trust tends to build through keeping promises and paying close attention to the other person, though reactions or evaluations from them can register sensitively. When conflict arises, irritability or a sharper tone tends to surface first on the outside, so noticing the moment emotion rises and taking a brief pause can help the relationship." },
    work: { ko: "세부 사항을 꼼꼼히 점검하고 명확한 피드백이 오가는 환경에서 실력을 발휘하는 편입니다. 다만 평가에 민감하게 반응하는 경향이 있어, 성과에 대한 피드백이 즉각적이고 구체적으로 주어지는 팀에서 불필요한 긴장을 줄일 수 있습니다. 어떤 피드백 방식이 스스로에게 안정감을 주는지 살펴볼 만합니다.", en: "This variant tends to perform well in environments where details are carefully checked and feedback is clear. Because it tends to react sensitively to evaluation, a team that gives immediate, concrete feedback on performance may help reduce unnecessary tension. It may be worth exploring what kind of feedback style feels most steadying." },
    growth: [
      { ko: "타인의 평가를 듣고 짜증이 올라올 때, 그 반응을 3초만 늦춰본다면 무엇이 달라질까요?", en: "What might change if you gave yourself just three seconds before reacting when someone's feedback stings?" },
      { ko: "스스로를 점검하는 시간을 하루 중 정해진 한 번으로 제한해 본다면 어떨까요?", en: "What would it be like to limit self-checking to one set time a day instead of throughout?" },
      { ko: "완벽하지 않은 결과를 먼저 공유해 봐도 괜찮은 상황이 있을까요?", en: "Is there a situation where sharing an imperfect result first would be okay?" },
    ],
  },
  TW: {
    nickname: { ko: "조용히 점검하는 원칙의 실무가", en: "The Principled Practitioner Who Checks Quietly Within" },
    keywords: [
      { ko: "잦은 자기점검", en: "Frequent Self-Checking" },
      { ko: "안으로 쌓이는 걱정", en: "Inward-Building Worry" },
      { ko: "체계적 마무리", en: "Systematic Follow-through" },
    ],
    summary: { ko: "구체적인 사실과 약속을 중시하고 정해 둔 순서로 일을 끝까지 책임지는 원칙의 실무가입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant values concrete facts and commitments, quietly carrying tasks through to completion in a set order. It tends to react sensitively to changes or other people's evaluations and check in on itself often, and when emotions shift, signals like worry or a low mood tend to turn inward first." },
    strengths: { ko: "세부 사항을 꼼꼼히 살피고 스스로를 자주 점검하며 실수를 줄이는 힘이 강점으로 보고됩니다. 다만 평가나 변화에 민감하게 반응하며 걱정을 혼자 끌어안는 편이라, 그 무게가 쌓이기 전에 알아차리고 표현하는 연습이 성장 과제로 함께 다뤄질 수 있습니다.", en: "Carefully checking details and reviewing your own work often to cut down on mistakes are commonly reported strengths. At the same time, sensitivity to evaluation or change tends to come with carrying worry alone, so noticing that weight before it builds up and putting it into words can be a worthwhile growth area." },
    relationships: { ko: "가까운 관계에서는 약속을 지키고 세심하게 챙기는 방식으로 신뢰를 쌓는 편이지만, 상대의 반응에 민감하게 반응하며 혼자 걱정을 키우는 경우가 있습니다. 갈등이 생기면 말수가 줄고 안으로 위축되는 신호가 먼저 나타날 수 있어, 그 마음을 먼저 말로 꺼내는 습관이 관계에 도움이 될 수 있습니다.", en: "In close relationships, trust tends to build through keeping promises and paying close attention, though reactions from the other person can register sensitively and worry can build up alone. When conflict arises, going quiet and withdrawing tends to be an early signal, so putting that feeling into words first can help the relationship." },
    work: { ko: "세부 사항을 꼼꼼히 점검하며 정확성을 요구하는 환경에서 실력을 발휘하는 편입니다. 다만 평가에 민감하게 반응하며 걱정을 혼자 처리하려는 경향이 있어, 성과나 진행 상황을 자주, 부담 없이 확인할 수 있는 구조가 있는 팀이 잘 맞을 수 있습니다. 어떤 확인 방식이 마음의 부담을 가장 줄여주는지 살펴볼 만합니다.", en: "This variant tends to perform well in environments that demand accuracy and careful attention to detail. Because it tends to react sensitively to evaluation and handle worry alone, a team with a low-pressure structure for checking in on progress often may be a good fit. It may be worth exploring which kind of check-in eases that inner weight the most." },
    growth: [
      { ko: "걱정이 커지기 시작할 때, 그 생각을 글로 적어보면 무엇이 보일까요?", en: "What might you notice if you wrote down the thought behind a worry just as it starts to grow?" },
      { ko: "말수가 줄어드는 순간을 알아차렸을 때, 그 이유를 한 문장으로 말해본다면 어떨까요?", en: "What would it be like to name the reason in one sentence the moment you notice yourself going quiet?" },
      { ko: "완벽하지 않아도 괜찮다는 말을 스스로에게 건네본 적이 있나요?", en: "Have you ever told yourself that it is okay not to be perfect?" },
    ],
  },
});
