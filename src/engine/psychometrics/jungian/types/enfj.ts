import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ENFJ_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ENFJ", {
  AV: {
    nickname: { ko: "확신을 앞세우고 감정을 그대로 내보이는 촉진자", en: "The Confident Facilitator Who Lets It All Show" },
    keywords: [
      { ko: "흔들림 없는 확신", en: "Unshaken Confidence" },
      { ko: "표정에 다 드러나는 감정", en: "Feelings Written on the Face" },
      { ko: "짧고 굵은 회복", en: "Quick, Clean Recovery" },
    ],
    summary: { ko: "사람들의 잠재력을 알아보고 하나의 방향으로 묶어내는 촉진형 기질에, 웬만한 압박에도 흔들리지 않는 확신이 겹쳐집니다. 그 확신은 감정을 억누르는 방식이 아니라 그대로 표정과 말투로 흘려보내는 쪽에 가까워서, 짜증이나 서운함이 올라오면 그 순간 얼굴에 먼저 드러나곤 합니다. 대신 오래 담아두지 않고 금방 다시 평소 리듬으로 돌아오는 편입니다.", en: "This type pairs the ENFJ instinct for spotting people's potential and rallying them toward one direction with a confidence that rarely cracks under pressure. That confidence doesn't come from holding feelings in — irritation or hurt tends to show up on the face or in the tone of voice almost the moment it appears. The upside is that it rarely lingers; the mood usually resets within the hour." },
    strengths: { ko: "위기 상황에서 오히려 목소리 톤이 차분해지고 말이 분명해지는 편이라, 팀이 방향을 잃었을 때 사람들이 자연스럽게 이쪽을 쳐다보게 됩니다. 동시에 마음에 걸리는 게 있으면 회의 도중에도 표정으로 드러나서, 굳이 묻지 않아도 무언가 있다는 걸 주변이 눈치채는 경우가 많습니다. 숨기려 하지 않는 만큼 오해가 오래가지 않는다는 것도 특징입니다.", en: "In a crisis, the voice tends to steady and the language gets sharper, so when a team loses its bearings, people naturally look this way for a cue. At the same time, if something is bothering this person, it tends to show on the face mid-meeting without anyone having to ask — and because nothing is hidden on purpose, misunderstandings rarely have time to fester." },
    relationships: { ko: "관계에서는 확신에 찬 태도로 먼저 다가가 갈등을 정리하려는 편이지만, 서운함이나 짜증이 생기면 참기보다 그 자리에서 표정이나 말투에 묻어 나오는 쪽입니다. 상대 입장에서는 상태를 짐작하기 쉬운 대신, 감정이 격해진 순간의 말투가 실제보다 더 세게 느껴질 수 있어 조율이 필요합니다.", en: "There's usually a readiness to step toward conflict first with a confident, settling tone, but hurt or irritation rarely gets swallowed — it tends to surface right there in tone or expression. The upside for the other person is that the state is easy to read; the trade-off is that in a heated moment, the tone can land harder than intended, so some calibration helps." },
    work: { ko: "정해진 매뉴얼을 따르기보다, 사람들이 스스로 방향에 확신을 갖도록 이끄는 자리에서 에너지가 오히려 살아나는 편입니다. 압박이 큰 프로젝트에서 팀에 확신을 전달하는 역할을 자주 맡게 되는데, 그 과정에서 느끼는 피로나 짜증이 회의 자리에서 바로 드러날 수 있으니, 감정이 격해지기 전에 잠깐 자리를 비우는 타이밍을 마련해두는 편이 도움이 됩니다.", en: "Energy tends to rise, not fall, in roles that call for helping a group find confidence in a shared direction rather than following a fixed manual. High-pressure projects often put this person in the position of projecting that confidence to others — and the fatigue or irritation behind it can surface mid-meeting, so building in a short break before things escalate tends to help." },
    growth: [
      { ko: "짜증이 표정에 먼저 나타난 걸 알아챈 순간, 말로도 한번 옮겨보면 어떨까요?", en: "Once you notice irritation showing on your face, could you try putting it into words too?" },
      { ko: "오늘 하루, 확신을 전달하기 전에 스스로에게 컨디션부터 물어볼 수 있을까요?", en: "Before projecting confidence today, could you check in with yourself first?" },
      { ko: "감정이 금방 가라앉는 편이라면, 그 짧은 순간에 무슨 일이 있었는지 기록해볼 수 있을까요?", en: "Since your moods tend to pass quickly, could you jot down what actually happened in that short window?" },
    ],
  },
  AW: {
    nickname: { ko: "확신은 앞세우고 걱정은 속으로 삭이는 촉진자", en: "The Confident Facilitator Who Processes Worry Alone" },
    keywords: [
      { ko: "흔들림 없는 확신", en: "Unshaken Confidence" },
      { ko: "속으로 쌓이는 걱정", en: "Worry That Builds Quietly" },
      { ko: "티 안 나는 소진", en: "Burnout That Doesn't Show" },
    ],
    summary: { ko: "사람들의 잠재력을 알아보고 하나의 방향으로 묶어내는 촉진형 기질에, 웬만한 압박에도 흔들리지 않는 확신이 겹쳐집니다. 다만 그 확신을 지키는 동안 걱정이나 불안은 표정 밖으로 잘 새어 나오지 않고 안에서 계속 맴도는 편이라, 정작 본인이 지쳐 있다는 사실을 스스로도 뒤늦게 알아차리곤 합니다.", en: "This type combines the ENFJ instinct for spotting people's potential and rallying them toward a shared direction with a confidence that rarely wavers under pressure. But keeping that confidence intact often means worry or unease stays circling internally rather than leaking out — so it's common for the person to realize they were exhausted only after the fact." },
    strengths: { ko: "겉으로 흔들리는 기색이 거의 없다 보니, 주변 사람들이 이 사람 곁에서는 안심하고 기댈 수 있다는 인상을 받는 경우가 많습니다. 문제는 그 평온함을 유지하려고 걱정거리를 계속 혼자 처리하다 보면, 정작 도움이 필요한 순간에도 먼저 손을 내밀지 않는 습관이 굳어질 수 있다는 점입니다.", en: "Because so little visibly rattles this person, others often come away with the sense that it's safe to lean on them. The catch is that maintaining that calm can mean quietly processing every worry alone, and over time that habit can make it harder to reach out for help even in moments that actually call for it." },
    relationships: { ko: "가까운 사람 앞에서도 확신 있는 모습을 유지하려는 경향이 있어, 정작 걱정되는 이야기는 꺼내지 않고 혼자 정리해버리는 일이 잦습니다. 상대는 별문제 없어 보인다고 여기다가, 한참 지나서야 그동안 쌓여 있던 걱정의 크기를 알게 되는 경우가 생깁니다.", en: "There's often a pull to keep showing close others a composed, confident front, which means real worries tend to get worked through alone instead of shared. The other person may assume everything is fine, only to discover much later just how much had quietly built up in the meantime." },
    work: { ko: "사람들이 방향을 정하고 함께 움직이도록 이끄는 자리에서 안정감 있는 기준점 역할을 자연스럽게 맡게 됩니다. 다만 프로젝트가 어려워질수록 걱정을 혼자 끌어안고 조용히 처리하는 패턴이 강해지기 쉬우므로, 부담을 나눌 수 있는 사람이나 정기적인 점검 자리를 미리 정해두는 편이 도움이 됩니다.", en: "There's a natural fit for roles where being a steady reference point helps a group set and hold to a shared direction. As projects get harder, though, the pattern of shouldering worry alone and processing it quietly tends to intensify, so it helps to line up a person or a regular check-in ahead of time to share that load." },
    growth: [
      { ko: "요즘 혼자 처리하고 있는 걱정이 있다면, 오늘은 그중 하나만 소리 내어 말해볼 수 있을까요?", en: "If there's a worry you've been handling alone lately, could you say just one of them out loud today?" },
      { ko: "겉으로는 평온해 보였던 순간을 하나 골라, 그때 실제 마음 상태를 적어볼 수 있을까요?", en: "Could you pick a moment you looked calm on the outside and write down what was actually going on inside?" },
      { ko: "스스로 지쳐 있다는 걸 뒤늦게 알아채는 편이라면, 그 신호를 더 일찍 알아챌 방법은 무엇일까요?", en: "If you tend to notice your own exhaustion late, what might help you catch the signal earlier?" },
    ],
  },
  TV: {
    nickname: { ko: "분위기를 예민하게 살피고 감정을 숨기지 못하는 촉진자", en: "The Watchful Facilitator Who Can't Hide a Feeling" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Constant Self-Checking" },
      { ko: "즉각적 감정 표현", en: "Feelings That Surface Fast" },
      { ko: "평가에 대한 촉각", en: "A Nose for Being Judged" },
    ],
    summary: { ko: "사람들의 잠재력을 알아보고 하나의 방향으로 묶어내는 촉진형 기질 위에, 주변 분위기나 타인의 반응 변화를 남들보다 빨리 감지하고 스스로를 자주 되짚어보는 결이 얹힙니다. 그렇게 예민하게 감지한 긴장이 마음속에 오래 머무르지 않고, 짜증이나 조바심 같은 형태로 곧장 표정이나 말투에 드러나는 편이라 주변이 상태를 금세 알아챕니다.", en: "Layered on top of the ENFJ instinct to spot people's potential and rally them toward a shared direction is a heightened radar for shifts in mood or other people's reactions, plus a habit of frequently second-guessing oneself. That tension picked up so quickly rarely stays inside for long — it tends to show up almost immediately as irritation or restlessness in the face or voice, so others catch on fast." },
    strengths: { ko: "회의실 공기가 미묘하게 바뀌는 순간이나 누군가의 표정이 달라지는 찰나를 남들보다 먼저 알아채는 감각이 있어, 문제가 커지기 전에 먼저 짚어내는 경우가 많습니다. 다만 그 감각이 예민하게 작동할수록 스스로도 초조해져서, 미처 정리되지 않은 조바심이 말투에 섞여 나오는 순간이 종종 있습니다.", en: "There's a knack for catching the moment a room's mood subtly shifts or someone's expression changes, often flagging a problem before it grows. But the sharper that radar runs, the more restless it can make the person themselves — and that unprocessed edge sometimes slips into their tone before they've had a chance to sort it out." },
    relationships: { ko: "가까운 사람의 표정이나 말투가 평소와 조금만 달라져도 금방 알아채고 신경을 쓰는 편인데, 정작 그로 인해 생긴 자신의 불안이나 짜증은 감추지 못하고 바로 겉으로 드러납니다. 무엇 때문에 예민해졌는지 먼저 말해주면, 상대가 상황을 오해 없이 받아들이기 쉬워집니다.", en: "Even a slight shift in a close person's tone or expression tends to get noticed and worried over right away — yet the anxiety or irritation that shift stirs up in return is hard to mask and shows almost instantly. Naming what triggered the sensitivity up front tends to help the other person read the moment correctly." },
    work: { ko: "사람들의 반응을 세심하게 읽어내며 방향을 조율하는 자리에서 능력이 두드러지지만, 평가받는 상황이나 갑작스러운 변화 앞에서는 긴장이 표정과 말투로 바로 새어 나올 수 있습니다. 중요한 피드백을 앞두고는 몇 분이라도 미리 마음을 가라앉히는 루틴을 만들어두는 편이 도움이 됩니다.", en: "Strength shows most in roles that call for carefully reading people's reactions while steering a shared direction, though evaluation or sudden change can make tension leak into expression and tone almost immediately. Building in even a few minutes to settle before high-stakes feedback tends to make a real difference." },
    growth: [
      { ko: "표정에 조바심이 드러나기 전, 그 감정이 어디서 시작됐는지 먼저 짚어볼 수 있을까요?", en: "Before restlessness shows on your face, could you trace back where that feeling actually started?" },
      { ko: "타인의 반응을 살피는 시간을 오늘 하루만 의식적으로 줄여보면 어떨까요?", en: "Could you deliberately spend less time reading other people's reactions today, just as an experiment?" },
      { ko: "누군가의 평가를 기다리는 동안 느끼는 긴장을 몸으로 먼저 풀어볼 수 있을까요?", en: "While waiting on someone's evaluation, could you work off that tension physically first?" },
    ],
  },
  TW: {
    nickname: { ko: "분위기를 예민하게 살피고 걱정은 안으로 삭이는 촉진자", en: "The Watchful Facilitator Who Keeps Worry Inside" },
    keywords: [
      { ko: "잦은 자기 점검", en: "Constant Self-Checking" },
      { ko: "속으로 쌓이는 걱정", en: "Worry That Builds Quietly" },
      { ko: "평가에 대한 촉각", en: "A Nose for Being Judged" },
    ],
    summary: { ko: "사람들의 잠재력을 알아보고 하나의 방향으로 묶어내는 촉진형 기질 위에, 주변 분위기나 타인의 반응 변화를 남들보다 빨리 감지하고 스스로를 자주 되짚어보는 결이 얹힙니다. 다만 그렇게 감지한 긴장은 겉으로 잘 드러나지 않고, 걱정이나 낮은 기분의 형태로 속에서 계속 맴돌다가 시간이 한참 지난 뒤에야 겉으로 티가 나는 편입니다.", en: "Layered on top of the ENFJ instinct to spot people's potential and rally them toward a shared direction is a heightened radar for shifts in mood or other people's reactions, plus a habit of frequently second-guessing oneself. But the tension that radar picks up rarely shows on the surface — it tends to circle inward as worry or a quiet dip in mood, only becoming visible to others much later, if at all." },
    strengths: { ko: "사람들의 반응이나 상황의 미묘한 변화를 남들보다 먼저 감지하는 감각 덕분에, 문제가 본격적으로 터지기 전에 미리 대비해두는 경우가 많습니다. 다만 그렇게 감지한 긴장을 계속 속으로 눌러 담다 보니, 스스로도 언제부터 지쳐 있었는지 한참 지나서야 알아차리는 일이 흔합니다.", en: "A sharp read on subtle shifts in people's reactions or a situation often means potential problems get prepared for well before they fully surface. But because that same sensitivity tends to get pressed down and held inside, it's common to realize only much later just how long the exhaustion had actually been building." },
    relationships: { ko: "가까운 사람의 반응 변화에 민감하게 신경을 쓰면서도, 정작 그로 인해 생긴 걱정이나 불안은 잘 드러내지 않고 혼자 곱씹는 편입니다. 상대는 아무 문제가 없어 보인다고 여기다가, 나중에야 그동안 조용히 쌓여 있던 걱정의 무게를 알게 되는 경우가 생깁니다.", en: "There's a heightened attentiveness to shifts in how close others react, paired with a tendency to keep the resulting worry unspoken and quietly turn it over instead. The other person may assume everything is fine, only to learn much later just how much weight had been silently accumulating." },
    work: { ko: "사람들의 반응이나 상황 변화를 세심하게 살피며 방향을 조율하는 자리에서 강점이 드러나지만, 평가받는 상황이 이어질수록 걱정을 혼자 끌어안고 되짚어보는 습관이 깊어지기 쉽습니다. 그 과정을 정기적으로 누군가와 나누는 자리를 만들어두면 도움이 됩니다.", en: "Strength shows in roles that call for closely tracking people's reactions or a shifting situation while steering toward a shared direction, though a string of evaluative moments can deepen the habit of carrying worry alone and replaying it internally. Setting up a regular space to share that process with someone tends to help." },
    growth: [
      { ko: "혼자 계속 곱씹고 있는 걱정을 오늘은 글로 옮겨 눈앞에 꺼내볼 수 있을까요?", en: "Could you take a worry you keep replaying and put it into writing today, just to get it out in front of you?" },
      { ko: "지쳐 있다는 걸 뒤늦게 알아차리는 편이라면, 하루 중 몸 상태를 미리 체크해보는 시간을 정해볼 수 있을까요?", en: "If you tend to notice your own exhaustion late, could you set a regular time to check in with your body during the day?" },
      { ko: "겉으로는 괜찮아 보였던 최근의 순간 하나를 골라, 그때 실제로 무엇을 걱정했는지 떠올려볼 수 있을까요?", en: "Could you pick a recent moment you looked fine on the outside and recall what you were actually worried about then?" },
    ],
  },
});
