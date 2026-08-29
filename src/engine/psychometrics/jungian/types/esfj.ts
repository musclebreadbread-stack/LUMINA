import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ESFJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ESFJ", {
  AV: {
    nickname: { ko: "당당하고 솔직한 협력자", en: "The Steady, Straight-Talking Caretaker" },
    keywords: [
      { ko: "재빠른 챙김", en: "Quick to Notice" },
      { ko: "표정에 드러나는 마음", en: "Feelings on Display" },
      { ko: "흔들림 없는 주도", en: "Steady Leadership" },
    ],
    summary: { ko: "필요와 분위기를 빠르게 읽어내고 함께 지킬 질서를 만들어가는 협력형으로, 스트레스가 심해질수록 오히려 확신을 갖고 앞장서서 상황을 정리하려는 모습이 두드러집니다. 다만 마음이 정말 흔들리는 순간에는 짜증이나 표정 변화처럼 겉으로 티가 나는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This collaborator type is quick to read what a group needs and turns that into shared order, growing more confident and ready to take charge the more pressure builds. The one place that steadiness can slip is when strain finally breaks through: irritability or a visible shift in mood tends to show up first." },
    strengths: { ko: "필요를 먼저 알아차리고 확신 있게 상황을 정리하는 힘이 있어, 위기 상황에서도 사람들이 기댈 수 있는 축이 되어주는 경우가 많습니다. 다만 그 확신이 앞서다 보면 다른 사람의 속도나 이견을 충분히 기다리지 못하고 앞서 나가는 모습이 성장 과제로 남을 수 있습니다.", en: "A readiness to notice what's needed and organize things with confidence often makes this type someone others can lean on, especially in stressful moments. The flip side worth growing into is a tendency to move ahead before fully waiting for others' pace or differing opinions to catch up." },
    relationships: { ko: "가까운 관계에서는 상대의 필요를 먼저 살피고 흔들림 없이 곁을 지키는 모습을 보이는 경우가 많습니다. 갈등이 생기면 속으로 삭이기보다 짜증이나 언성처럼 겉으로 드러나는 신호가 먼저 나오는 편이라, 감정이 격해지기 전에 잠깐 멈추는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, this type often notices what the other person needs and stays present without much wavering. When conflict arises, feelings tend to surface outwardly, through a sharper tone or visible irritation, rather than being kept inside, so pausing before things escalate can help preserve the relationship." },
    work: { ko: "여러 사람의 필요를 조율하며 팀 전체가 안정적으로 굴러가게 만드는 역할에서 자신감을 발휘하는 경우가 많습니다. 다만 계획이나 원칙이 갑자기 흔들릴 때 스스로도 예민해질 수 있으니, 변화가 예상되는 상황에서는 미리 여유를 만들어두는 협업 방식이 잘 맞을 수 있습니다.", en: "This type often feels most confident in roles that involve coordinating what different people need so the whole team runs smoothly. Because sudden shifts to plans or agreed norms can still stir some friction, building in advance notice or buffer time before changes helps this working style hold steady." },
    growth: [
      { ko: "확신이 들지 않을 때, 그 불확실함을 그대로 말해봐도 괜찮은 상황이 있을까요?", en: "Is there a moment where it would be okay to say out loud that you're not actually sure?" },
      { ko: "짜증이 올라올 때, 그 감정을 바로 표현하기 전에 잠깐 멈춰보면 무엇이 달라질까요?", en: "What might change if you paused for a beat before letting irritation come out right away?" },
      { ko: "다른 사람의 속도에 맞춰 하루를 미뤄봐도 괜찮은 순간이 있을까요?", en: "Is there a moment where it's okay to slow down and match someone else's pace instead of your own?" },
    ],
  },
  AW: {
    nickname: { ko: "당당하고 속 깊은 협력자", en: "The Steady, Quietly Deep Caretaker" },
    keywords: [
      { ko: "차분한 챙김", en: "Calm Caretaking" },
      { ko: "속으로 삭이는 걱정", en: "Worry Kept Inside" },
      { ko: "한결같은 태도", en: "Consistent Demeanor" },
    ],
    summary: { ko: "필요와 분위기를 빠르게 읽어내고 함께 지킬 질서를 만들어가는 협력형으로, 겉으로 보이는 태도는 스트레스가 심해져도 크게 달라지지 않고 한결같이 침착한 편입니다. 다만 마음 안쪽에서는 걱정이나 가라앉은 기분처럼 잘 드러나지 않는 신호가 조용히 쌓여가는 경향이 상대적으로 높게 보고됩니다.", en: "This collaborator type is quick to read what a group needs and turns that into shared order, keeping an outward manner that stays remarkably even no matter how much pressure builds. What tends to shift instead is on the inside, where quiet worry or a dip in mood accumulates well before it ever reaches the surface." },
    strengths: { ko: "겉으로 흔들리지 않는 태도 덕분에 주변 사람들에게 안정감을 주는 경우가 많고, 위기 상황에서도 침착하게 필요한 것을 챙기는 힘이 있습니다. 다만 걱정을 안으로만 쌓아두다 보면 정작 자신이 도움이 필요할 때 신호를 늦게 보내는 모습이 성장 과제로 남을 수 있습니다.", en: "A composed exterior often gives the people nearby a sense of stability, and this type tends to stay level-headed about what needs doing even in a crisis. The area worth growing into is that worry kept quietly inside can mean this type signals a need for help later than it's actually needed." },
    relationships: { ko: "가까운 관계에서는 겉으로 잘 흔들리지 않으면서 상대의 필요를 조용히 챙기는 모습을 보이는 경우가 많습니다. 갈등이 생기면 바로 표현하기보다 혼자 걱정을 안고 삭이는 편이라, 마음이 무거워지기 전에 먼저 말을 꺼내보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, this type often stays outwardly steady while quietly taking care of what the other person needs. When conflict comes up, worry tends to get carried alone rather than voiced right away, so practicing bringing things up before they weigh too heavily can strengthen the relationship." },
    work: { ko: "여러 사람의 필요를 조율하면서도 흔들리지 않는 모습을 보여야 하는 역할에서 신뢰를 얻는 경우가 많습니다. 다만 걱정을 혼자 끌어안고 일하는 경향이 있으니, 부담을 미리 나눠 말할 수 있는 동료나 구조가 있는 협업 환경이 잘 맞을 수 있습니다.", en: "This type often earns trust in roles that call for coordinating others' needs while staying visibly composed under pressure. Because worry tends to be carried alone, a working environment with colleagues or a structure that makes it easy to voice concerns early tends to suit this style well." },
    growth: [
      { ko: "지금 마음속에 있는 걱정을 누군가에게 미리 말해봐도 괜찮은 상대가 있을까요?", en: "Is there someone you could tell about a worry you're carrying before it gets heavier?" },
      { ko: "겉으로 괜찮아 보이려 애쓰지 않아도 되는 순간은 언제일까요?", en: "When might it be okay not to work so hard at looking fine on the outside?" },
      { ko: "도움이 필요하다는 신호를, 힘들어지기 전에 먼저 보내볼 수 있을까요?", en: "Could you send a signal that you need help before things get difficult, rather than after?" },
    ],
  },
  TV: {
    nickname: { ko: "마음 쓰며 티 나는 협력자", en: "The Watchful, Quick-to-Show Caretaker" },
    keywords: [
      { ko: "예민한 살핌", en: "Sensitive Awareness" },
      { ko: "즉각 반응", en: "Quick Reactions" },
      { ko: "자기 점검", en: "Self-Checking" },
    ],
    summary: { ko: "다른 사람의 반응과 상황 변화에 예민하게 안테나를 세우며 스스로를 자주 점검하는 협력형으로, 그 덕분에 미묘한 필요까지 놓치지 않고 챙기는 편입니다. 다만 그렇게 신경 쓴 만큼 감정이 겉으로 빨리 드러나, 짜증이나 표정 변화 같은 신호가 비교적 이른 시점에 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This collaborator type keeps close watch on how others react and how situations shift, checking in on itself often, and that sensitivity means it rarely misses a subtle need. The tradeoff is that feelings tend to reach the surface quickly, showing up as a sharper tone or a visible change of mood sooner rather than later." },
    strengths: { ko: "다른 사람의 반응을 세심하게 읽어내는 예민함 덕분에 미묘한 필요까지 놓치지 않고 챙기는 힘이 있습니다. 다만 평가에 자주 신경을 쓰다 보면 감정이 겉으로 빨리 드러나면서 스스로도, 주변도 그 기복에 지치기 쉬운 점이 성장 과제로 남을 수 있습니다.", en: "A sensitivity to how others are reacting gives this type real skill at catching subtle needs that others might miss. The area worth growing into is that frequent attention to how one is being judged, combined with feelings that surface quickly, can tire out both the person and the people around them." },
    relationships: { ko: "가까운 관계에서는 상대의 반응을 민감하게 살피며 관계가 괜찮은지 자주 확인하려는 모습을 보이는 경우가 많습니다. 갈등이 생기면 감정이 겉으로 빠르게 드러나는 편이라, 반응하기 전에 잠깐 숨을 고르는 연습이 관계를 더 안정적으로 만들어줄 수 있습니다.", en: "In close relationships, this type often watches the other person's reactions closely and checks in often on whether things are okay between them. Because emotions tend to surface quickly during conflict, taking a breath before reacting can help keep the relationship on steadier ground." },
    work: { ko: "다른 사람의 필요와 평가에 민감하게 반응하는 만큼 세심한 조율이 필요한 협업에서 강점을 보이는 경우가 많습니다. 다만 피드백에 따라 감정이 쉽게 흔들릴 수 있으니, 평가를 구체적이고 건설적으로 전달해주는 환경이 이 유형에게 더 편안하게 작용할 수 있습니다.", en: "Because this type reacts sensitively to others' needs and feedback, it often shows real strength in collaborative work that calls for careful attention to detail. Since feedback can shift emotions fairly easily, an environment that delivers evaluation in specific, constructive terms tends to feel more comfortable to work within." },
    growth: [
      { ko: "평가를 받기 전에, 스스로 이미 충분히 하고 있다고 말해줄 수 있는 순간이 있을까요?", en: "Before getting feedback, could you tell yourself you're already doing enough, just this once?" },
      { ko: "짜증이 올라올 때 바로 표현하는 대신, 잠깐 숨을 고르면 무엇이 달라질까요?", en: "What might shift if you took a breath before letting irritation show right away?" },
      { ko: "다른 사람의 반응을 확인하지 않고 하루를 마무리해도 괜찮은 날이 있을까요?", en: "Is there a day you could end without checking how others reacted to you?" },
    ],
  },
  TW: {
    nickname: { ko: "마음 쓰며 속으로 삭이는 협력자", en: "The Watchful, Quietly Carrying Caretaker" },
    keywords: [
      { ko: "세심한 살핌", en: "Careful Attentiveness" },
      { ko: "조용히 쌓이는 걱정", en: "Quietly Building Worry" },
      { ko: "혼자 하는 자기 점검", en: "Private Self-Checking" },
    ],
    summary: { ko: "상황이 조금만 바뀌거나 다른 사람의 평가가 스치기만 해도 민감하게 반응하며 스스로를 자주 되짚어보는 협력형으로, 그 덕분에 관계 속 작은 신호도 잘 포착하는 편입니다. 다만 그렇게 신경 쓴 마음은 겉으로 잘 드러나지 않아, 걱정이나 가라앉은 기분이 표현되지 못한 채 조용히 쌓여가는 경향이 상대적으로 높게 보고됩니다.", en: "This collaborator type reacts sensitively to the smallest shift in a situation or a hint of someone else's judgment, often circling back to check on itself, and that sensitivity means it rarely misses a small signal in a relationship. The tradeoff is that all that noticing tends to stay unspoken, with worry or a dip in mood quietly building up rather than being voiced." },
    strengths: { ko: "세심하게 상황을 살피고 다른 사람의 감정 변화까지 놓치지 않는 힘이 있어, 관계에서 미묘한 신호를 가장 먼저 알아채는 경우가 많습니다. 다만 걱정을 혼자 안으로 쌓아두는 편이라, 정작 힘든 순간에 도움을 요청하는 신호를 늦게 보내는 모습이 성장 과제로 남을 수 있습니다.", en: "A careful eye for shifting situations and other people's emotional changes often means this type is the first to notice a subtle sign in a relationship. The area worth growing into is a tendency to let worry build up quietly alone, which can mean a request for help arrives later than it's actually needed." },
    relationships: { ko: "가까운 관계에서는 상대의 기분 변화를 세심하게 살피면서도, 자신의 걱정은 잘 드러내지 않고 혼자 안고 가는 모습을 보이는 경우가 많습니다. 갈등이 생기면 표현을 미루다가 마음이 무거워지는 편이라, 걱정이 쌓이기 전에 조금씩 나눠 말해보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, this type often watches for shifts in the other person's mood carefully, while keeping its own worries mostly to itself. Because expressing conflict tends to get delayed until it feels heavy, practicing sharing small concerns along the way, rather than all at once, can support the relationship." },
    work: { ko: "세심하게 상황과 사람들의 반응을 살피는 만큼, 꼼꼼한 조율이 필요한 협업에서 신뢰를 얻는 경우가 많습니다. 다만 걱정을 혼자 쌓아두다 지치기 쉬우니, 부담을 미리 나눠 말할 수 있는 동료나 정기적으로 상태를 확인해주는 협업 구조가 잘 맞을 수 있습니다.", en: "Because this type watches situations and people's reactions carefully, it often earns trust in collaborative work that calls for meticulous coordination. Since worry can quietly build up and lead to fatigue, a working structure with colleagues to share the load with, or regular check-ins, tends to suit this style well." },
    growth: [
      { ko: "지금 혼자 안고 있는 걱정을, 힘들어지기 전에 누군가에게 나눠볼 수 있을까요?", en: "Could you share a worry you're carrying alone with someone before it becomes too heavy?" },
      { ko: "평가받기 전에 이미 충분히 하고 있다고 스스로에게 말해줄 수 있을까요?", en: "Could you tell yourself you're already doing enough, before waiting for someone else's evaluation?" },
      { ko: "가라앉은 기분을 알아챘을 때, 바로 해결하려 하지 않고 잠시 머물러봐도 괜찮을까요?", en: "When you notice your mood dipping, is it okay to just sit with it for a while instead of rushing to fix it?" },
    ],
  },
});
