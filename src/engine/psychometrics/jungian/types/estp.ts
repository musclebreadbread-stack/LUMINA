import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ESTP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ESTP", {
  AV: {
    nickname: { ko: "흔들림 없는 즉흥 승부사", en: "The Unshaken On-the-Spot Dealmaker" },
    keywords: [
      { ko: "담대한 결단", en: "Bold Decisions" },
      { ko: "즉각적 반응", en: "Instant Reactions" },
      { ko: "승부 근성", en: "Competitive Drive" },
    ],
    summary: { ko: "정보가 다 모이기를 기다리기보다 일단 상황 속으로 들어가 부딪히며 답을 찾아내는 즉흥형 실행력이 두드러집니다. 압박이 커질수록 표정과 태도가 오히려 더 단단해져 주변에서는 여유 있어 보인다는 평가를 자주 받는 편입니다. 다만 그 여유가 정말 바닥날 때는 말투가 날카로워지거나 얼굴에 짜증이 스치는 방식으로 신호가 먼저 겉으로 드러나는 경향이 보고됩니다.", en: "Rather than waiting for all the facts, this identity tends to step straight into a situation and work out the answer by testing it live. Pressure tends to sharpen its composure rather than shake it, and people nearby often describe it as someone who looks unbothered. But when that composure truly runs out, a sharper tone or a flash of irritation across the face tends to be the first outward sign." },
    strengths: { ko: "압박이 몰리는 순간에도 표정과 판단이 크게 흔들리지 않다 보니, 함께 있는 사람들까지 덩달아 불안해지지 않는 효과가 있습니다. 다만 그 안정감의 뒷면에는, 짜증이 순간적으로 튀어나올 때 스스로 그 낌새를 먼저 알아차리기보다 이미 말이나 표정으로 새어 나간 뒤에야 깨닫는 경우가 더 많다는 점도 함께 보고됩니다.", en: "Staying visibly steady under pressure has a real ripple effect — the people around this identity often stay calmer simply because it does. The flip side is that irritation, once it flickers up, tends to slip into a word or an expression before it gets noticed from the inside, more often than being caught in advance." },
    relationships: { ko: "갈등이 불거져도 언성을 높이기보다 상황을 정리하는 쪽을 먼저 택하는 편입니다. 다만 스트레스가 쌓이는 상황이 길어지면, 대화 중간에 말투가 갑자기 날카로워지는 순간이 찾아오면서 상대가 먼저 그 변화를 알아채는 경우가 보고됩니다. 그 순간이 무엇을 뜻하는지 가까운 사람에게 미리 짧게 알려두면 오해를 줄이는 데 도움이 될 수 있습니다.", en: "When conflict flares up, the instinct is usually to sort things out rather than raise its voice. But when stress has been building for a while, a sudden edge in tone mid-conversation tends to be the first thing the other person notices — often before the identity itself has registered the shift. Giving a close friend or partner a heads-up about what that edge means, ahead of time, can help prevent a misread." },
    work: { ko: "결과가 눈에 바로 보이는 실행 중심 업무, 그리고 압박 속에서도 동요 없는 판단을 필요로 하는 자리에서 특히 자연스러운 리듬을 찾는 편입니다. 한 가지 살펴볼 만한 지점은, 짜증이 순간적으로 겉으로 드러났을 때 그 장면을 팀이 어떻게 받아들이길 원하는지 스스로 미리 정리해두는 것입니다.", en: "Roles built around fast, visible outcomes — and situations where others count on a level head under pressure — tend to feel like a natural fit. One thing worth thinking through in advance is how you'd want a team to read those brief moments when irritation shows on the surface." },
    growth: [
      { ko: "오늘 짜증이 살짝 올라왔던 순간, 그 신호를 말로 옮기기 전에 한 박자 멈춰볼 수 있을까요?", en: "The next time irritation flickers up, could you pause for one breath before it turns into words?" },
      { ko: "확신이 강하게 들 때일수록, 반대 의견을 한 번 더 들어보면 어떤 게 달라질까요?", en: "When you feel most certain, what might change if you deliberately heard out one dissenting view?" },
      { ko: "스트레스가 쌓였다는 걸 겉으로 드러나기 전에 스스로 알아차릴 신호가 있을까요?", en: "Is there an earlier signal you could notice before stress builds up enough to show on the surface?" },
    ],
  },
  AW: {
    nickname: { ko: "차분히 다잡는 행동파", en: "The Composed Doer Who Resets Within" },
    keywords: [
      { ko: "침착한 대응", en: "Composed Response" },
      { ko: "내적 재정비", en: "Inner Reset" },
      { ko: "신중한 뒷심", en: "Quiet Follow-through" },
    ],
    summary: { ko: "일단 몸으로 부딪혀 보며 상황을 시험하는 실행력을 갖추고 있으면서도, 웬만한 소란 속에서는 겉으로 크게 티가 나지 않는 침착함이 함께 자리합니다. 정말 마음이 무거워지는 순간에는 걱정이 조용히 쌓이거나 기분이 가라앉는 방식으로, 눈에 띄지 않게 안으로 먼저 신호가 나타나는 경향이 보고됩니다.", en: "This identity is built for testing situations by acting directly, yet stays outwardly calm through most of the usual noise. When something genuinely weighs on it, though, the first sign tends to be quiet — a mood that dips or worry that starts circling privately, well before anything shows on the outside." },
    strengths: { ko: "겉으로 워낙 잔잔하다 보니, 주변에서는 무슨 일이 있었는지조차 눈치채지 못하고 지나가는 경우가 많습니다. 문제는 그 잔잔함이 실제로는 걱정을 안으로 계속 쌓아두는 방식일 수 있다는 점입니다. 무거워지는 마음을 스스로 더 일찍 알아차리는 연습이 이 정체성에게는 특히 의미가 있습니다.", en: "The calm on the surface is genuine enough that people around this identity often have no idea anything was off. The catch is that this same calm can be a way of quietly stacking up worry rather than releasing it. Catching a sinking mood earlier, before it has time to build, is a growth area worth real attention here." },
    relationships: { ko: "갈등이 생겨도 표정과 말투에는 크게 표가 안 나서, 상대는 별일 아니라고 넘겨짚기 쉽습니다. 그러나 실제로는 그 대화가 끝난 뒤에도 걱정이 머릿속에서 한참을 맴도는 경우가 보고됩니다. 지금 마음이 걸리는 게 있다는 사실만이라도 짧게 알려주면, 상대가 상황을 더 정확히 읽는 데 도움이 됩니다.", en: "Conflict rarely registers on the face or in the tone, so the other person can easily assume everything is fine. In reality, though, worry can keep circling long after the conversation has ended. Even a brief, simple heads-up — that something is sitting with you — helps the other person read the moment more accurately." },
    work: { ko: "즉각적인 판단이 필요한 실행형 업무에서 강점을 발휘하면서도, 혼자 조용히 정리할 시간이 확보되는 리듬에서 훨씬 편하게 움직이는 편입니다. 걱정이 쌓이고 있다는 걸 동료에게 언제, 어떤 방식으로 알릴지 미리 생각해두는 것도 함께 살펴볼 만한 지점입니다.", en: "This identity tends to thrive in hands-on, fast-decision work while also needing real pockets of quiet time to process alone. It's worth working out, ahead of time, when and how to let a colleague know that something is starting to weigh on you." },
    growth: [
      { ko: "오늘 마음이 살짝 무거워졌던 순간, 그걸 혼자 삭이지 않고 한 사람에게만 짧게 말해볼 수 있을까요?", en: "The next time your mood quietly dips, could you name it out loud to just one person instead of sitting with it alone?" },
      { ko: "걱정이 커지기 전 단계에서 나타나는 몸이나 기분의 신호는 무엇일까요?", en: "What early physical or mood signals tend to show up before worry actually builds?" },
      { ko: "겉으로 괜찮아 보였지만 실은 그렇지 않았던 순간을 떠올리면, 무엇이 달랐을까요?", en: "Thinking back to a moment you looked fine but weren't, what would you have needed to say?" },
    ],
  },
  TV: {
    nickname: { ko: "예민하게 불붙는 승부사", en: "The Spark-Quick Challenger" },
    keywords: [
      { ko: "예민한 촉", en: "Sharp Instinct" },
      { ko: "감정 표출", en: "Visible Emotion" },
      { ko: "순간 몰입", en: "Momentary Focus" },
    ],
    summary: { ko: "몸으로 먼저 부딪혀 상황을 시험하는 실행력에, 주변 반응이나 흐름의 변화를 놓치지 않고 잡아내는 예민한 촉이 함께 작동합니다. 그만큼 스스로를 자주 점검하게 되는데, 그 점검이 쌓여 정말 감정이 흔들릴 때는 짜증이나 날 선 말투처럼 겉으로 바로 드러나는 신호가 먼저 나타나는 경향이 보고됩니다.", en: "Alongside a willingness to test things by diving straight in, this identity keeps a sharp read on shifting reactions and changes in the room — which means checking in on itself often. When that self-checking builds and emotions do shift, irritation or a sharper tone tends to be the first thing that shows, right out in the open." },
    strengths: { ko: "분위기가 바뀌는 순간을 남들보다 먼저 알아채는 예민함은 실제로 꽤 쓸모 있는 감각입니다. 다만 그 예민함이 짜증이나 날 선 반응으로 곧장 튀어나오는 경우가 적지 않아서, 감지한 것과 반응하는 것 사이에 짧은 틈을 두는 연습이 도움이 될 수 있습니다.", en: "Noticing a shift in the room before anyone else does is a genuinely useful instinct. The catch is that this same sensitivity tends to jump straight into irritation or a sharp reply fairly often, so building a short gap between noticing and reacting can make a real difference." },
    relationships: { ko: "상대의 표정 하나, 말투 하나에도 신경이 곤두서는 편이라 관계에서 눈치가 빠르다는 말을 듣습니다. 그런데 스트레스가 쌓이면 그 예민함이 짜증 섞인 말투로 먼저 티가 나는 경향이 보고됩니다. 그 반응이 상대에 대한 실망이 아니라 스스로의 긴장 때문이라는 걸 짧게라도 짚어주면 관계에 도움이 됩니다.", en: "Being tuned into even a small change in someone's expression or tone makes this identity quick to read a room. But under stress, that same sensitivity tends to show up first as a sharper edge in speech. A quick note that the edge is about your own tension, not disappointment in the other person, goes a long way." },
    work: { ko: "변화가 잦고 즉각적인 대응이 필요한 환경에서는 예민한 감각이 오히려 강점으로 작동합니다. 다만 평가나 피드백이 계속 이어지는 자리는 부담을 키우기 쉬운 만큼, 피드백을 받은 직후 바로 반응하기보다 소화할 짧은 시간을 확보하는 방식도 함께 고려해볼 만합니다.", en: "Fast-changing, feedback-heavy settings can turn that sharp sensitivity into a real strength. Still, a steady stream of evaluation can pile on pressure fast, so it's worth building in a short buffer to process feedback before reacting to it." },
    growth: [
      { ko: "타인의 반응에 신경이 곤두선 순간, 그게 사실인지 내 해석인지 구분해볼 수 있을까요?", en: "When you feel your nerves spike at someone's reaction, can you separate what actually happened from your read on it?" },
      { ko: "짜증이 말투에 묻어나기 직전, 잠깐 숨을 고를 여유를 만들 수 있을까요?", en: "Right before irritation slips into your tone, could you carve out a moment to breathe first?" },
      { ko: "이번 주에 피드백을 받고 바로 반응하지 않고 하루 묵혀볼 수 있는 상황이 있을까요?", en: "Is there feedback this week you could sit with for a day before responding to it?" },
    ],
  },
  TW: {
    nickname: { ko: "조용히 곱씹는 행동파", en: "The Quietly Reflective Doer" },
    keywords: [
      { ko: "세심한 관찰", en: "Careful Observation" },
      { ko: "내면 정리", en: "Inner Processing" },
      { ko: "신중한 재도전", en: "Careful Retry" },
    ],
    summary: { ko: "일단 부딪혀보며 상황을 시험하는 실행력을 갖추면서도, 주변 반응과 흐름의 변화를 놓치지 않고 살피는 세심함이 함께 자리합니다. 그만큼 스스로를 자주 점검하는 편인데, 정말 감정이 흔들릴 때는 걱정이나 가라앉은 기분처럼 눈에 띄지 않게 안으로 먼저 신호가 나타나는 경향이 보고됩니다.", en: "This identity tests situations by acting directly, while also keeping a careful eye on shifting reactions and changes around it — which means checking in with itself often. When emotions genuinely shift, though, the first sign tends to be quiet: worry or a lower mood settling in privately, out of view." },
    strengths: { ko: "속도를 유지하면서도 남들이 놓치기 쉬운 신호까지 세심하게 포착하는 감각은 이 정체성의 확실한 강점입니다. 다만 그 세심함이 스스로에 대한 점검으로 이어지다가 걱정으로 굳어지는 경우가 있어, 지금 떠오른 생각이 사실인지 추측인지 구분해보는 연습이 함께 다뤄지면 좋습니다.", en: "Catching subtle signals that others miss, all while still moving at speed, is a real strength here. The same care can sometimes harden into worry once it turns into self-checking, so it helps to pause and sort out which parts of a thought are fact and which are guesswork." },
    relationships: { ko: "갈등이 생겨도 겉으로는 크게 내색하지 않는 편이라 침착해 보인다는 인상을 자주 줍니다. 그런데 속으로는 상대의 반응을 계속 곱씹으며 걱정이 오래 남는 경우가 보고됩니다. 지금 어떤 생각이 맴돌고 있는지 신뢰할 수 있는 사람에게 짧게라도 털어놓으면 그 곱씹는 시간을 줄이는 데 도움이 됩니다.", en: "Conflict rarely shows on the surface, which often gives an impression of composure. Privately, though, replaying the other person's reaction and quietly worrying about it tends to linger longer than it needs to. Sharing even a short version of what's circling in your head with someone you trust can shorten that loop." },
    work: { ko: "즉각적인 판단이 필요한 실행형 업무에 강점이 있지만, 평가받는 자리가 이어지면 피로가 티 나지 않게 조용히 쌓이는 편입니다. 하루를 마무리하며 곱씹던 생각을 정리하는 짧은 루틴이나, 결과를 있는 그대로 확인해줄 신뢰할 만한 동료를 두는 방식도 함께 탐색해볼 만합니다.", en: "This identity does well in fast, hands-on work, but a steady run of evaluation can quietly wear it down without much outward sign. A short end-of-day routine to close out replaying the day, or one trusted colleague who can confirm how things actually went, are both worth exploring." },
    growth: [
      { ko: "오늘 하루 곱씹고 있는 생각 중, 사실과 추측을 나눠서 적어볼 수 있을까요?", en: "Of the thoughts you're replaying today, could you write down which parts are fact and which are guesswork?" },
      { ko: "걱정이 스멀스멀 올라오는 순간, 믿을 수 있는 한 사람에게 짧게라도 말해볼 수 있을까요?", en: "The next time worry starts creeping in, could you say a short version of it to one person you trust?" },
      { ko: "스스로에 대한 점검이 도움이 되는 지점과 지나친 지점, 그 경계는 어디쯤일까요?", en: "Where's the line between self-checking that helps and self-checking that starts working against you?" },
    ],
  },
});
