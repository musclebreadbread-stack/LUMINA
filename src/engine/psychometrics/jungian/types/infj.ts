import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const INFJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("INFJ", {
  AV: {
    nickname: { ko: "통찰로 확신하고, 감정은 숨기지 않는 이상주의자", en: "The Insightful Idealist Who Stays Sure and Shows It" },
    keywords: [
      { ko: "의미 읽기", en: "Reading meaning" },
      { ko: "흔들림 없는 확신", en: "Steady conviction" },
      { ko: "표정에 드러나는 파동", en: "Feelings that show" },
    ],
    summary: { ko: "사람과 상황의 의미를 깊이 읽고 하나의 방향을 세워 차분히 실현해 가는 INFJ 특유의 통찰력에, 스트레스 앞에서도 흔들리지 않는 확신이 더해집니다. 다만 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant carries the core INFJ instinct for reading meaning and steadily pursuing one long-term direction, paired with a composure that tends to hold even under pressure. When emotions do stir, though, signs like irritability or a shifting mood are reported as showing outwardly more often than turning inward." },
    strengths: { ko: "위기 상황에서도 스스로의 판단에 대한 확신을 잃지 않아, 주변이 흔들릴 때 오히려 중심을 잡아주는 역할을 맡는 경우가 많습니다. 다만 감정이 쌓였을 때 이를 말이나 표정으로 즉시 드러내는 경향이 있어, 그 순간의 반응이 관계에 예상보다 크게 전해질 수 있다는 점은 함께 살펴볼 성장 과제입니다.", en: "A steady confidence in one's own judgment tends to hold even in tense moments, often making this type the calm anchor others lean on when things get shaky. At the same time, built-up feelings tend to surface quickly in tone or expression, so the reaction in that moment can land more strongly on others than intended — a pattern worth noticing and working with." },
    relationships: { ko: "가까운 사람 앞에서는 확신에 찬 태도로 관계를 이끌어가되, 감정이 상했을 때는 그 불편함을 표정이나 말투로 비교적 빨리 드러내는 편입니다. 갈등이 생기면 회피하기보다 그 자리에서 짚고 넘어가려는 경향이 상대적으로 높게 나타납니다.", en: "In close relationships, this type tends to lead with quiet confidence, and when something feels off, that discomfort tends to surface fairly quickly through tone or expression rather than staying hidden. When conflict arises, there's a relatively strong pull toward addressing it in the moment rather than letting it sit unspoken." },
    work: { ko: "정해진 방향이 있을 때 흔들림 없이 밀고 나가는 힘을 발휘하는 편이라, 목표가 명확하고 스스로 판단할 여지가 있는 협업 환경에서 편안함을 느끼는 경우가 많습니다. 의견 차이가 생기면 즉시 표현하는 편이라, 감정을 조율할 시간을 함께 마련하는 팀일수록 잘 맞을 수 있습니다.", en: "This type tends to move forward steadily once a direction is set, often feeling most comfortable in collaborative settings with a clear goal and enough room to make independent judgment calls. Because disagreement tends to surface right away rather than being held back, teams that build in some space to work through emotional friction together may be a particularly good fit to explore." },
    growth: [
      { ko: "짜증이 올라올 때, 그 감정을 말로 옮기기 전에 잠깐 멈춰보면 무엇이 달라질까요?", en: "When irritation starts to rise, what might change if you paused for a moment before putting it into words?" },
      { ko: "확신이 강하게 들 때, 그 확신과 다른 의견을 가진 사람의 말을 한 번 더 들어볼 여유가 있을까요?", en: "When you feel especially certain, is there room to listen once more to someone who sees it differently?" },
      { ko: "감정이 겉으로 드러난 뒤, 상대에게 그 순간의 맥락을 설명해 보면 어떤 변화가 생길까요?", en: "After a feeling shows on your face or in your voice, what might shift if you explained the context behind it afterward?" },
    ],
  },
  AW: {
    nickname: { ko: "통찰로 확신하고, 마음은 안으로 다스리는 이상주의자", en: "The Insightful Idealist Who Stays Sure and Settles Inward" },
    keywords: [
      { ko: "의미 읽기", en: "Reading meaning" },
      { ko: "흔들림 없는 확신", en: "Steady conviction" },
      { ko: "마음에 접어두는 파동", en: "Feelings held inward" },
    ],
    summary: { ko: "사람과 상황의 의미를 깊이 읽고 하나의 방향을 세워 차분히 실현해 가는 INFJ 특유의 통찰력에, 스트레스 앞에서도 겉으로는 흔들리지 않는 확신이 더해집니다. 다만 감정이 흔들릴 때는 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 높게 보고됩니다.", en: "This variant pairs the core INFJ instinct for reading meaning and steadily working toward one direction with a composure that tends to hold up on the outside even under pressure. When emotions do stir, though, signs like quiet worry or a dip in mood are reported as turning inward more often than showing on the surface." },
    strengths: { ko: "겉으로는 안정된 태도를 유지하면서도 내면에서는 상황을 꼼꼼히 점검하는 힘이 있어, 주변에 불안을 퍼뜨리지 않으면서 문제를 다뤄나가는 경우가 많습니다. 다만 걱정이나 가라앉은 기분을 혼자 끌어안고 가는 경향이 있어, 정작 도움이 필요한 순간에도 이를 드러내지 않을 수 있다는 점은 함께 살펴볼 성장 과제입니다.", en: "A steady exterior often pairs with careful internal checking, letting this type work through problems without spreading anxiety to those nearby. At the same time, worry or a low mood tends to be carried alone, which means real support may go unrequested even in moments it would help — a pattern worth noticing and working with." },
    relationships: { ko: "가까운 사람 앞에서도 확신에 찬 태도를 유지하려 하지만, 마음이 흔들릴 때는 겉으로 드러내기보다 혼자 삭이며 정리하려는 경향이 상대적으로 높게 나타납니다. 그 결과 상대방은 무슨 일이 있었는지 뒤늦게 알게 되는 경우가 있을 수 있습니다.", en: "In close relationships, this type tends to hold onto a steady, confident presence, and when something is bothering them, there's a relatively strong pull toward quietly working through it alone rather than showing it. As a result, the people closest to them may only learn something was wrong well after the fact." },
    work: { ko: "겉으로 흔들림 없이 맡은 일을 끌고 가는 힘이 있어, 장기적인 방향을 스스로 판단하고 조용히 실행할 수 있는 환경에서 편안함을 느끼는 경우가 많습니다. 걱정을 혼자 안고 가는 편이라, 정기적으로 상태를 확인해주는 동료나 구조가 있는 팀이라면 더 잘 맞을 수 있습니다.", en: "This type tends to carry tasks forward with a steady exterior, often feeling most at ease in environments that allow independent judgment about long-term direction and quiet execution. Because worry tends to be held internally rather than voiced, teams with some built-in check-ins or a colleague who asks how things are going may be a particularly good fit to explore." },
    growth: [
      { ko: "걱정이 쌓이고 있다는 걸 느낄 때, 그 사실을 가까운 한 사람에게 짧게라도 말해보면 어떨까요?", en: "When you notice worry building up, what might happen if you mentioned it, even briefly, to one person close to you?" },
      { ko: "겉으로는 괜찮아 보이고 싶은 마음이 들 때, 그 마음의 이유를 스스로에게 물어본 적이 있나요?", en: "When you feel the pull to look fine on the outside, have you asked yourself where that pull is coming from?" },
      { ko: "가라앉은 기분이 며칠 이어질 때, 혼자 해결하지 않고 도움을 청해도 괜찮은 순간은 언제일까요?", en: "If a low mood lingers for a few days, when might it be okay to ask for help instead of working through it alone?" },
    ],
  },
  TV: {
    nickname: { ko: "통찰로 자주 되짚어보고, 감정은 숨기지 않는 이상주의자", en: "The Insightful Idealist Who Double-Checks and Shows It" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Frequent self-checking" },
      { ko: "의미에 예민한 촉", en: "A keen sense for meaning" },
      { ko: "표정에 드러나는 파동", en: "Feelings that show" },
    ],
    summary: { ko: "사람과 상황의 의미를 깊이 읽고 하나의 방향을 세워 차분히 실현해 가는 INFJ 특유의 통찰력에, 주변의 반응이나 상황 변화에 민감하게 반응하며 스스로를 자주 점검하는 경향이 더해집니다. 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This variant carries the core INFJ instinct for reading meaning and working steadily toward one direction, combined with a heightened sensitivity to change and to how others are responding, which often shows up as frequent self-checking. When emotions stir, signs like irritability or a shifting mood tend to be reported as showing outwardly more often than staying hidden." },
    strengths: { ko: "자신의 판단과 방향을 자주 되짚어보는 습관 덕분에 놓치기 쉬운 신호를 미리 알아차리고 방향을 세밀하게 조정하는 힘이 있습니다. 다만 그 점검이 길어지면 작은 평가나 변화에도 신경이 곤두서고, 그 반응이 표정이나 말투로 금세 드러날 수 있다는 점은 함께 살펴볼 성장 과제입니다.", en: "A habit of frequently rechecking one's own judgment and direction tends to catch subtle signals others might miss and allows for fine-tuned course correction. At the same time, when that checking runs long, small pieces of feedback or unexpected change can put nerves on edge, and that reaction tends to surface quickly in tone or expression — a pattern worth noticing and working with." },
    relationships: { ko: "가까운 관계에서 상대의 반응이나 분위기 변화를 민감하게 알아차리는 편이라 세심한 배려로 이어지는 경우가 많지만, 그만큼 서운함이나 긴장도 빠르게 표정과 말투로 드러나는 경향이 상대적으로 높게 나타납니다. 갈등이 생기면 곧바로 짚고 넘어가려는 편입니다.", en: "In close relationships, this type tends to pick up quickly on shifts in another person's mood or reactions, which often turns into thoughtful attentiveness — though hurt feelings or tension tend, just as quickly, to surface in expression or tone. When conflict comes up, there's a relatively strong pull toward addressing it right away." },
    work: { ko: "변화나 피드백에 민감하게 반응하며 스스로를 자주 점검하는 편이라, 방향이 자주 흔들리지 않고 피드백이 건설적으로 오가는 환경에서 편안함을 느끼는 경우가 많습니다. 감정 기복이 표정에 드러나는 편이니, 그 순간을 있는 그대로 받아주는 동료가 있는 팀이라면 더 잘 맞을 수 있습니다.", en: "Because this type tends to be sensitive to change and feedback and checks in with itself often, environments with a stable sense of direction and constructive, steady feedback tend to feel more comfortable. Since emotional shifts tend to show on the face, teams with colleagues who can take that in stride, without reading too much into it, may be a particularly good fit to explore." },
    growth: [
      { ko: "같은 판단을 몇 번이고 되짚어보고 있다는 걸 알아차렸을 때, 한 번쯤 점검을 멈춰봐도 괜찮은 순간은 언제일까요?", en: "If you notice yourself rechecking the same decision again and again, when might it be okay to just stop and let it rest?" },
      { ko: "타인의 사소한 반응에 신경이 쓰일 때, 그 반응이 정말 나를 향한 것인지 잠깐 확인해볼 수 있을까요?", en: "When someone else's small reaction starts to weigh on you, could you pause and check whether it's really about you?" },
      { ko: "짜증이 표정으로 먼저 나타난 걸 느꼈을 때, 그 다음 행동을 다르게 선택해볼 수 있는 지점은 어디일까요?", en: "When you notice irritation showing on your face before you've named it, what's one point where you could choose a different next move?" },
    ],
  },
  TW: {
    nickname: { ko: "통찰로 자주 되짚어보고, 마음은 안으로 다스리는 이상주의자", en: "The Insightful Idealist Who Double-Checks and Settles Inward" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Frequent self-checking" },
      { ko: "의미에 예민한 촉", en: "A keen sense for meaning" },
      { ko: "마음에 접어두는 파동", en: "Feelings held inward" },
    ],
    summary: { ko: "사람과 상황의 의미를 깊이 읽고 하나의 방향을 세워 차분히 실현해 가는 INFJ 특유의 통찰력에, 주변의 반응이나 상황 변화에 민감하게 반응하며 스스로를 자주 점검하는 경향이 더해집니다. 감정이 흔들릴 때는 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This variant carries the core INFJ instinct for reading meaning and working steadily toward one direction, combined with a heightened sensitivity to change and to how others are responding, which often shows up as frequent self-checking. When emotions stir, signs like quiet worry or a dip in mood tend to be reported as turning inward more often than showing on the surface." },
    strengths: { ko: "자신의 판단을 자주 되짚어보는 습관 덕분에 놓치기 쉬운 문제를 미리 발견하고 신중하게 방향을 다듬는 힘이 있습니다. 다만 그 점검이 길어지면 걱정이 쌓이고 기분이 가라앉아도 이를 혼자 끌어안고 가는 경향이 있어, 정작 필요한 도움을 청하지 않을 수 있다는 점은 함께 살펴볼 성장 과제입니다.", en: "A habit of frequently rechecking one's own judgment tends to catch problems early and allows for careful, deliberate refinement of direction. At the same time, when that checking runs long, worry can build and mood can dip while still being carried alone, which means needed support may go unasked-for — a pattern worth noticing and working with." },
    relationships: { ko: "가까운 관계에서 상대의 반응이나 분위기 변화를 민감하게 알아차리는 편이지만, 정작 자신이 서운하거나 불안할 때는 겉으로 드러내기보다 혼자 삭이며 정리하려는 경향이 상대적으로 높게 나타납니다. 그래서 상대가 뒤늦게 상황을 알아차리는 경우가 있습니다.", en: "In close relationships, this type tends to pick up quickly on shifts in another person's mood, yet when they themselves feel hurt or unsettled, there's a relatively strong pull toward quietly working through it alone rather than showing it. As a result, the other person may only realize something was off after the fact." },
    work: { ko: "변화나 피드백에 민감하게 반응하며 스스로를 자주 점검하는 편이라, 방향이 안정적이고 피드백이 예측 가능한 방식으로 오가는 환경에서 편안함을 느끼는 경우가 많습니다. 걱정을 혼자 안고 가는 편이니, 부담 없이 상태를 물어봐주는 동료나 구조가 있는 팀이라면 더 잘 맞을 수 있습니다.", en: "Because this type tends to be sensitive to change and feedback and checks in with itself often, environments with a stable direction and feedback delivered in predictable, low-pressure ways tend to feel more comfortable. Since worry tends to be carried alone, teams with a colleague or structure that checks in without making it a big deal may be a particularly good fit to explore." },
    growth: [
      { ko: "같은 걱정을 계속 되짚고 있다는 걸 알아차렸을 때, 그 생각을 잠시 내려놓아도 괜찮은 순간은 언제일까요?", en: "If you notice yourself circling back to the same worry, when might it be okay to set the thought down for a while?" },
      { ko: "기분이 가라앉은 채로 며칠을 보내고 있다면, 그 상태를 누군가에게 가볍게 알려봐도 괜찮을까요?", en: "If a low mood has lasted a few days, would it be okay to let someone know, even just lightly?" },
      { ko: "타인의 평가가 신경 쓰일 때, 그 평가와 나의 가치를 분리해서 바라볼 수 있는 지점은 어디일까요?", en: "When someone else's evaluation is weighing on you, what's one point where you could separate that opinion from your own sense of worth?" },
    ],
  },
});
