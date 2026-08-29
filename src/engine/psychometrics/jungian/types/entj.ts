import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ENTJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ENTJ", {
  AV: {
    nickname: { ko: "확신으로 정면 돌파하는 지휘관", en: "The Commander Who Breaks Through With Conviction" },
    keywords: [
      { ko: "큰 그림", en: "Big-picture vision" },
      { ko: "정면 돌파", en: "Head-on drive" },
      { ko: "즉각적 표출", en: "Visible reactions" },
    ],
    summary: { ko: "복잡한 목표를 구조화하고 빠르게 결정을 내려 장기적인 변화를 추진하는 지휘형입니다. 웬만한 압박에는 흔들리지 않고 확신을 유지하는 편이지만, 신경이 곤두설 때는 말투나 표정처럼 짜증이 겉으로 먼저 드러나는 경향이 상대적으로 높게 보고됩니다.", en: "A commander-type who structures complex goals and makes fast calls to drive long-term change. Staying composed and confident under pressure comes naturally, though when tension does peak, irritation or a sharper tone tends to surface first and visibly." },
    strengths: { ko: "압박이 큰 상황에서도 태도가 크게 흔들리지 않아 팀이 방향을 잃지 않도록 중심을 잡아주는 힘이 강점입니다. 다만 그 확신 아래에서 짜증이나 날카로운 말투가 먼저 튀어나올 때가 있어, 감정이 표출되기 전에 잠깐 숨을 고르는 습관을 들이면 주변과의 마찰을 줄일 수 있습니다.", en: "Your composure under pressure gives teams a steady anchor even when stakes are high — a real asset for holding direction. The flip side is that frustration or a clipped tone can slip out before you've named what's bothering you; pausing to breathe before speaking can soften friction with others." },
    relationships: { ko: "가까운 사이에서도 생각을 에두르지 않고 분명하게 전달하는 편이라 상대는 입장을 파악하기 쉽습니다. 다만 의견 차이가 길어지면 답답함이 목소리 톤이나 표정으로 먼저 새어 나갈 수 있어, 상대가 그 반응을 개인적인 공격으로 오해하지 않도록 감정을 말로 풀어주는 연습이 관계에 도움이 됩니다.", en: "You tend to say what you think plainly, even with people close to you, which makes your position easy to read. When disagreements drag on, impatience can show up in your voice or face before you've put it into words — naming the feeling out loud can keep it from being read as a personal jab." },
    work: { ko: "결정 권한이 분명하고 속도감 있게 움직이는 환경에서 힘을 발휘하는 편이며, 압박이 심한 프로젝트에서도 흔들림 없이 방향을 제시하는 역할을 편안해합니다. 다만 팀원의 감정 신호를 놓치기 쉬우므로, 피드백을 주고받는 정기적인 대화 구조를 마련해두면 협업의 온도를 더 잘 챙길 수 있습니다.", en: "You tend to thrive where authority is clear and things move fast, staying steady even in high-pressure projects that need someone to set direction. Because emotional cues from teammates can slip past you in that momentum, building in regular check-ins helps you keep a read on the team's temperature." },
    growth: [
      { ko: "짜증이 올라오는 순간, 말하기 전에 3초만 멈춰보면 무엇이 달라질까요?", en: "The next time irritation rises, what might change if you paused three seconds before speaking?" },
      { ko: "이번 주 회의에서 확신이 들더라도 한 번은 다른 사람의 반박을 먼저 들어볼 수 있을까요?", en: "In this week's meeting, even when you're sure, could you listen to one counterpoint before responding?" },
      { ko: "감정이 겉으로 드러난 뒤, 상대에게 그 이유를 설명하는 짧은 대화를 시도해보면 어떨까요?", en: "After an emotion shows on your face, what would it look like to follow up with a short explanation of why?" },
    ],
  },
  AW: {
    nickname: { ko: "겉은 단단하고 속은 신중한 지휘관", en: "The Commander Who Stays Steady Outside, Reflective Within" },
    keywords: [
      { ko: "큰 그림", en: "Big-picture vision" },
      { ko: "흔들림 없는 확신", en: "Unshaken composure" },
      { ko: "조용한 재정비", en: "Quiet recalibration" },
    ],
    summary: { ko: "복잡한 목표를 구조화하고 빠르게 결정을 내려 장기적인 변화를 추진하는 지휘형입니다. 겉으로는 웬만한 상황에서 흔들리지 않고 확신을 유지하지만, 속으로는 걱정거리를 혼자 오래 곱씹거나 기분이 조용히 가라앉는 경향이 상대적으로 자주 보고됩니다.", en: "A commander-type who structures complex goals and drives long-term change through fast decisions. Outwardly, composure holds steady under almost any pressure, but inwardly, worry tends to get turned over alone and mood can quietly dip more often than it shows." },
    strengths: { ko: "위기 상황에서도 표정과 태도를 흐트러뜨리지 않아 주변이 안정감을 느끼게 하는 힘이 강점입니다. 다만 그 단단함 뒤에서 걱정을 혼자 끌어안고 있을 때가 많아, 마음에 걸리는 부분을 믿을 만한 사람에게 일찍 꺼내놓는 습관을 들이면 부담을 미리 덜어낼 수 있습니다.", en: "Keeping your expression and manner steady through a crisis gives everyone around you a sense of stability — that's a genuine strength. But underneath that steadiness, you may carry worries alone longer than helpful; naming a concern to someone you trust earlier can lighten the load before it builds up." },
    relationships: { ko: "가까운 사이에서도 흔들리는 모습을 잘 드러내지 않아 상대는 당신이 늘 괜찮다고 여기기 쉽습니다. 실제로는 걱정이나 서운함을 속으로 오래 담아두는 편이라, 시간이 지난 뒤 그 감정이 거리감으로 나타나기 전에 먼저 마음 상태를 짧게라도 알려주는 것이 관계를 더 편안하게 만듭니다.", en: "Because you rarely let people close to you see you rattled, they may assume you're always fine. In reality, worry or hurt can sit with you quietly for a while, and if it surfaces later as distance instead of words, it can confuse the people who care about you — a brief check-in about how you're actually doing goes a long way." },
    work: { ko: "권한과 방향이 분명한 환경에서 흔들림 없이 팀을 이끄는 역할을 편안해하는 편입니다. 다만 성과나 평판에 대한 걱정을 내색하지 않고 혼자 처리하려는 경향이 있어, 부담을 나눌 수 있는 소규모 신뢰 관계나 정기적인 1:1 대화가 마련된 환경이 도움이 됩니다.", en: "You tend to be comfortable leading steadily in environments with clear authority and direction. Since concerns about outcomes or reputation are often processed alone rather than voiced, having a small circle of trust or regular one-on-ones built into the work environment can help you carry that weight." },
    growth: [
      { ko: "이번 주에 마음에 걸리는 걱정 하나를 누군가에게 말로 꺼내보면 무엇이 달라질까요?", en: "What might shift if you named one worry out loud to someone this week instead of carrying it alone?" },
      { ko: "겉으로는 괜찮아 보이고 싶을 때, 실제로는 어떤 감정이 숨어 있는지 스스로에게 물어본 적이 있나요?", en: "When you want to look fine on the outside, have you asked yourself what's actually going on underneath?" },
      { ko: "혼자 결론을 내리기 전에, 걱정되는 부분을 먼저 나눠볼 수 있는 사람은 누구일까요?", en: "Before settling a conclusion by yourself, who is someone you could share the worry with first?" },
    ],
  },
  TV: {
    nickname: { ko: "촉각을 세우고 앞서 나가는 지휘관", en: "The Commander Who Stays Alert While Pushing Forward" },
    keywords: [
      { ko: "예민한 재점검", en: "Sharp self-checking" },
      { ko: "빠른 추진", en: "Fast momentum" },
      { ko: "겉으로 드러나는 동요", en: "Visible unease" },
    ],
    summary: { ko: "복잡한 목표를 구조화하고 빠르게 결정을 내려 장기적인 변화를 추진하는 지휘형입니다. 다만 상황 변화나 타인의 평가에 예민하게 반응하며 스스로를 자주 점검하는 편이고, 그 긴장이 쌓이면 짜증이나 급격한 기분 변화처럼 겉으로 먼저 드러나는 경향이 상대적으로 높게 보고됩니다.", en: "A commander-type who structures complex goals and drives long-term change through fast decisions. You tend to react sensitively to shifting situations or others' evaluations, checking in on yourself often, and when that tension builds, it tends to show first as irritation or a sudden mood shift." },
    strengths: { ko: "빠르게 상황을 읽고 스스로를 계속 점검하며 방향을 수정할 수 있는 예민함이 강점으로 작용합니다. 다만 그 긴장이 쌓일수록 짜증이나 날선 말투로 먼저 표출되기 쉬워서, 점검이 과열되는 순간을 스스로 알아채고 잠깐 속도를 늦추는 장치를 마련해두면 도움이 됩니다.", en: "Reading situations quickly and continually checking your own course is a real strength — it keeps you responsive. But as that tension accumulates, it tends to surface as irritation or a sharper tone before you've named it; noticing the moment your self-checking overheats and building in a pause can help." },
    relationships: { ko: "가까운 사이에서도 상대의 반응이나 평가를 신경 쓰며 스스로를 다잡으려는 편이라, 정작 그 긴장이 짜증이나 예민한 말투로 먼저 튀어나올 때가 있습니다. 상대는 이유를 모른 채 당황할 수 있으므로, 지금 스스로를 점검하고 있다는 것을 미리 짧게 알려주는 것이 오해를 줄여줍니다.", en: "Even with people close to you, you tend to stay alert to their reactions and keep tightening your own grip — but that tension can come out as irritation or a clipped tone before you've explained why. The other person may be caught off guard without context, so a quick heads-up that you're in self-check mode can head off misunderstanding." },
    work: { ko: "빠른 의사결정과 방향 제시가 필요한 환경에서 능력을 발휘하지만, 성과나 평가에 대한 촉각이 예민해 압박이 커지면 반응이 날카로워지기 쉽습니다. 진행 상황을 자주 확인할 수 있는 명확한 피드백 구조와, 감정이 격해지기 전에 잠시 멈출 수 있는 여지가 있는 환경이 도움이 됩니다.", en: "You tend to do well where fast decisions and clear direction are needed, but heightened sensitivity to performance and evaluation can sharpen your reactions under pressure. A clear feedback structure with frequent check-ins, plus room to pause before emotion peaks, tends to help." },
    growth: [
      { ko: "타인의 평가가 신경 쓰일 때, 그 생각이 사실인지 먼저 확인해볼 수 있을까요?", en: "When someone's opinion of you starts nagging at you, could you check whether the worry is actually true first?" },
      { ko: "짜증이 말로 튀어나오기 직전, 몸에서 어떤 신호를 먼저 느끼는지 알아챌 수 있을까요?", en: "Right before irritation turns into words, what's the first signal your body gives you?" },
      { ko: "이번 주에 스스로를 점검하는 횟수를 하루 한 번으로 줄여보면 어떤 변화가 있을까요?", en: "What might change if you cut your self-checking down to once a day this week?" },
    ],
  },
  TW: {
    nickname: { ko: "조용히 점검하며 나아가는 지휘관", en: "The Commander Who Advances While Quietly Checking Within" },
    keywords: [
      { ko: "예민한 재점검", en: "Sharp self-checking" },
      { ko: "신중한 재설계", en: "Careful redesign" },
      { ko: "안으로 향하는 침잠", en: "Inward-turning unease" },
    ],
    summary: { ko: "복잡한 목표를 구조화하고 빠르게 결정을 내려 장기적인 변화를 추진하는 지휘형입니다. 상황 변화나 타인의 평가에 예민하게 반응하며 스스로를 자주 점검하는 편이고, 그 긴장이 쌓이면 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "A commander-type who structures complex goals and drives long-term change through fast decisions. You tend to react sensitively to shifting situations and others' evaluations, checking in on yourself often, and when that tension builds, it tends to show first as inward signals — worry or a quietly lower mood." },
    strengths: { ko: "계속해서 스스로를 점검하고 상황 변화를 예민하게 감지하는 힘 덕분에 계획을 정교하게 다듬어 나갈 수 있는 점이 강점입니다. 다만 그 과정에서 걱정을 겉으로 드러내지 않고 혼자 끌어안는 경우가 많아, 점검이 끝없이 이어지기 전에 생각을 멈추고 정리하는 시간을 따로 두는 것이 도움이 됩니다.", en: "Constantly checking your own course and picking up on shifting situations lets you refine plans with real precision — a genuine strength. The flip side is that worry often gets carried alone rather than voiced, so setting aside deliberate time to stop checking and just settle your thoughts can help before it spirals." },
    relationships: { ko: "가까운 사이에서도 스스로에 대한 의심이나 걱정을 잘 드러내지 않고 조용히 삭이는 편이라, 상대는 당신이 겪는 부담을 뒤늦게 알아채기 쉽습니다. 걱정이 깊어지기 전에 지금 어떤 점을 점검하고 있는지 짧게라도 나누면 상대가 곁에서 힘을 보태줄 여지가 생깁니다.", en: "Even with people close to you, self-doubt or worry tends to get quietly absorbed rather than shown, so others may not notice what you're carrying until later. Sharing even a short version of what you're currently reconsidering, before the worry deepens, gives the people around you a chance to actually help." },
    work: { ko: "방향을 세우고 결정을 내리는 역할에서 강점을 보이지만, 평가나 성과에 대한 예민함이 커지면 스스로에 대한 의심을 조용히 반추하며 속도가 느려질 수 있습니다. 진행 상황을 객관적으로 확인해줄 수 있는 신뢰할 만한 동료나 정기적인 피드백 창구가 있는 환경이 부담을 덜어줍니다.", en: "You tend to show strength in setting direction and making calls, but heightened sensitivity to evaluation or outcomes can slow you down as self-doubt gets quietly turned over. Having a trusted colleague who can offer an objective read on progress, or a regular feedback channel, tends to ease that load." },
    growth: [
      { ko: "혼자 걱정을 곱씹는 시간이 길어질 때, 그 생각을 종이에 적어 눈으로 확인해보면 어떨까요?", en: "When you catch yourself turning a worry over for a long time, what might change if you wrote it down and looked at it on paper?" },
      { ko: "이번 주에 스스로에 대한 의심이 들 때, 그것을 믿을 만한 한 사람에게만이라도 말해볼 수 있을까요?", en: "When self-doubt comes up this week, could you say it out loud to just one person you trust?" },
      { ko: "점검을 멈추고 하루를 마무리하는 나만의 신호를 정해본다면 무엇이 좋을까요?", en: "If you set your own signal for when to stop checking and close out the day, what would that look like?" },
    ],
  },
});
