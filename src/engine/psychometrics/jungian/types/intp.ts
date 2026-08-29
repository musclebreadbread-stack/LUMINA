import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const INTP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("INTP", {
  AV: {
    nickname: { ko: "여유로운 원리 탐구자", en: "The Unhurried Principle Explorer" },
    keywords: [
      { ko: "개념 재해체", en: "Concept Deconstruction" },
      { ko: "흔들림 없는 판단", en: "Unshaken Judgment" },
      { ko: "겉으로 드러나는 짜증", en: "Irritability That Shows" },
    ],
    summary: { ko: "낯선 개념을 마주하면 일단 분해부터 하고, 원리와 예외를 따로 떼어 살펴본 뒤 혼자 힘으로 가장 정확한 설명에 도달하려는 편입니다. 결론을 서두르지 않고 스스로 확신이 설 때까지 충분히 시간을 들이는 경향이 있으며, 그 확신은 웬만한 압박에도 잘 흔들리지 않습니다. 다만 감정이 실제로 움직일 때는 짜증 섞인 말투나 표정처럼 겉으로 먼저 새어 나오는 경우가 관찰됩니다.", en: "Faced with an unfamiliar concept, there's a pull to take it apart first, examine principles and exceptions separately, and work alone toward the most accurate explanation. Conclusions rarely get rushed — confidence tends to build slowly until it feels solid, and once it does, it holds up well even under real pressure. When emotion does move, though, it tends to leak out first through a sharper tone or a shift in expression." },
    strengths: { ko: "문제를 마주했을 때 어디서부터 손대야 할지 빠르게 구조를 잡아내고, 남들이 지나친 예외 조건까지 짚어내는 정밀함이 있습니다. 압박이 심한 순간에도 침착함을 잃지 않아 위기 상황에서 오히려 더 또렷한 판단을 내리는 편이지만, 확신이 굳어질수록 반대 의견을 가볍게 흘려듣게 될 때가 있어 한 번 더 물어보는 여유가 성장의 지점이 될 수 있습니다.", en: "There's a knack for quickly mapping out where a problem should be tackled, and for catching exception cases that others tend to skip past. Composure rarely slips even under heavy pressure, which often makes judgment clearer exactly when it matters most, though firmer confidence can make it easy to wave off disagreement, so asking one more question before settling is a solid growth edge." },
    relationships: { ko: "가까운 사람 앞에서도 감정을 앞세우기보다 상황을 먼저 정리해서 담담하게 전하는 편이라, 상대는 흔들림 없고 믿을 만하다고 느끼는 경우가 많습니다. 그런데 정작 마음이 상했을 때는 말투가 날카로워지거나 표정이 굳는 방식으로 먼저 티가 나기 쉬워서, 무엇이 걸렸는지 짧게라도 짚어주면 상대가 오해를 덜 하게 됩니다.", en: "With people close by, there's a tendency to sort things out calmly rather than lead with emotion, which often comes across as steady and dependable. But when something actually stings, it tends to show first as a clipped tone or a stiffer expression, so naming what's bothering you in even a few words helps the other person read the situation correctly." },
    work: { ko: "틀에 박힌 절차를 그대로 따르기보다, 문제의 구조를 스스로 짜보고 답을 찾아가는 여지가 있을 때 몰입도가 높아지는 편입니다. 돌발 상황이나 압박이 큰 순간에도 잘 흔들리지 않아 즉흥적인 판단이 필요한 자리에서 의지가 되지만, 짜증이 말투로 새어 나올 때 동료가 이를 어떻게 받아들이는지 가끔 점검해보면 협업이 한결 매끄러워질 수 있습니다.", en: "Rather than following a procedure step by step, engagement tends to rise when there's room to work out a problem's structure independently and find the answer on your own terms. Sudden shifts or high pressure rarely cause much visible wobble, which makes this a steady presence when quick, on-the-spot calls are needed, though checking in occasionally on how a sharper tone lands with teammates can smooth collaboration further." },
    growth: [
      { ko: "확신이 강하게 들 때, 반대 의견을 한 번 더 들어보는 3분을 내볼 수 있을까요?", en: "The next time you feel very sure of something, could you spend three minutes hearing out the opposing view first?" },
      { ko: "짜증이 겉으로 드러나려는 순간, 말을 꺼내기 전에 숨을 한 번 고르면 어떻게 달라질까요?", en: "What might change if you took one breath before speaking, right at the moment irritation starts to show?" },
      { ko: "이번 주, 결론을 내리기 전에 스스로에게 '내가 놓친 예외는 없을까'라고 물어보는 순간을 만들어볼 수 있을까요?", en: "This week, could you build in a moment to ask yourself, 'what exception am I missing?', before settling on a conclusion?" },
    ],
  },
  AW: {
    nickname: { ko: "고요한 원리 탐구자", en: "The Quiet Principle Explorer" },
    keywords: [
      { ko: "원리 파고들기", en: "Digging Into Principles" },
      { ko: "담담한 자기확신", en: "Composed Self-Assurance" },
      { ko: "안으로 가라앉는 감정", en: "Emotions That Sink Inward" },
    ],
    summary: { ko: "낯선 개념을 마주하면 겉으로 드러내지 않고 조용히 원리와 예외부터 파고드는 편으로, 결론에 이르는 과정 자체를 혼자 충분히 소화하려 합니다. 압박이 심한 상황에서도 표정이나 태도가 크게 흔들리지 않아 담담해 보이는 경우가 많지만, 마음이 실제로 복잡해질 때는 걱정이나 가라앉은 기분처럼 안으로 먼저 쌓이는 신호가 관찰됩니다.", en: "Faced with an unfamiliar concept, there's a quiet pull to dig into principles and exceptions without much outward show, working through the reasoning alone until it feels fully digested. Expression and manner rarely shift much even under heavy pressure, which often reads as composed, but when things do get complicated internally, signs like worry or a quietly sinking mood tend to build up inward first." },
    strengths: { ko: "복잡한 문제를 혼자 붙잡고 끝까지 파고드는 집중력이 있고, 예외적인 상황에서도 논리의 빈틈을 놓치지 않는 정밀함이 강점입니다. 스트레스 앞에서도 겉모습은 크게 흔들리지 않지만, 신경 쓰이는 일을 내색 없이 혼자 끌어안다가 뒤늦게 지치는 경우가 있어, 부담이 무거워지는 순간을 스스로 먼저 알아차리는 연습이 성장의 지점이 될 수 있습니다.", en: "There's real focus in staying with a hard problem alone until it's fully worked through, and real precision in catching logical gaps even in edge cases. The surface rarely shows much strain, but concerns can get carried quietly and alone, sometimes leading to exhaustion that only shows up later, so catching the moment a load starts feeling heavy is one place to grow." },
    relationships: { ko: "가까운 사이에서도 감정을 먼저 꺼내기보다 생각을 정리한 뒤에야 말을 얹는 편이라, 상대는 침착하고 안정적인 사람으로 느끼는 경우가 많습니다. 다만 서운하거나 불편한 일이 있을 때는 말수가 줄고 조용히 거리를 두는 방식으로 먼저 드러나기 쉬워서, 상대가 눈치채기 전에 짧게라도 상황을 알려주면 관계가 한결 편해질 수 있습니다.", en: "In close relationships, thoughts tend to get sorted out before speaking rather than leading with emotion, which often comes across as calm and stable. But when something feels off, it tends to show first as talking less and quietly pulling back, so giving a short heads-up before the other person has to notice on their own can make things easier for both sides." },
    work: { ko: "업무 절차가 빡빡하게 정해져 있기보다, 문제의 얼개를 스스로 짜고 조용히 몰입해서 풀어갈 수 있는 환경에서 안정감을 느끼는 편입니다. 겉으로는 압박에 잘 흔들리지 않지만 부담이 쌓일 때 혼자 끌어안다가 지치는 경우가 있어, 진행 상황이나 막힌 부분을 정기적으로 짧게 공유하는 루틴을 두면 협업이 더 오래 지속될 수 있습니다.", en: "Stability tends to come from environments where the shape of a problem can be worked out and quietly absorbed independently, rather than one bound by a rigid procedure. Pressure rarely shows on the surface, but a growing load can get carried alone until it turns into quiet fatigue, so a regular, low-effort habit of flagging progress or sticking points can help collaboration hold up longer." },
    growth: [
      { ko: "혼자 끌어안고 있던 걱정을, 이번 주 한 번쯤 가까운 사람에게 짧게 꺼내볼 수 있을까요?", en: "This week, could you try sharing a worry you've been carrying alone with someone close, even briefly?" },
      { ko: "조용해지고 싶은 순간에, 무슨 일 때문인지 한 문장으로만 적어보면 어떨까요?", en: "The next time you feel like going quiet, what happens if you write down the reason in just one sentence?" },
      { ko: "결론을 완전히 확정하기 전에, 다른 사람의 반응을 한 번 물어보는 걸 시도해볼 수 있을까요?", en: "Before locking in a conclusion completely, could you try asking someone else for their reaction first?" },
    ],
  },
  TV: {
    nickname: { ko: "예민한 원리 탐구자", en: "The Alert Principle Explorer" },
    keywords: [
      { ko: "논리적 재검토", en: "Logical Re-Examination" },
      { ko: "예민한 자기점검", en: "Sensitive Self-Monitoring" },
      { ko: "즉각적인 감정 신호", en: "Immediate Emotional Signal" },
    ],
    summary: { ko: "낯선 개념을 마주하면 세부까지 파고들어 분해하고, 스스로 내린 결론을 몇 번이고 다시 점검하며 가장 정확한 설명에 다가가려는 편입니다. 주변 상황의 변화나 타인의 평가에 특히 민감하게 반응하는 경향이 있고, 그 반응은 짜증이나 급격한 표정 변화처럼 겉으로 빠르게 드러나는 경우가 많다고 보고됩니다.", en: "Faced with an unfamiliar concept, there's a drive to break it down to the details and re-check conclusions again and again on the way to the most accurate explanation. There's a particular sensitivity to shifting situations or others' evaluations, and that reaction is often reported to surface quickly and visibly, as irritability or a sudden shift in expression." },
    strengths: { ko: "세부까지 파고드는 분해력과 끊임없는 자기점검 덕분에, 남들이 놓치는 허술한 전제까지 잡아내는 힘이 있습니다. 평가나 상황 변화에 예민하게 반응하는 만큼 문제를 남들보다 먼저 감지하지만, 그 예민함이 짜증이나 급격한 기분 변화로 곧장 새어 나올 때가 있어 반응하기 전 잠깐 멈추는 습관이 성장의 지점이 될 수 있습니다.", en: "Breaking things down to the details and continually re-checking your own reasoning means loose premises rarely slip through unnoticed. Sensitivity to feedback or shifting situations often means catching problems before others do, though that same sensitivity can spill out quickly as irritability or a sudden mood swing, so pausing for a moment before reacting is one place to grow." },
    relationships: { ko: "가까운 사이일수록 상대의 반응이나 관계의 미묘한 변화를 예민하게 알아채는 편이라, 작은 말 한마디에도 마음이 크게 흔들릴 때가 있습니다. 그 흔들림이 짜증 섞인 말투로 곧바로 튀어나오기 쉬워서, 감정이 앞서기 전에 지금 느끼는 걸 있는 그대로 짧게 말해보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, the other person's reactions and small shifts in the relationship tend to register quite sensitively, so even an offhand comment can stir things up. That reaction tends to come out fast, as a sharper tone, so naming what you're actually feeling in a few plain words before it takes over can help the relationship." },
    work: { ko: "업무가 촘촘히 정해진 절차를 따르기보다, 스스로 문제의 얼개를 짜고 검증해볼 여지가 있을 때 실력이 더 잘 드러나는 편입니다. 피드백이나 평가에 민감하게 반응해 결과물을 몇 번이고 다시 들여다보는 편이라 완성도는 높지만, 예민함이 짜증으로 튀어나오기 전에 지금 느끼는 압박을 동료에게 미리 알려두면 협업이 한결 수월해질 수 있습니다.", en: "Ability tends to show more clearly when there's room to work out and verify a problem's structure independently, rather than following a tightly fixed procedure. Sensitivity to feedback or evaluation often brings repeated review of the work, which raises polish, but flagging the pressure you're under to teammates before sensitivity turns into irritability can make collaboration easier." },
    growth: [
      { ko: "타인의 평가가 마음에 걸릴 때, 그 평가가 사실인지 내 해석인지 구분해서 적어볼 수 있을까요?", en: "The next time someone's evaluation is weighing on you, could you jot down whether it's a fact or your own interpretation?" },
      { ko: "짜증이 올라오는 순간, 말을 꺼내기 전에 10초만 멈춰보면 무엇이 달라질까요?", en: "What might change if you paused for ten seconds before speaking, right as irritation starts to rise?" },
      { ko: "이번 주에 한 번, 결과물을 재검토하는 횟수를 하나 줄여봐도 괜찮은 상황이 있을까요?", en: "Is there a situation this week where it would be okay to cut one round of re-checking your work?" },
    ],
  },
  TW: {
    nickname: { ko: "신중한 원리 탐구자", en: "The Watchful Principle Explorer" },
    keywords: [
      { ko: "세밀한 개념 정리", en: "Meticulous Concept Organizing" },
      { ko: "잦은 자기점검", en: "Frequent Self-Monitoring" },
      { ko: "조용히 가라앉는 마음", en: "A Mood That Quietly Sinks" },
    ],
    summary: { ko: "낯선 개념과 마주하면 일단 세밀하게 쪼개어 분석하고, 내린 결론이 정말 맞는지 여러 차례 되짚어보며 정확도를 높이려는 편입니다. 주변의 평가나 상황 변화를 놓치지 않고 예민하게 챙기는 경향이 있으며, 마음이 흔들릴 때는 걱정이나 가라앉은 기분처럼 겉으로 잘 드러나지 않은 채 안으로 조용히 쌓이는 신호가 관찰됩니다.", en: "Faced with an unfamiliar concept, there's a pull to break it down in fine detail and circle back to a conclusion more than once to sharpen its accuracy. Little escapes notice when it comes to others' evaluations or shifts in a situation, and when things do feel unsettled, signals like worry or a low mood tend to build up quietly inward, without much showing on the surface." },
    strengths: { ko: "세부를 꼼꼼히 나누어 살피고 스스로의 판단을 반복해서 검증하는 편이라, 허술한 전제나 빠뜨린 조건을 잘 잡아냅니다. 평가나 상황 변화에 예민하게 신경 쓰는 만큼 신중하게 검토하는 힘이 있지만, 걱정이 안으로 쌓이다가 어느 순간 기분이 가라앉는 쪽으로 이어질 때가 있어, 마음이 무거워지기 전에 생각을 소리 내어 나눠보는 연습이 성장의 지점이 될 수 있습니다.", en: "Sorting through details carefully and repeatedly checking your own judgment means loose premises or missed conditions rarely get past you. Sensitivity to evaluation or shifting circumstances brings real thoroughness to review, but worry can quietly build inward until it tips into a low mood, so practicing saying thoughts out loud before that weight sets in is one place to grow." },
    relationships: { ko: "가까운 사이에서는 상대의 표정이나 말투 변화를 놓치지 않고 예민하게 알아채는 편이라, 사소한 말 한마디에도 생각이 오래 남을 때가 있습니다. 그 여운이 걱정이나 위축된 태도로 안을 향해 먼저 쌓이기 쉬워서, 혼자 삭이기보다 지금 느끼는 걸 조금씩이라도 상대에게 말해보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, a shift in someone's expression or tone rarely goes unnoticed, so even a small comment can linger in the mind. That lingering tends to build inward first as worry or a withdrawn attitude, so sharing even a little of what you're feeling, rather than sitting with it alone, can help the relationship." },
    work: { ko: "업무 절차가 촘촘히 짜여 있기보다, 스스로 문제의 얼개를 확인하고 신중하게 검증할 여지가 있는 환경에서 실력을 더 잘 발휘하는 편입니다. 피드백이나 평가에 예민하게 반응해 결과물을 여러 번 다시 살피는 편이라 완성도는 높지만, 걱정이 안으로 쌓여 있을 때는 겉으로 잘 티가 나지 않아서, 막히는 지점을 먼저 짧게 알리는 루틴이 있으면 협업이 더 편해질 수 있습니다.", en: "Performance tends to come through more clearly in environments that leave room to check a problem's structure and verify it carefully, rather than a tightly scripted process. Sensitivity to feedback or evaluation often brings repeated review of the work, which raises polish, but worry that builds up quietly inside doesn't always show, so a habit of flagging sticking points early can make collaboration easier." },
    growth: [
      { ko: "걱정이 안으로 쌓이는 게 느껴질 때, 그 생각을 소리 내어 한 문장으로 말해볼 수 있을까요?", en: "The next time you notice worry building up inside, could you say the thought out loud in one sentence?" },
      { ko: "결과물을 다시 살피고 싶은 마음이 들 때, 이미 충분한지 스스로에게 먼저 물어볼 수 있을까요?", en: "The next time you feel the pull to re-check your work again, could you first ask yourself whether it's already good enough?" },
      { ko: "기분이 가라앉기 시작했다는 걸 알아챈 순간, 그걸 가까운 사람에게 짧게 알려볼 수 있을까요?", en: "The moment you notice your mood starting to dip, could you give someone close a brief heads-up about it?" },
    ],
  },
});
