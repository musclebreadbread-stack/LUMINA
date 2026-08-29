import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ISFJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ISFJ", {
  AV: {
    nickname: { ko: "차분히 지키다 순간 티 내는 수호자", en: "The Guardian Who Stays Steady, Then Shows It" },
    keywords: [
      { ko: "흔들림 없는 태도", en: "Unshaken Composure" },
      { ko: "즉각적인 감정 신호", en: "Visible Emotional Signals" },
      { ko: "꾸준한 보살핌", en: "Steady Care" },
    ],
    summary: { ko: "관계 속 필요를 놓치지 않고 살피며, 구체적인 행동으로 꾸준히 도움을 건네는 유형입니다. 스트레스 상황에서도 겉으로는 차분함과 확신을 유지하는 경향이 있지만, 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This type keeps a close eye on what people around them need and steadily follows through with concrete help. Under stress, a calm and confident exterior tends to hold, but when emotions do shift, signs like irritability or sudden mood changes are reported to surface first, more visibly than inward strain." },
    strengths: { ko: "위기 상황에서도 흔들리지 않는 태도로 주변에 안정감을 주는 힘이 있습니다. 다만 그 안정감 아래 쌓인 긴장이 짜증이나 급격한 기분 변화로 불쑥 튀어나올 때가 있어, 감정이 쌓이기 전에 알아차리고 표현하는 연습이 함께 도움이 될 수 있습니다.", en: "There is real strength in staying composed and offering others a sense of stability, even in tense moments. At the same time, tension that builds underneath can surface suddenly as irritability or a sharp mood shift, so noticing and naming that build-up earlier can be a useful companion practice." },
    relationships: { ko: "가까운 사람에게는 겉으로 드러나는 신호로 마음 상태가 비교적 잘 읽히는 편이라, 상대가 상황을 파악하고 다가오기 쉬운 편입니다. 갈등이 생기면 짜증이나 말투 변화로 먼저 드러난 뒤, 시간이 지나며 다시 차분한 돌봄의 태도로 돌아오는 흐름이 자주 나타납니다.", en: "Because emotional shifts tend to show visibly to close people, partners and friends often find it easier to sense what is going on. In conflict, irritation or a change in tone tends to surface first, before the relationship settles back into a calmer, caring rhythm over time." },
    work: { ko: "차분하고 안정된 태도로 팀에 신뢰를 주는 역할을 선호할 수 있습니다. 감정이 겉으로 드러나는 편이라, 압박이 쌓이기 전에 부담을 미리 나눌 수 있는 협업 방식이나 소통 창구가 열려 있는 환경이 잘 맞는지 스스로 점검해볼 만합니다.", en: "A role where a steady, dependable presence builds trust with a team can be a comfortable fit. Since emotional strain tends to show outwardly, it may be worth exploring whether a workplace offers open channels to flag pressure early, before it builds into visible frustration." },
    growth: [
      { ko: "짜증이 올라올 때, 말로 표현하기 전에 잠깐 멈춰볼 수 있는 나만의 신호가 있을까요?", en: "When irritation starts to rise, is there a personal signal that lets you pause before it comes out in words?" },
      { ko: "기분이 갑자기 흔들렸던 순간을 돌아보면, 그 전에 쌓여있던 부담은 무엇이었을까요?", en: "Looking back at a moment when your mood suddenly shifted, what pressure had been building up beforehand?" },
      { ko: "겉으로 드러난 감정 뒤에 있는 진짜 필요를 상대에게 차분히 설명해본 적이 있을까요?", en: "Have you ever calmly explained to someone the real need behind an emotion that showed on the surface?" },
    ],
  },
  AW: {
    nickname: { ko: "차분히 지키며 혼자 삭이는 수호자", en: "The Guardian Who Stays Steady, Then Sits With It Alone" },
    keywords: [
      { ko: "흔들림 없는 태도", en: "Unshaken Composure" },
      { ko: "조용한 자기 다독임", en: "Quiet Self-Soothing" },
      { ko: "꾸준한 보살핌", en: "Steady Care" },
    ],
    summary: { ko: "곁에 있는 사람의 필요를 세심히 알아차리고, 실질적인 도움을 조용히 이어가는 유형입니다. 스트레스 상황에서도 겉으로는 차분함과 확신을 유지하는 경향이 있지만, 감정이 흔들릴 때는 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This type quietly notices what the people close to them need and keeps offering practical help without much fanfare. A calm, confident exterior tends to hold up under stress, but when emotions do shift, signals like quiet worry or a dip in mood are reported to surface first, turning inward rather than showing outwardly." },
    strengths: { ko: "겉으로는 흔들리지 않는 태도를 유지하면서 주변 사람들에게 든든함을 주는 힘이 있습니다. 다만 걱정이나 낮아진 기분을 혼자 오래 끌어안고 있을 때가 있어, 감정을 적당한 시점에 믿을 수 있는 사람과 나누는 연습이 함께 도움이 될 수 있습니다.", en: "There is genuine strength in maintaining a composed exterior that gives people around them a sense of reliability. At the same time, worry or a lowered mood can be carried alone for longer than needed, so practicing sharing those feelings with a trusted person at the right moment can help." },
    relationships: { ko: "가까운 관계에서도 힘든 감정을 잘 드러내지 않는 편이라, 상대가 먼저 알아차리기 전까지는 괜찮아 보일 때가 많습니다. 갈등이 생기면 표현을 아끼고 혼자 정리하려는 경향이 있어, 무슨 생각을 하는지 상대에게 조금 더 일찍 알려주는 편이 관계에 도움이 될 수 있습니다.", en: "Even in close relationships, difficult feelings tend to stay under the surface, often looking fine until someone notices otherwise. During conflict there is a tendency to hold back and process things alone, so letting a partner in a little earlier on what is going on can help the relationship." },
    work: { ko: "겉으로 흔들리지 않는 태도로 팀에 안정감을 주는 역할을 선호할 수 있습니다. 걱정이나 부담을 안으로 쌓아두기 쉬운 편이라, 혼자 끌어안기 전에 상황을 공유할 수 있는 소통 구조나 정기적인 점검 자리가 있는 환경인지 살펴볼 만합니다.", en: "A role where a steady, unshaken presence gives a team a sense of stability can be a comfortable fit. Because worry or pressure tends to build up quietly inside, it may help to look for a workplace with regular check-ins or communication structures that make it easier to share concerns before they pile up alone." },
    growth: [
      { ko: "요즘 마음에 걸리는 일을 아직 아무에게도 말하지 않았다면, 그 이유는 무엇일까요?", en: "If something has been weighing on you lately and you have not told anyone yet, what might be the reason?" },
      { ko: "가라앉은 기분이 들 때, 혼자 있는 것과 누군가와 함께 있는 것 중 지금 필요한 건 무엇일까요?", en: "When your mood dips, which do you actually need right now, being alone, or being with someone?" },
      { ko: "걱정을 안으로 삭이는 대신, 오늘 한 사람에게만 살짝 털어놓아 본다면 어떨까요?", en: "Instead of sitting with the worry alone, what would it be like to quietly share it with just one person today?" },
    ],
  },
  TV: {
    nickname: { ko: "마음 졸이며 티가 나는 수호자", en: "The Guardian Who Worries Out Loud" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sensitive Self-Checking" },
      { ko: "겉으로 드러나는 동요", en: "Visible Emotional Waves" },
      { ko: "세심한 돌봄", en: "Attentive Care" },
    ],
    summary: { ko: "주변의 변화와 필요를 예민하게 포착하고, 구체적인 방식으로 도움을 실천하는 유형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 경향이 있고, 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This type picks up on shifting needs around them with a sharp eye and turns that awareness into concrete help. There is a tendency to react sensitively to changes in situations or others' evaluations and to monitor their own state closely, and when emotions shift, signs like irritability or sudden mood changes are reported to surface visibly." },
    strengths: { ko: "다른 사람의 반응이나 상황 변화를 예민하게 알아차려 미리 대비하는 힘이 있습니다. 다만 그 예민함이 짜증이나 급격한 기분 변화로 겉에 드러날 때가 있어, 스스로를 점검하는 에너지를 조금 덜어내고 감정을 미리 알아차리는 연습이 함께 도움이 될 수 있습니다.", en: "There is real strength in sensitively picking up on others' reactions or shifting situations and preparing ahead of time. At the same time, that sensitivity can surface outwardly as irritability or an abrupt mood swing, so easing the constant self-checking and catching emotional build-up earlier can be a useful companion practice." },
    relationships: { ko: "가까운 사람의 반응에 민감하게 신경 쓰는 편이라, 관계에서 작은 변화도 예민하게 알아차리는 힘이 있습니다. 다만 신경이 쓰일수록 짜증이나 말투 변화로 먼저 드러나는 경우가 있어, 평가받는다는 느낌이 들 때 잠시 멈추고 상황을 설명해보는 편이 관계에 도움이 될 수 있습니다.", en: "There is a strong sensitivity to how close people react, which helps in noticing even small shifts in a relationship. But the more that sensitivity builds, the more it can surface first as irritability or a change in tone, so pausing to explain what is going on when feeling judged can help the relationship." },
    work: { ko: "세심하게 상황을 살피며 협업하는 방식을 선호할 수 있지만, 평가받는 자리에서는 긴장이 쉽게 쌓이는 편입니다. 피드백이 감정적으로 부담스럽게 다가올 때가 있어, 평가와 지지가 균형 있게 오가는 환경인지, 부담을 미리 표현할 수 있는 분위기인지 살펴볼 만합니다.", en: "A collaborative style built on carefully reading the situation can be a comfortable fit, though tension tends to build easily in evaluative settings. Since feedback can land as emotionally heavy at times, it is worth checking whether a workplace balances evaluation with support and allows pressure to be voiced early." },
    growth: [
      { ko: "평가받는다는 느낌이 들 때, 그 느낌이 사실인지 확인해볼 방법이 있을까요?", en: "When you feel like you are being judged, is there a way to check whether that feeling is actually true?" },
      { ko: "짜증이 올라오기 직전, 어떤 자기 점검이 반복되고 있었을까요?", en: "Right before irritation rises, what kind of self-checking tends to repeat itself?" },
      { ko: "이번 주에는 스스로를 점검하는 시간을 조금 줄이고 그냥 흘려보내도 괜찮은 순간이 있을까요?", en: "This week, is there a moment where you could ease up on self-monitoring and just let things pass?" },
    ],
  },
  TW: {
    nickname: { ko: "마음속으로 오래 담아두는 수호자", en: "The Guardian Who Carries It Quietly Inside" },
    keywords: [
      { ko: "예민한 자기 점검", en: "Sensitive Self-Checking" },
      { ko: "안으로 향하는 걱정", en: "Inward-Turning Worry" },
      { ko: "세심한 돌봄", en: "Attentive Care" },
    ],
    summary: { ko: "주변의 작은 변화도 예민하게 알아차리고, 필요한 순간에 실질적인 도움을 건네는 유형입니다. 상황 변화나 타인의 평가에 민감하게 반응하며 스스로를 자주 점검하는 경향이 있고, 감정이 흔들릴 때는 걱정이나 가라앉은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경우가 상대적으로 많이 보고됩니다.", en: "This type notices even small shifts around them and steps in with practical help exactly when it's needed. There is a tendency to react sensitively to changes in situations or others' evaluations and to monitor their own state closely, and when emotions shift, signals like quiet worry or a dip in mood are reported to surface first, turning inward." },
    strengths: { ko: "작은 변화나 다른 사람의 반응까지 세심하게 알아차리는 힘이 있어, 문제가 커지기 전에 대비하는 데 강점을 보입니다. 다만 그 예민함이 걱정으로 쌓여 혼자 오래 곱씹게 될 때가 있어, 반복되는 걱정을 적당한 선에서 멈추는 연습이 함께 도움이 될 수 있습니다.", en: "There is genuine strength in noticing small changes and others' reactions carefully enough to prepare before problems grow. At the same time, that sensitivity can build into worry that gets turned over alone for a long time, so practicing where to draw a line on repeated worrying can help." },
    relationships: { ko: "가까운 사람의 반응을 세심하게 신경 쓰지만, 걱정이 될수록 표현을 아끼고 혼자 생각을 정리하려는 경향이 있습니다. 겉으로는 괜찮아 보여도 속으로는 계속 마음을 쓰고 있을 때가 있어, 걱정되는 부분을 조금 더 일찍 말로 꺼내는 편이 관계에 도움이 될 수 있습니다.", en: "There is careful attention to how close people are reacting, but the more worried this type feels, the more it tends to hold back and sort things out alone. Things can look fine on the surface while worry continues underneath, so voicing concerns a little sooner can help the relationship." },
    work: { ko: "세심하게 상황을 살피며 신중하게 협업하는 방식을 선호할 수 있지만, 평가받는 자리에서는 걱정이 안으로 쌓이기 쉬운 편입니다. 피드백을 받은 뒤 혼자 오래 곱씹지 않도록, 생각을 정리해 나눌 수 있는 소통 창구가 있는 환경인지 살펴볼 만합니다.", en: "A careful, considered collaborative style can be a comfortable fit, though worry tends to build up quietly in evaluative settings. To avoid dwelling alone on feedback for too long, it is worth looking for a workplace with channels to talk through those thoughts once they have been sorted out." },
    growth: [
      { ko: "같은 걱정을 며칠째 혼자 곱씹고 있다면, 그중 지금 확인할 수 있는 사실은 무엇일까요?", en: "If you have been turning the same worry over alone for days, what part of it could you actually check right now?" },
      { ko: "겉으로는 괜찮다고 말했지만 실은 마음이 쓰였던 순간이 최근에 있었을까요?", en: "Has there been a recent moment when you said you were fine but were actually still troubled inside?" },
      { ko: "걱정을 말로 꺼내는 대신 혼자 안고 가는 이유가, 상대를 위한 걸까요 나를 위한 걸까요?", en: "When you carry a worry alone instead of putting it into words, is that really for the other person, or for yourself?" },
    ],
  },
});
