import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ESTJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ESTJ", {
  AV: {
    nickname: { ko: "확신으로 몰아붙이는 현장 지휘관", en: "The Steady Commander Who Pushes Fast" },
    keywords: [
      { ko: "신속한 결정", en: "Quick decisions" },
      { ko: "확고한 태도", en: "Steady resolve" },
      { ko: "즉각적 반응", en: "Immediate reactions" },
    ],
    summary: { ko: "목표와 기준을 분명히 정하고 사람과 자원을 조직해 결과를 만들어내는 체계의 운영자입니다. 스트레스 상황에서도 확신을 잃지 않고 앞장서서 밀어붙이지만, 감정이 흔들릴 때는 짜증이나 날카로운 말투처럼 겉으로 먼저 드러나는 편입니다.", en: "As an operator who sets clear goals and standards and organizes people and resources to deliver results, this type tends to stay composed and push forward even under pressure — though when strain builds, irritation or a sharper tone tends to surface outwardly first." },
    strengths: { ko: "위기 상황에서도 판단이 흐트러지지 않고 팀을 이끌어가는 힘이 강점으로 보고됩니다. 다만 확신이 강할수록 짜증이나 급한 어조가 먼저 새어 나올 수 있어, 속도를 늦추고 신호를 알아차리는 연습이 성장 과제로 남습니다.", en: "The ability to keep judgment steady and lead a team even in a crisis is often reported as a core strength. Yet the stronger the conviction, the more quickly irritation or a clipped tone can leak out first, making it worth practicing a pause to notice that signal before it colors the room." },
    relationships: { ko: "가까운 사이에서는 문제를 빠르게 짚고 해결책을 먼저 내놓는 편이며, 의견 차이가 생기면 감정보다 논리로 정리하려 합니다. 다만 답답함이 쌓이면 말투가 날카로워지는 신호가 먼저 나타나므로, 그 신호를 상대에게 미리 알려두면 갈등이 부드럽게 풀리는 경우가 많습니다.", en: "In close relationships, there's a tendency to name the problem quickly and offer a solution first, often reasoning through disagreements rather than leaning on emotion. Because a sharper tone tends to surface as frustration builds, naming that pattern to the other person in advance often helps conflicts resolve more smoothly." },
    work: { ko: "명확한 목표와 역할 분담이 있는 환경, 결정이 빠르게 실행으로 이어지는 조직에서 편안함을 느끼는 경향이 보고됩니다. 협업 방식을 고를 때는 내 속도가 다른 사람에게 어떤 신호로 읽히는지를 함께 확인하는 자리가 있는지 살펴보는 것도 도움이 될 수 있습니다.", en: "There's a reported tendency to feel comfortable in environments with clear goals and role division, where decisions move quickly into execution. When exploring collaboration styles, it may help to look for settings that also make space to check how one's pace and tone land with others." },
    growth: [
      { ko: "확신이 강해질 때, 잠깐 멈춰서 상대의 표정을 살펴보는 연습을 해볼 수 있을까요?", en: "When conviction runs high, could you try pausing for a moment to read the other person's expression first?" },
      { ko: "짜증이 말투로 새어 나오기 전에, 스스로 알아차릴 수 있는 신호는 무엇일까요?", en: "What's a signal you could notice in yourself before irritation leaks into your tone?" },
      { ko: "이번 주에 결정을 내리기 전 한 사람의 의견을 더 들어봐도 괜찮은 상황이 있을까요?", en: "Is there a decision this week where you could pause to hear one more opinion before moving forward?" },
    ],
  },
  AW: {
    nickname: { ko: "묵묵히 짊어지는 확신형 운영자", en: "The Composed Operator Who Carries It Quietly" },
    keywords: [
      { ko: "확고한 태도", en: "Steady resolve" },
      { ko: "책임 감수", en: "Quiet responsibility" },
      { ko: "속으로 삭이기", en: "Internalized strain" },
    ],
    summary: { ko: "목표와 기준을 분명히 정하고 사람과 자원을 조직해 결과를 만들어내는 체계의 운영자입니다. 스트레스 상황에서도 겉으로는 확신을 잃지 않지만, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 먼저 쌓이는 편입니다.", en: "As an operator who sets clear goals and standards and organizes people and resources to deliver results, this type tends to keep an outwardly steady, confident front even under pressure — but when strain builds, it tends to settle inward first as worry or a quieter, heavier mood." },
    strengths: { ko: "겉으로 흔들리지 않고 팀이 기댈 수 있는 기준점이 되어주는 점이 강점으로 보고됩니다. 다만 걱정을 혼자 짊어지다 보면 정작 도움이 필요한 순간에도 티를 내지 않아, 부담을 미리 나누는 연습이 성장 과제로 남습니다.", en: "Serving as a steady reference point the team can lean on, without visibly wavering, is often reported as a core strength. Yet carrying worry alone can mean the moment help is actually needed goes unspoken, making it worth practicing sharing the load before it piles up." },
    relationships: { ko: "가까운 사이에서도 걱정거리를 먼저 드러내기보다 혼자 정리한 뒤 결론만 전하는 경향이 있습니다. 상대는 무슨 일이 있었는지 뒤늦게 알게 되는 경우가 많아, 과정 중간에 한 번씩 상태를 짧게 공유하는 것만으로도 관계의 신뢰가 두터워질 수 있습니다.", en: "In close relationships, there's a tendency to sort through worries alone and share only the conclusion, rather than voicing concerns as they arise. Because the other person often learns what happened only after the fact, a brief mid-process check-in can go a long way toward deepening trust." },
    work: { ko: "혼자 판단하고 책임지는 재량이 있는 환경, 안정적으로 결과를 관리할 수 있는 구조에서 편안함을 느끼는 경향이 보고됩니다. 협업 방식을 고를 때는 부담이 쌓이고 있다는 신호를 눈치채고 물어봐 주는 동료나 절차가 있는지 살펴보는 것도 도움이 될 수 있습니다.", en: "There's a reported tendency to feel comfortable in environments that allow room to exercise judgment and take responsibility independently, along with structures that support steady, stable management of outcomes. When exploring collaboration styles, it may help to look for colleagues or processes that notice and check in when strain is quietly building." },
    growth: [
      { ko: "걱정이 쌓이고 있다는 걸 스스로 알아차리는 신호는 무엇일까요?", en: "What's a signal that lets you notice worry is quietly building before it takes over?" },
      { ko: "이번 주에 결론 대신 과정 중 하나를 누군가에게 먼저 말해봐도 괜찮을까요?", en: "Could you share one part of the process, not just the conclusion, with someone this week?" },
      { ko: "도움을 요청하는 게 약점이 아니라고 느껴지는 순간은 언제일까요?", en: "When does asking for help feel like something other than a weakness?" },
    ],
  },
  TV: {
    nickname: { ko: "점검하며 몰아붙이는 예민한 운영자", en: "The Self-Checking Operator Who Pushes Hard" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Frequent self-checks" },
      { ko: "평가 민감성", en: "Sensitivity to feedback" },
      { ko: "즉각적 반응", en: "Quick reactions" },
    ],
    summary: { ko: "목표와 기준을 분명히 정하고 사람과 자원을 조직해 결과를 만들어내는 체계의 운영자입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 짜증이나 급한 반응처럼 겉으로 먼저 드러나는 경향이 보고됩니다.", en: "As an operator who sets clear goals and standards and organizes people and resources to deliver results, this type tends to react sensitively to shifting situations or others' evaluations and check in on itself often — and when strain builds, irritation or a quick, sharp reaction tends to surface outwardly first." },
    strengths: { ko: "평가와 결과에 예민한 만큼 빈틈을 먼저 발견하고 계획을 다듬어가는 힘이 강점으로 보고됩니다. 다만 점검이 잦아질수록 조바심이 말투로 새어 나올 수 있어, 확인의 횟수와 타이밍을 조절하는 연습이 성장 과제로 남습니다.", en: "Being highly attuned to evaluation and outcomes tends to translate into a strength for spotting gaps early and refining plans before they become problems. Yet as self-checking increases, impatience can leak into tone more easily, making it worth practicing how often — and when — to double-check." },
    relationships: { ko: "가까운 사이에서 상대의 반응이나 표정 변화를 민감하게 읽는 편이며, 일이 뜻대로 풀리지 않으면 조바심이 말투에 먼저 묻어납니다. 스스로 예민해진 상태를 미리 알려두면 상대도 오해 없이 받아들이고, 갈등이 오래가지 않는 경우가 많습니다.", en: "In close relationships, there's a tendency to pick up on shifts in the other person's reactions or expressions, and when things don't go as planned, impatience tends to show up in tone before anything else. Flagging that heightened state in advance often helps the other person read it correctly, so conflicts don't linger." },
    work: { ko: "성과가 명확히 확인되고 피드백이 빠르게 오가는 환경에서 동기를 얻는 경향이 보고됩니다. 협업 방식을 고를 때는 점검과 확인이 지나친 압박으로 번지지 않도록, 평가 기준을 미리 합의해두는 절차가 있는지 살펴보는 것도 도움이 될 수 있습니다.", en: "There's a reported tendency to draw motivation from environments where results are clearly visible and feedback moves quickly. When exploring collaboration styles, it may help to look for processes that agree on evaluation criteria upfront, so checking and rechecking doesn't tip into excess pressure." },
    growth: [
      { ko: "같은 일을 몇 번째 점검하고 있는지 스스로 세어보면 어떤 숫자가 나올까요?", en: "If you counted how many times you've re-checked the same task, what number would come up?" },
      { ko: "조바심이 말투로 나오기 전에, 잠깐 숨을 고르는 신호를 정해볼 수 있을까요?", en: "Could you set a small cue to pause and breathe before impatience shows up in your tone?" },
      { ko: "이번 주에 평가받는 상황 하나를 배우는 자리로 바꿔서 볼 수 있을까요?", en: "Could you reframe one situation this week where you're being evaluated as a chance to learn instead?" },
    ],
  },
  TW: {
    nickname: { ko: "완벽을 다짐하며 속으로 앓는 운영자", en: "The Operator Who Worries Quietly While Aiming for Perfect" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Frequent self-checks" },
      { ko: "평가 민감성", en: "Sensitivity to feedback" },
      { ko: "속으로 삭이기", en: "Internalized strain" },
    ],
    summary: { ko: "목표와 기준을 분명히 정하고 사람과 자원을 조직해 결과를 만들어내는 체계의 운영자입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 편이고, 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 먼저 쌓이는 경향이 보고됩니다.", en: "As an operator who sets clear goals and standards and organizes people and resources to deliver results, this type tends to react sensitively to shifting situations or others' evaluations and check in on itself often — and when strain builds, it tends to settle inward first as worry or a quieter, heavier mood." },
    strengths: { ko: "결과에 대한 책임감과 스스로를 점검하는 꼼꼼함이 실수를 줄이는 강점으로 보고됩니다. 다만 걱정을 안으로 쌓아두다 보면 정작 지쳤다는 신호를 놓치기 쉬워, 점검을 멈추고 쉬어도 된다는 기준을 스스로에게 정해두는 연습이 성장 과제로 남습니다.", en: "A strong sense of responsibility for outcomes, paired with careful self-checking, is often reported as a strength that keeps mistakes to a minimum. Yet piling worry up internally makes it easy to miss the signal of one's own fatigue, making it worth setting a personal rule for when it's okay to stop checking and rest." },
    relationships: { ko: "가까운 사이에서 걱정이 많아져도 내색하지 않고 혼자 삭이는 편이라, 상대는 무언가 달라졌다는 것을 뒤늦게 알아차리곤 합니다. 걱정되는 지점을 조금 일찍, 작은 말로라도 나누는 연습을 하면 관계에서 오는 안정감이 더 커질 수 있습니다.", en: "In close relationships, there's a tendency to sit with growing worry quietly rather than show it, so the other person often notices something has shifted only after the fact. Practicing sharing a concern earlier — even in a small way — can meaningfully deepen the sense of security in the relationship." },
    work: { ko: "기준이 명확하고 실수를 미리 점검할 수 있는 절차가 갖춰진 환경에서 안정감을 느끼는 경향이 보고됩니다. 협업 방식을 고를 때는 잘하고 있다는 확인을 정기적으로 받을 수 있는 구조인지, 혼자 걱정을 떠안지 않도록 돕는 동료가 있는지 살펴보는 것도 도움이 될 수 있습니다.", en: "There's a reported tendency to feel secure in environments with clear standards and built-in processes for catching mistakes early. When exploring collaboration styles, it may help to look for structures that offer regular reassurance and colleagues who help keep worry from being carried alone." },
    growth: [
      { ko: "오늘 하루, 걱정하고 있다는 걸 소리 내어 말해본 적이 있었나요?", en: "Today, was there a moment you said out loud that you were worried?" },
      { ko: "점검을 멈추고 쉬어도 괜찮다고 스스로에게 허락하는 기준을 정해볼 수 있을까요?", en: "Could you set a personal rule for when it's okay to stop checking and just rest?" },
      { ko: "이번 주에 충분히 잘하고 있다는 확인을 누구에게 받아볼 수 있을까요?", en: "Who could you ask this week for a simple confirmation that you're doing enough?" },
    ],
  },
});
