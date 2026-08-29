import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const INFP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("INFP", {
  AV: {
    nickname: { ko: "차분한 확신을 지닌 감정 표현가", en: "The Steadily Convicted, Openly Felt" },
    keywords: [
      { ko: "차분한 확신", en: "Steady Conviction" },
      { ko: "즉각적인 감정 표현", en: "Visible Emotional Cues" },
      { ko: "가치 수호 열정", en: "Fierce Value-Guarding" },
    ],
    summary: { ko: "내면의 가치와 가능성을 오래 탐색하는 성찰형이면서도, 스스로의 판단에 대한 확신을 비교적 흔들림 없이 지켜내는 경향이 상대적으로 높게 보고됩니다. 다만 그 확신이 흔들리는 순간에는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 방향으로 보고되곤 합니다.", en: "This variant reflects the INFP tendency to sit with values and possibilities for a long time, paired with a steadier, more self-assured stance under pressure than many other types report. When that steadiness does waver, though, the shift tends to show outwardly first, as irritation or a visible change in mood." },
    strengths: { ko: "가치 판단에 대한 내적 확신이 잘 흔들리지 않아, 외부의 압박이나 반대 의견 앞에서도 자신의 결을 지키며 대화를 이어가는 힘이 있는 것으로 보고됩니다. 다만 확신이 강해질수록 감정이 격해지는 순간 표현이 다소 날카롭게 튀어나오거나, 상대의 입장을 충분히 살피기 전에 반응이 앞서는 경향도 함께 나타날 수 있어 잠시 호흡을 고르는 연습이 도움이 될 수 있습니다.", en: "A steady inner conviction about what matters tends to hold firm even under pressure or disagreement, letting this type stay in a conversation without abandoning its own stance. That same steadiness, though, can sharpen quickly into an edge when emotion spikes, with reactions sometimes arriving before the other person's perspective has been fully considered, so pausing to breathe before responding can help." },
    relationships: { ko: "가까운 관계에서는 자신의 감정을 숨기기보다 짜증이나 서운함 같은 신호를 비교적 빨리 겉으로 드러내는 편으로 보고됩니다. 이는 상대가 마음 상태를 알아차리기 쉽다는 장점이 되기도 하지만, 감정이 채 정리되기 전에 표현이 앞서면 오해로 이어질 수 있어 잠시 멈추고 정리할 시간을 두는 것이 관계에 도움이 될 수 있습니다.", en: "In close relationships, this type tends to let feelings like irritation or hurt surface fairly quickly rather than hiding them, which can make it easier for a partner or friend to read what's going on inside. The flip side is that emotion can spill out before it's been fully sorted through, so building in a short pause before speaking can prevent a passing feeling from turning into a bigger misunderstanding." },
    work: { ko: "정해진 규칙보다 스스로 옳다고 믿는 방향을 지켜갈 수 있는 자율적인 업무 환경에서 편안함을 느끼는 경향이 있습니다. 의견 충돌이 생겨도 쉽게 위축되지 않고 자신의 관점을 낼 수 있는 팀이라면, 감정이 격해지는 순간에도 이를 건설적인 논의로 옮겨갈 여지가 있을지 살펴보는 것이 도움이 될 수 있습니다.", en: "This type tends to feel most at ease in work settings that allow room to follow a self-chosen sense of what's right rather than a fixed script, and in teams where voicing a differing view doesn't require much courage. It may be worth exploring whether, on days when frustration flares up, there's a way to redirect that energy into a constructive discussion rather than a sharp exchange." },
    growth: [
      { ko: "짜증이 올라오는 순간, 말로 표현하기 전에 잠깐 멈춰볼 수 있는 나만의 신호를 만들어볼 수 있을까요?", en: "Could you create a small personal signal to pause on, right before irritation turns into words?" },
      { ko: "확신이 강하게 느껴질 때, 상대의 말을 끝까지 들어본 뒤에 반응해도 괜찮은 순간이 있을까요?", en: "When your conviction feels strongest, is there a moment where it's okay to hear the other person out fully before responding?" },
      { ko: "감정이 겉으로 드러난 뒤, 그 감정이 실제로 무엇을 말하고 싶었는지 돌아볼 시간을 가져볼 수 있을까요?", en: "After an emotion shows on the surface, could you take a moment afterward to ask what it was actually trying to say?" },
    ],
  },
  AW: {
    nickname: { ko: "차분한 확신을 지닌 조용한 성찰가", en: "The Steadily Convicted, Quietly Inward" },
    keywords: [
      { ko: "차분한 확신", en: "Steady Conviction" },
      { ko: "내밀한 걱정", en: "Inward Worry" },
      { ko: "고요한 의미 탐구", en: "Quiet Meaning-Seeking" },
    ],
    summary: { ko: "내면의 가치와 가능성을 오래 탐색하는 성찰형이면서, 겉으로는 흔들림 없이 확신을 지키는 모습을 자주 보이는 경향이 있습니다. 다만 그 확신 아래에서는 걱정이나 가라앉은 기분처럼 안으로 향하는 감정 신호가 먼저 쌓이는 방향으로 보고되곤 합니다.", en: "This variant carries the INFP habit of dwelling on values and possibilities, combined with an outward composure that holds steady even when things get difficult. Underneath that calm surface, though, feelings such as worry or a quietly lowered mood tend to build up first, more often turning inward than showing on the outside." },
    strengths: { ko: "겉으로 드러나는 동요 없이 자신의 판단을 꾸준히 지켜가는 힘이 있어, 주변 사람들에게 안정적이라는 인상을 주는 경우가 많습니다. 다만 걱정이나 무거운 기분이 안으로 쌓이는 동안 겉으로는 괜찮아 보일 수 있어, 스스로도 그 신호를 알아차리기까지 시간이 걸리는 편이라 주기적으로 마음 상태를 점검해보는 습관이 도움이 될 수 있습니다.", en: "A steady judgment that rarely shows outward wobble tends to make this type come across as reliably composed to the people around them. But because worry or a heavy mood tends to accumulate quietly beneath that calm exterior, even this type itself can be slow to notice the buildup, so a habit of periodically checking in on one's own inner state can be worth cultivating." },
    relationships: { ko: "가까운 사람에게도 걱정이나 서운함을 바로 꺼내기보다 혼자 담아두었다가 나중에 정리해서 전하는 편으로 보고됩니다. 상대는 이 조용함을 무심함으로 오해할 수 있어, 마음이 무거워질 때 아주 간단하게라도 상태를 알리는 짧은 신호를 미리 정해두면 관계에 도움이 될 수 있습니다.", en: "Even with people close to them, this type tends to sit with worry or hurt feelings alone and process them internally before sharing anything, rather than voicing it right away. A partner or friend can easily mistake that quiet for indifference, so agreeing in advance on some small, low-effort signal for 'something's on my mind' can keep the relationship from drifting on silence." },
    work: { ko: "겉으로 드러나는 갈등 없이 차분하게 자기 몫을 해내는 환경에서 편안함을 느끼는 경향이 있습니다. 다만 걱정이 안으로 쌓이는 성향을 고려하면, 부담이 커지기 전에 상태를 가볍게 나눌 수 있는 동료나 창구가 있는 팀인지 미리 살펴보는 것이 도움이 될 수 있습니다.", en: "This type tends to feel comfortable in settings where they can quietly get their own work done without much outward friction or conflict. Given the tendency for worry to build up internally, though, it may help to look for a team that offers a colleague or channel where concerns can be shared lightly before the pressure has a chance to grow heavier." },
    growth: [
      { ko: "걱정이 조용히 쌓이고 있다는 걸 알아차렸을 때, 그날 하루 안에 누군가에게 한 마디라도 꺼내볼 수 있을까요?", en: "When you notice worry quietly piling up, could you try saying even one small thing about it to someone else that same day?" },
      { ko: "겉으로는 괜찮아 보이고 싶은 마음이 들 때, 사실은 그렇지 않다고 스스로에게 인정해줘도 괜찮은 순간이 있을까요?", en: "In a moment when you want to look fine on the outside, is it okay to quietly admit to yourself that you're actually not?" },
      { ko: "기분이 가라앉을 때, 그 원인을 혼자 다 풀어내려 하지 않고 잠시 미뤄두어도 괜찮은 일이 있을까요?", en: "When your mood dips, is there something you could set aside for later instead of trying to work through the cause all on your own?" },
    ],
  },
  TV: {
    nickname: { ko: "예민한 자기 점검을 지닌 감정 표현가", en: "The Watchfully Self-Checking, Openly Felt" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sensitive Self-Checking" },
      { ko: "즉각적인 감정 표현", en: "Visible Emotional Cues" },
      { ko: "평가에 대한 민감함", en: "Sensitivity to Judgment" },
    ],
    summary: { ko: "내면의 가치와 가능성을 오래 탐색하는 성찰형이면서, 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 돌아보는 경향이 상대적으로 높게 보고됩니다. 마음이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 비교적 빨리 나타나는 방향으로 보고되곤 합니다.", en: "This variant combines the INFP habit of dwelling on values and possibilities with a heightened sensitivity to shifting situations or other people's evaluations, often prompting frequent self-checking. When that inner balance is disturbed, the signal tends to surface fairly quickly and outwardly, as irritation or a visible shift in mood." },
    strengths: { ko: "주변 상황이나 타인의 반응 변화를 예민하게 알아차려, 문제가 커지기 전에 먼저 조정하려는 힘이 있는 것으로 보고됩니다. 다만 그 예민함이 자신을 향할 때는 사소한 평가에도 감정이 크게 출렁이며 짜증이나 예민한 반응으로 겉으로 드러날 수 있어, 반응 전에 상황을 한 번 더 확인해보는 습관이 도움이 될 수 있습니다.", en: "A sharp awareness of shifting situations or how others are reacting tends to let this type adjust course before a small problem grows larger. But when that same sensitivity turns inward, even a minor piece of feedback can send emotions swinging noticeably, showing up outwardly as irritation or a sharp reaction, so pausing to double-check the situation before responding can be worth building as a habit." },
    relationships: { ko: "가까운 사람의 말이나 표정 변화를 민감하게 알아차리는 편이라 관계의 미묘한 온도 변화에 빠르게 반응하는 경향이 있습니다. 다만 그 반응이 짜증이나 서운함으로 즉각 겉에 드러나면 사소한 일이 실제보다 크게 번질 수 있어, 반응하기 전에 상대의 의도를 한 번 더 확인해보는 여유가 관계에 도움이 될 수 있습니다.", en: "This type tends to pick up quickly on small shifts in a close person's tone or expression, reacting fast to subtle changes in the emotional temperature of a relationship. Because that reaction can show up right away as irritation or hurt, a minor moment can escalate more than it needs to, so pausing to check the other person's actual intent before reacting can smooth things over." },
    work: { ko: "성과나 평가에 대한 명확한 피드백이 오가는 환경에서 오히려 방향을 잡기 쉬워하는 경향이 있습니다. 다만 평가에 민감하게 반응하는 성향을 고려하면, 감정이 앞서기 전에 잠시 숨을 고를 수 있는 시간이나 여유가 있는 팀 문화인지 살펴보는 것이 도움이 될 수 있습니다.", en: "This type tends to find it easier to navigate work when feedback about performance and expectations is communicated clearly rather than left ambiguous. Given the sensitivity to evaluation, though, it may help to look for a team culture that allows a brief pause to collect oneself before emotion takes the lead in a response." },
    growth: [
      { ko: "타인의 평가가 마음에 걸릴 때, 그 평가가 사실인지 내 해석인지 구분해볼 수 있을까요?", en: "When someone's evaluation weighs on your mind, could you try separating what was actually said from how you're interpreting it?" },
      { ko: "짜증이 표정이나 말투로 먼저 나가려 할 때, 세 번 숨을 쉬고 나서 말해도 괜찮은 상황이 있을까요?", en: "When irritation is about to show in your face or tone before your words do, is there a moment where it's okay to take three breaths first?" },
      { ko: "스스로를 점검하는 마음이 강해질 때, 오늘 하루는 그 점검을 잠시 쉬어봐도 괜찮을까요?", en: "When the urge to check on yourself intensifies, could you give that self-monitoring a rest for just one day?" },
    ],
  },
  TW: {
    nickname: { ko: "예민한 자기 점검을 지닌 조용한 성찰가", en: "The Watchfully Self-Checking, Quietly Inward" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sensitive Self-Checking" },
      { ko: "내밀한 걱정", en: "Inward Worry" },
      { ko: "조용한 자기 의심", en: "Quiet Self-Doubt" },
    ],
    summary: { ko: "내면의 가치와 가능성을 오래 탐색하는 성찰형이면서, 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 되짚어보는 경향이 상대적으로 높게 보고됩니다. 마음이 흔들릴 때는 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 쌓이는 방향으로 보고되곤 합니다.", en: "This variant pairs the INFP tendency to linger over values and possibilities with a heightened sensitivity to change and other people's evaluations, which often leads to frequent self-reflection. When something disturbs that inner balance, the resulting worry or a quietly lowered mood tends to build up inward first, well before anything shows on the surface." },
    strengths: { ko: "상황의 미묘한 변화나 자신의 부족한 부분을 세밀하게 짚어내는 힘이 있어, 스스로를 더 나은 방향으로 다듬어가는 데 강점이 있는 것으로 보고됩니다. 다만 그 세밀함이 걱정으로 이어지면 사소한 실수도 오래 곱씹으며 안으로 가라앉는 기분에 머무를 수 있어, 돌아보는 시간에 스스로 마감선을 정해두는 것이 도움이 될 수 있습니다.", en: "A fine-grained eye for subtle shifts in a situation, and for one's own shortcomings, tends to give this type real strength in refining their own work and choices over time. But when that same attention to detail turns into worry, even a small mistake can get replayed for a long while, settling into a quietly lowered mood, so setting a deliberate stopping point for self-reflection can be worth practicing." },
    relationships: { ko: "가까운 관계에서 갈등이 생기면 곧바로 표현하기보다 혼자 곱씹으며 자신에게 잘못이 없었는지 되짚어보는 경향이 있습니다. 이런 시간이 길어지면 상대는 무슨 일이 있는지 모른 채 거리감을 느낄 수 있어, 정리가 끝나기 전이라도 지금 생각 중이라는 사실 정도는 미리 알려주는 것이 관계에 도움이 될 수 있습니다.", en: "When conflict comes up in a close relationship, this type tends to mull it over alone first, quietly re-examining whether they themselves did something wrong, rather than raising it right away. If that stretches on too long, the other person may sense distance without knowing why, so letting them know, even before the thinking is fully sorted out, that something is being processed can help keep the relationship close." },
    work: { ko: "혼자 충분히 생각을 정리한 뒤 결과물을 내놓을 수 있는, 압박이 적은 환경에서 편안함을 느끼는 경향이 있습니다. 다만 걱정이 안으로 쌓이는 성향을 고려하면, 스스로 점검하는 시간이 길어지기 전에 가볍게 의견을 나눌 수 있는 동료가 있는지 살펴보는 것이 도움이 될 수 있습니다.", en: "This type tends to feel most comfortable in low-pressure settings that allow enough time to think things through alone before producing something. Given the tendency for worry to accumulate internally, though, it may help to check whether there's a colleague nearby to casually talk things through with before self-checking stretches on too long." },
    growth: [
      { ko: "걱정이 자꾸 되풀이될 때, 그 생각을 종이에 적어 눈앞에 꺼내놓아볼 수 있을까요?", en: "When a worry keeps looping in your mind, could you try writing it down and setting it out in front of you instead?" },
      { ko: "스스로에게 잘못을 찾으려는 마음이 들 때, 오늘 하루는 그 질문을 잠시 내려놓아도 괜찮을까요?", en: "When you feel the pull to find fault in yourself, could you set that question aside for just today?" },
      { ko: "생각이 정리되지 않은 채로도, 지금 마음이 복잡하다는 사실만 누군가에게 짧게 전해볼 수 있을까요?", en: "Even before your thoughts are fully sorted out, could you send someone a short message just saying your mind feels complicated right now?" },
    ],
  },
});
