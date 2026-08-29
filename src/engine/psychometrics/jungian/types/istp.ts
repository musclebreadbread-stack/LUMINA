import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ISTP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ISTP", {
  AV: {
    nickname: { ko: "흔들림도 바로 드러내는 현장 해결사", en: "The On-the-Spot Fixer Who Shows It" },
    keywords: [
      { ko: "직접 확인", en: "Direct Verification" },
      { ko: "흔들리지 않는 판단", en: "Unshaken Judgment" },
      { ko: "겉으로 드러나는 감정", en: "Visible Emotional Signals" },
    ],
    summary: { ko: "실제 상황을 빠르게 관찰하고 도구와 원리로 문제를 해결하는 현장형입니다. 스트레스 앞에서도 흔들리지 않는 확신을 유지하는 경향이 상대적으로 높게 보고되며, 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 방향으로 보고됩니다.", en: "A hands-on problem-solver who reads real situations quickly and reaches for the right tool or principle. Confidence tends to hold steady even under pressure, and when emotions do shift, signs like irritability or mood swings tend to surface outwardly first." },
    strengths: { ko: "위기 상황에서도 침착하게 우선순위를 정리하고 바로 행동에 옮기는 힘이 강점으로 보고됩니다. 다만 확신이 강할 때는 다른 의견을 충분히 검토하지 않고 넘어가는 경우가 있어, 짜증이 겉으로 드러난 순간을 판단의 신호로 활용하면 관계를 오래 유지하는 데 도움이 될 수 있습니다.", en: "Staying composed under pressure and moving straight into action once a priority is clear stands out as a strength. At the same time, strong confidence can mean other viewpoints get skipped over, so treating a flash of irritability as a signal to pause and reconsider can help relationships hold steady longer." },
    relationships: { ko: "가까운 관계에서는 문제를 바로 해결하려는 태도로 실질적인 도움을 주는 편으로 보고됩니다. 갈등 상황에서는 짜증이나 날카로운 말투가 먼저 튀어나올 수 있어, 감정이 올라온 순간 잠시 멈추고 표현을 고르는 습관이 관계를 지키는 데 도움이 될 수 있습니다.", en: "In close relationships, there's a tendency to jump straight into fixing whatever is wrong, which can feel genuinely useful to others. During conflict, irritability or a sharper tone may surface first, so pausing for a moment before choosing words can help protect the relationship." },
    work: { ko: "정해진 매뉴얼보다 직접 만지고 확인하며 답을 찾는 환경에서 몰입도가 높게 보고됩니다. 자신의 판단에 확신을 갖고 밀어붙이는 편이라, 결정을 내리기 전에 동료의 관점을 한 번 더 물어보는 절차를 두면 성과를 더 안정적으로 쌓아갈 수 있습니다. 어떤 협업 방식이 확신과 균형을 함께 지켜줄지 살펴볼 만합니다.", en: "Environments that allow hands-on tinkering and direct verification tend to draw stronger engagement than ones built around fixed manuals. A readiness to trust one's own judgment and push forward can be an asset, though building in a habit of asking a colleague's view before finalizing a call may make results more consistent. Worth exploring which collaboration style keeps that confidence and balance together." },
    growth: [
      { ko: "짜증이 올라오는 순간, 말을 하기 전에 세 번 숨을 고르면 무엇이 달라질까요?", en: "When irritation starts to rise, what might change if you took three breaths before speaking?" },
      { ko: "이번 주에 확신이 강하게 드는 결정 하나를 동료에게 먼저 물어봐도 괜찮을까요?", en: "Could you run one of this week's strong convictions past a colleague before deciding?" },
      { ko: "감정이 겉으로 드러난 뒤, 그 신호를 상대에게 짧게 설명해보면 어떤 반응이 돌아올까요?", en: "After an emotional reaction shows on the outside, what happens if you briefly explain the signal to the other person?" },
    ],
  },
  AW: {
    nickname: { ko: "흔들림을 안으로 삼키는 현장 해결사", en: "The On-the-Spot Fixer Who Holds It In" },
    keywords: [
      { ko: "직접 확인", en: "Direct Verification" },
      { ko: "흔들리지 않는 판단", en: "Unshaken Judgment" },
      { ko: "조용히 소화하는 감정", en: "Quietly Processed Emotions" },
    ],
    summary: { ko: "실제 상황을 빠르게 관찰하고 도구와 원리로 문제를 해결하는 현장형입니다. 스트레스 앞에서도 흔들리지 않는 확신을 유지하는 경향이 상대적으로 높게 보고되며, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 방향으로 보고됩니다.", en: "A hands-on problem-solver who reads real situations quickly and reaches for the right tool or principle. Confidence tends to hold steady even under pressure, yet when emotions do shift, signs like worry or a quieter mood tend to surface inwardly first." },
    strengths: { ko: "위기 상황에서도 침착하게 우선순위를 정리하고 바로 행동에 옮기는 힘이 강점으로 보고됩니다. 다만 확신이 강할 때는 마음이 가라앉는 신호를 스스로도 늦게 알아차리는 경우가 있어, 낮은 기분이 느껴지는 순간을 미리 알아차리고 표현하는 연습이 도움이 될 수 있습니다.", en: "Staying composed under pressure and moving straight into action once a priority is clear stands out as a strength. At the same time, that steadiness can mean a dip in mood goes unnoticed by the person themselves for a while, so practicing early recognition and expression of a lower mood can be worth building." },
    relationships: { ko: "가까운 관계에서는 문제를 바로 해결하려는 태도로 실질적인 도움을 주는 편으로 보고됩니다. 갈등 상황에서는 말수가 줄고 혼자 생각을 정리하려는 경향이 먼저 나타날 수 있어, 지금 거리를 두고 있다는 것을 짧게라도 알려주면 오해를 줄이는 데 도움이 될 수 있습니다.", en: "In close relationships, there's a tendency to jump straight into fixing whatever is wrong, which can feel genuinely useful to others. During conflict, a pull toward going quiet and sorting things out alone tends to show up first, so a brief heads-up about needing space can help prevent misunderstandings." },
    work: { ko: "정해진 매뉴얼보다 직접 만지고 확인하며 답을 찾는 환경에서 몰입도가 높게 보고됩니다. 확신을 갖고 있어도 속으로 부담을 쌓아두는 경우가 있어, 진행 상황을 짧게라도 공유하는 절차를 두면 혼자 짊어지는 무게를 줄일 수 있습니다. 어떤 팀 분위기가 조용한 신호를 미리 알아차려 줄 수 있을지 살펴볼 만합니다.", en: "Environments that allow hands-on tinkering and direct verification tend to draw stronger engagement than ones built around fixed manuals. Even with solid confidence, pressure can quietly build up unspoken, so a habit of sharing brief progress updates can lighten the load of carrying things alone. Worth exploring what kind of team atmosphere tends to catch quiet signals early." },
    growth: [
      { ko: "마음이 가라앉는 것을 느낀 첫 순간을 오늘 하루 기록해보면 무엇이 보일까요?", en: "What might you notice if you jotted down the very first moment your mood dipped today?" },
      { ko: "이번 주에 혼자 정리하고 싶은 마음이 들 때, 그 사실만 짧게 알려봐도 괜찮을까요?", en: "When you feel the pull to sort things out alone this week, could you at least mention that much out loud?" },
      { ko: "확신이 있는데도 말을 아끼게 되는 순간, 무엇이 망설이게 만드는지 물어봐도 될까요?", en: "In a moment when you're sure but still holding back words, what's worth asking about the hesitation?" },
    ],
  },
  TV: {
    nickname: { ko: "매번 점검하며 티 나게 반응하는 해결사", en: "The Fixer Who Double-Checks and Shows It" },
    keywords: [
      { ko: "잦은 자기점검", en: "Frequent Self-Checking" },
      { ko: "즉각적 대응", en: "Quick Reactivity" },
      { ko: "겉으로 드러나는 감정", en: "Visible Emotional Signals" },
    ],
    summary: { ko: "실제 상황을 빠르게 관찰하고 도구와 원리로 문제를 해결하는 현장형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 경향이 상대적으로 높게 보고되고, 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 방향으로 보고됩니다.", en: "A hands-on problem-solver who reads real situations quickly and reaches for the right tool or principle. Sensitivity to change or others' evaluations tends to run higher, prompting frequent self-checking, and when emotions shift, irritability or mood swings tend to show outwardly first." },
    strengths: { ko: "상황 변화를 민감하게 읽어내고 필요할 때마다 스스로를 점검하며 실수를 빠르게 바로잡는 힘이 강점으로 보고됩니다. 다만 점검이 잦아지면 짜증이나 예민한 반응으로 먼저 드러날 수 있어, 점검의 기준을 미리 정해두면 에너지를 오래 유지하는 데 도움이 될 수 있습니다.", en: "Reading shifts in a situation quickly and checking in with oneself often enough to catch mistakes early stands out as a strength. At the same time, frequent self-checking can surface first as irritability or a sharp reaction, so setting clearer checkpoints in advance can help preserve energy over time." },
    relationships: { ko: "가까운 관계에서는 상대의 반응을 세심하게 살피고 필요한 부분을 먼저 챙기는 편으로 보고됩니다. 갈등 상황에서는 예민해진 마음이 짜증이나 격한 반응으로 먼저 드러날 수 있어, 반응하기 전에 상대의 말을 한 번 더 확인하는 습관이 관계를 지키는 데 도움이 될 수 있습니다.", en: "In close relationships, there's a tendency to watch the other person's reactions closely and attend to what they need early on. During conflict, heightened sensitivity may surface first as irritability or a sharp response, so pausing to double-check what was actually said before reacting can help protect the relationship." },
    work: { ko: "정해진 매뉴얼보다 직접 만지고 확인하며 답을 찾는 환경에서 몰입도가 높게 보고됩니다. 주변의 평가에 민감하게 반응하는 편이라, 피드백을 받는 시점과 방식을 미리 정해두면 불필요하게 소모되는 에너지를 줄일 수 있습니다. 어떤 피드백 방식이 점검 욕구와 안정감을 함께 채워줄 수 있을지 살펴볼 만합니다.", en: "Environments that allow hands-on tinkering and direct verification tend to draw stronger engagement than ones built around fixed manuals. A heightened sensitivity to others' evaluations can mean feedback lands harder than intended, so agreeing on when and how feedback is delivered ahead of time can save unnecessary energy. Worth exploring what kind of feedback rhythm satisfies the need to check while still feeling steady." },
    growth: [
      { ko: "완벽하게 점검하지 않고 넘어가도 괜찮은 일 하나를 이번 주에 골라볼 수 있을까요?", en: "Could you pick one task this week where skipping a full check would still be fine?" },
      { ko: "타인의 평가를 듣기 전에, 스스로 먼저 내린 판단을 믿어보면 어떤 느낌일까요?", en: "What would it feel like to trust your own judgment before hearing anyone else's evaluation?" },
      { ko: "짜증이 올라오려는 순간을 알아차렸을 때, 그 반응을 30초만 미뤄보면 무엇이 달라질까요?", en: "When you notice irritation about to surface, what changes if you hold the reaction for 30 seconds?" },
    ],
  },
  TW: {
    nickname: { ko: "매번 점검하며 조용히 견디는 해결사", en: "The Fixer Who Double-Checks Quietly" },
    keywords: [
      { ko: "잦은 자기점검", en: "Frequent Self-Checking" },
      { ko: "즉각적 대응", en: "Quick Reactivity" },
      { ko: "조용히 소화하는 감정", en: "Quietly Processed Emotions" },
    ],
    summary: { ko: "실제 상황을 빠르게 관찰하고 도구와 원리로 문제를 해결하는 현장형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 경향이 상대적으로 높게 보고되고, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 방향으로 보고됩니다.", en: "A hands-on problem-solver who reads real situations quickly and reaches for the right tool or principle. Sensitivity to change or others' evaluations tends to run higher, prompting frequent self-checking, and when emotions shift, worry or a quieter mood tend to surface inwardly first." },
    strengths: { ko: "상황 변화를 민감하게 읽어내고 필요할 때마다 스스로를 점검하며 실수를 빠르게 바로잡는 힘이 강점으로 보고됩니다. 다만 점검이 잦아지면 걱정이 안으로 쌓이며 기운이 조용히 가라앉을 수 있어, 점검의 기준을 미리 정해두면 에너지를 오래 유지하는 데 도움이 될 수 있습니다.", en: "Reading shifts in a situation quickly and checking in with oneself often enough to catch mistakes early stands out as a strength. At the same time, frequent self-checking can pile up as quiet worry that gradually drains energy, so setting clearer checkpoints in advance can help sustain it over time." },
    relationships: { ko: "가까운 관계에서는 상대의 반응을 세심하게 살피고 필요한 부분을 먼저 챙기는 편으로 보고됩니다. 갈등 상황에서는 예민해진 마음이 걱정으로 쌓이며 스스로 위축되는 방향으로 먼저 나타날 수 있어, 마음이 가라앉기 전에 짧게라도 상황을 공유하는 습관이 도움이 될 수 있습니다.", en: "In close relationships, there's a tendency to watch the other person's reactions closely and attend to what they need early on. During conflict, heightened sensitivity may surface first as inward worry and a pull to withdraw, so sharing even a short update before the mood dips further can help." },
    work: { ko: "정해진 매뉴얼보다 직접 만지고 확인하며 답을 찾는 환경에서 몰입도가 높게 보고됩니다. 주변의 평가에 민감하게 반응하며 걱정을 속으로 쌓아두는 편이라, 마감이나 결과에 대한 불안을 미리 나눌 수 있는 창구를 두면 도움이 될 수 있습니다. 어떤 업무 리듬이 부담을 조용히 쌓아두지 않도록 도와줄지 살펴볼 만합니다.", en: "Environments that allow hands-on tinkering and direct verification tend to draw stronger engagement than ones built around fixed manuals. A heightened sensitivity to others' evaluations paired with a tendency to hold worry inward means having an outlet to share anxiety about deadlines or outcomes ahead of time can help. Worth exploring what kind of work rhythm keeps pressure from quietly stacking up." },
    growth: [
      { ko: "걱정이 쌓이기 시작하는 순간을 이번 주에 한 번 알아차려 볼 수 있을까요?", en: "Could you catch the exact moment worry starts building, just once this week?" },
      { ko: "완벽하게 점검하지 않고 넘어가도 괜찮은 일이 있다면, 무엇일까요?", en: "If there's a task where skipping a full check would still be fine, what would it be?" },
      { ko: "마음이 가라앉기 전에, 지금 느끼는 부담을 한 문장으로 말해보면 어떨까요?", en: "Before the mood sinks further, what happens if you put today's pressure into a single sentence?" },
    ],
  },
});
