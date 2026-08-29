import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ESFP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ESFP", {
  AV: {
    nickname: { ko: "감정도 에너지도 숨기지 않는 활력소", en: "The Scene's Unfiltered Spark" },
    keywords: [
      { ko: "당당한 존재감", en: "Bold presence" },
      { ko: "즉각적 감정표현", en: "Instant emotional expression" },
      { ko: "빠른 기분전환", en: "Quick mood resets" },
    ],
    summary: { ko: "사람과 장면의 생생한 에너지를 포착하고 분위기를 살리는 ESFP의 기본 성향에, 웬만한 압박에도 흔들리지 않는 당당함이 더해집니다. 다만 감정이 정말 흔들릴 때는 짜증이나 기분 변화가 표정과 말투에 비교적 빨리 드러나는 편으로 보고됩니다.", en: "Building on ESFP's knack for reading a room's energy and warming it up, this variant adds a steady confidence that rarely wavers under pressure. When feelings do run high, though, irritation or mood shifts tend to surface fairly quickly on the face and in tone." },
    strengths: { ko: "낯선 자리에서도 위축되지 않고 분위기를 이끄는 당당함이 두드러지며, 스트레스 상황에서도 비교적 안정된 태도를 유지하는 경향이 보고됩니다. 다만 감정이 격해질 때는 그 반응이 표정이나 말투로 즉시 드러나는 편이라, 상대가 그 강도를 의도보다 크게 받아들이지 않도록 속도를 조절하는 연습이 도움이 될 수 있습니다.", en: "A readiness to hold the room and stay composed even in high-pressure moments stands out, along with steadier footing than most under stress. At the same time, when emotions spike, the reaction often shows up immediately in expression or tone, so pacing that response so others do not read it as bigger than intended can be a useful thing to practice." },
    relationships: { ko: "가까운 사이에서는 감정을 숨기지 않고 즉각적으로 표현하는 편이라 관계가 솔직하고 생동감 있게 느껴질 때가 많습니다. 다만 순간적인 짜증이나 기분 변화가 앞서 나올 경우, 상대가 이를 갈등의 신호로 오해하지 않도록 감정 뒤에 있는 맥락을 함께 전하는 습관이 관계를 더 편안하게 만들 수 있습니다.", en: "In close relationships, feelings tend to come out right away rather than staying hidden, which often makes the connection feel honest and alive. Still, when a flash of irritation or a mood swing leads the way, sharing the context behind it can help the other person avoid mistaking it for a bigger conflict than it is." },
    work: { ko: "활기찬 분위기를 스스로 만들어내고, 사람들과 즉흥적으로 호흡을 맞추는 협업 환경에서 힘을 발휘하는 경향이 있습니다. 감정 기복이 바로 드러나는 편이므로, 컨디션에 따라 팀 분위기가 크게 좌우되지 않으려면 어떤 루틴이나 신호가 자신에게 도움이 될지 살펴보는 것도 좋은 탐색이 될 수 있습니다.", en: "Tends to thrive in collaborative settings that let this person generate energy on the spot and improvise rhythm with others. Because mood shifts tend to show quickly, it can be worth exploring what routines or cues help keep the team's atmosphere from swinging along with one's own." },
    growth: [
      { ko: "짜증이 올라오는 순간, 말보다 먼저 숨을 한 번 고르는 연습을 해보면 어떨까요?", en: "When irritation starts rising, what would it be like to pause for one breath before speaking?" },
      { ko: "기분이 급격히 바뀌었을 때, 그 감정의 진짜 이유를 스스로에게 물어본 적이 있나요?", en: "Have you ever asked yourself what's really behind a sudden mood shift?" },
      { ko: "오늘의 감정을 내일까지 끌고 가지 않고 하루 안에 정리해보는 시도를 해볼 수 있을까요?", en: "Could you try letting today's feelings settle within the day, instead of carrying them into tomorrow?" },
    ],
  },
  AW: {
    nickname: { ko: "겉은 든든하고 속은 스스로 다독이는 활력소", en: "The Steady Spark Who Processes Quietly Inside" },
    keywords: [
      { ko: "안정된 리더십", en: "Steady leadership" },
      { ko: "내면의 다잡음", en: "Internal composure" },
      { ko: "조용한 재정비", en: "Quiet recalibration" },
    ],
    summary: { ko: "사람과 장면의 생생한 에너지를 살리는 ESFP의 기본 성향에, 웬만한 상황에서는 흔들리지 않는 당당함이 더해집니다. 다만 감정이 정말 흔들릴 때는 겉으로 드러내기보다 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 편으로 보고됩니다.", en: "Building on ESFP's gift for lifting the energy of people and moments, this variant carries a composed confidence that holds up well under most pressure. When something genuinely shakes them, though, the first signals tend to be inward, worry or a quieter mood, rather than visible on the outside." },
    strengths: { ko: "분위기를 이끌면서도 웬만한 압박 앞에서 흔들리지 않는 당당함이 두드러지고, 겉으로는 여유 있어 보이는 경우가 많습니다. 다만 마음이 힘들 때는 그것을 드러내지 않고 혼자 끌어안는 경향이 있어, 걱정이 쌓이기 전에 믿을 만한 사람에게 상태를 짧게라도 알리는 습관이 도움이 될 수 있습니다.", en: "A steadiness that holds even under real pressure stands out, often paired with an outward ease that makes others feel reassured. At the same time, there is a tendency to carry difficulty alone rather than show it, so building a habit of flagging even a small signal to someone trusted before worry builds up can help." },
    relationships: { ko: "가까운 사이에서는 늘 밝고 안정적인 모습을 먼저 보여주는 편이라 상대가 편안함을 느끼는 경우가 많습니다. 다만 정말 힘든 순간에는 내색하지 않고 혼자 삭이는 경향이 있어, 상대가 뒤늦게야 그 사실을 알게 되지 않도록 먼저 작은 신호라도 전하는 것이 관계를 더 단단하게 만들 수 있습니다.", en: "In close relationships, showing up bright and steady tends to come first, which often puts the other person at ease. But in genuinely hard moments, there is a tendency to hold it in rather than let it show, and offering even a small early signal, rather than letting the other person find out later, can make the relationship feel sturdier." },
    work: { ko: "활기를 스스로 만들어내면서도 흔들림 없이 상황을 이끄는 역할에서 편안함을 느끼는 경향이 있습니다. 다만 부담이 쌓여도 겉으로 잘 드러나지 않는 편이므로, 스스로의 상태를 점검할 수 있는 시간이나 대화 창구가 마련된 환경인지 살펴보는 것도 도움이 될 수 있습니다.", en: "Tends to feel comfortable generating energy while steadily leading a situation, even under pressure. Since strain does not always show on the surface, it can be worth exploring whether the environment offers time or channels for checking in on one's own state." },
    growth: [
      { ko: "오늘 마음이 좀 무거웠다면, 그 사실을 누군가에게 짧게라도 말해본 적이 있나요?", en: "If today felt heavier than usual, have you ever told someone that, even briefly?" },
      { ko: "혼자 걱정을 끌어안기 전에, 그 걱정을 종이에 적어보면 어떤 모습일까요?", en: "Before carrying a worry alone, what would it look like to write it down first?" },
      { ko: "괜찮은 척하지 않아도 되는 순간을 이번 주에 하나 만들어볼 수 있을까요?", en: "Could you create one moment this week where you don't have to pretend you're fine?" },
    ],
  },
  TV: {
    nickname: { ko: "마음의 날씨가 바로 드러나는 활력소", en: "The Spark Whose Weather Shows Fast" },
    keywords: [
      { ko: "예민한 감지력", en: "Sharp sensitivity" },
      { ko: "기분 기복의 빠른 표출", en: "Rapid mood swings" },
      { ko: "타인 반응 민감성", en: "Sensitivity to others' reactions" },
    ],
    summary: { ko: "사람과 장면의 생생한 에너지를 살리는 ESFP의 기본 성향에, 주변 반응과 평가에 민감하게 반응하며 스스로를 자주 점검하는 결이 더해집니다. 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 비교적 빨리, 자주 나타나는 편으로 보고됩니다.", en: "On top of ESFP's natural talent for lifting the energy of people and moments, this variant adds a heightened sensitivity to change and feedback, along with a habit of checking in on itself often. When emotions shift, signals like irritation or mood swings tend to surface quickly and recur often." },
    strengths: { ko: "분위기와 사람의 반응을 예민하게 알아차리는 감각이 강점으로 작용하며, 상황 변화에 빠르게 적응하는 모습을 보이는 경향이 있습니다. 다만 그 예민함이 감정 기복으로 바로 이어질 때가 많아, 반응하기 전에 잠깐 멈추는 여유를 마련하면 에너지를 좀 더 오래 유지하는 데 도움이 될 수 있습니다.", en: "A sharp read on mood and other people's reactions works as a real strength, along with a knack for adapting quickly when situations change. That same sensitivity, though, often turns into visible mood swings, so building in a brief pause before reacting can help sustain energy for longer." },
    relationships: { ko: "가까운 사이에서는 상대의 반응 하나하나에 민감하게 반응하고, 감정을 숨기지 않고 바로 표현하는 편이라 관계가 생생하게 느껴질 때가 많습니다. 다만 순간의 기분 변화가 갈등처럼 보일 수 있어, 감정이 가라앉은 뒤 다시 대화를 이어가는 습관을 들이면 오해를 줄이는 데 도움이 될 수 있습니다.", en: "In close relationships, picking up on every shift in the other person's reaction and expressing feelings right away tends to make the connection feel vivid and alive. But a passing mood shift can look like conflict to the other person, so returning to the conversation once feelings settle can help prevent misunderstandings." },
    work: { ko: "주변 분위기와 피드백에 민감하게 반응하며 즉각적으로 에너지를 전환하는 협업 환경에서 능력을 발휘하는 경향이 있습니다. 다만 평가나 변화에 따라 감정이 쉽게 흔들릴 수 있으므로, 피드백을 받는 방식이나 타이밍을 스스로 조절할 수 있는 환경인지 살펴보는 것도 좋은 탐색이 될 수 있습니다.", en: "Tends to do well in collaborative settings that respond quickly to atmosphere and feedback, redirecting energy on the fly. Since emotions can shift easily around evaluation or change, it's worth exploring whether the environment allows some say in how and when feedback arrives." },
    growth: [
      { ko: "다른 사람의 표정 하나에 마음이 크게 흔들릴 때, 그 반응이 사실인지 짐작인지 구분해본 적이 있나요?", en: "When someone's expression shakes you, have you ever paused to separate what's fact from what's assumption?" },
      { ko: "평가받는 순간 긴장이 몰려올 때, 잠깐 멈춰서 숨을 고르는 시도를 해보면 어떨까요?", en: "When tension rises around being evaluated, what would it be like to pause and take a breath first?" },
      { ko: "오늘 느낀 짜증을 하루가 끝나기 전에 다른 시선으로 다시 바라볼 수 있을까요?", en: "Could you look at today's irritation from a different angle before the day ends?" },
    ],
  },
  TW: {
    nickname: { ko: "밝은 무대 뒤에서 스스로를 점검하는 활력소", en: "The Bright Spark Who Checks In With Itself Backstage" },
    keywords: [
      { ko: "세심한 관찰력", en: "Careful attentiveness" },
      { ko: "내면의 자기점검", en: "Internal self-check" },
      { ko: "조용한 재충전", en: "Quiet recharge" },
    ],
    summary: { ko: "사람과 장면의 생생한 에너지를 살리는 ESFP의 기본 성향에, 주변 반응과 평가에 민감하게 반응하며 스스로를 자주 점검하는 결이 더해집니다. 감정이 흔들릴 때는 겉으로 드러내기보다 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 편으로 보고됩니다.", en: "Alongside ESFP's core talent for lifting the energy of people and scenes, this variant carries a heightened sensitivity to feedback and change, plus a habit of frequently checking in on itself. When feelings are shaken, the first signals tend to turn inward, worry or a quieter mood, rather than show on the surface." },
    strengths: { ko: "사람들의 반응과 분위기 변화를 세심하게 알아차리는 감각이 두드러지고, 그만큼 상황에 맞게 스스로를 조율하려는 노력을 많이 하는 편입니다. 다만 그 점검이 걱정으로 이어져 혼자 오래 끌어안는 경우가 있어, 걱정이 반복될 때는 그것을 말로 꺼내 정리해보는 습관이 도움이 될 수 있습니다.", en: "A close attentiveness to people's reactions and shifts in mood stands out, matched by real effort to adjust to the situation. That same self-checking, though, can turn into worry carried alone for a long stretch, and when it repeats, putting it into words can help sort it out." },
    relationships: { ko: "가까운 사이에서는 겉으로 밝은 모습을 유지하려 하면서도, 속으로는 관계나 상대의 반응을 자주 점검하는 편입니다. 다만 걱정이 안에서 쌓이기만 하면 상대가 눈치채기 어려우므로, 마음이 복잡할 때는 그 상태를 짧게라도 먼저 알려주는 것이 관계를 더 편안하게 만들 수 있습니다.", en: "In close relationships, there is a tendency to keep things looking bright on the outside while frequently checking in internally on the relationship or the other person's reactions. Since worry that only builds up inside is hard for others to notice, offering even a brief heads-up when things feel complicated can make the relationship more comfortable." },
    work: { ko: "분위기를 살리는 역할을 하면서도, 피드백이나 평가에 따라 스스로를 자주 재점검하는 경향이 있습니다. 다만 그 점검이 걱정으로 이어질 때 잘 드러나지 않는 편이므로, 부담을 나눌 수 있는 대화 창구나 회복할 시간이 확보된 환경인지 살펴보는 것도 좋은 탐색이 될 수 있습니다.", en: "Tends to bring energy to a room while frequently re-checking itself against feedback or evaluation. Since that self-checking can turn into worry that doesn't show on the surface, it's worth exploring whether the environment offers a channel for sharing the load or time to recover." },
    growth: [
      { ko: "걱정이 머릿속에서 계속 맴돌 때, 그것을 글로 옮겨 적어본 적이 있나요?", en: "When a worry keeps circling in your head, have you tried writing it down?" },
      { ko: "괜찮은 척 넘어간 순간을 떠올려보고, 그때 필요했던 게 무엇이었는지 생각해볼 수 있을까요?", en: "Thinking back to a moment you brushed off with 'I'm fine,' what did you actually need then?" },
      { ko: "이번 주에 한 번쯤, 평가와 상관없이 나를 다독이는 시간을 따로 마련해볼 수 있을까요?", en: "Could you set aside one moment this week just for yourself, separate from any evaluation?" },
    ],
  },
});
