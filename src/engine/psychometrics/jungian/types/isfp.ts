import { freezeBaseTypeVariants, type BaseTypeVariants } from "./shared";

export const ISFP_VARIANTS: BaseTypeVariants = freezeBaseTypeVariants("ISFP", {
  AV: {
    nickname: { ko: "흔들림도 감추지 않는 확신의 조율자", en: "The Steady Tuner Who Wears It Openly" },
    keywords: [
      { ko: "즉흥적 표현", en: "Spontaneous Expression" },
      { ko: "담담한 확신", en: "Calm Conviction" },
      { ko: "현재의 감각", en: "Present-Moment Sensing" },
    ],
    summary: { ko: "현재의 감각과 주변 분위기를 섬세하게 느끼고, 자신의 가치에 맞는 방식으로 조용히 움직이는 ISFP의 결에 웬만한 압박에도 쉽게 흔들리지 않는 담담한 확신이 더해집니다. 다만 감정이 크게 움직일 때는 그 파동이 표정이나 말투로 비교적 빨리 드러나는 경향이 상대적으로 자주 보고됩니다.", en: "Building on the ISFP core of sensing the present moment and quietly acting on personal values, this pattern adds a calm, steady confidence that tends to hold even under pressure. When emotions do run high, however, that shift is reported as showing up fairly quickly on the face or in tone." },
    strengths: { ko: "위기 상황에서도 동요하지 않고 자기 확신을 유지하는 힘이 강점으로 보고됩니다. 다만 그 확신이 굳어지면 감정이 흔들릴 때 나오는 즉각적인 신호를 스스로 가볍게 여기고 넘어가기 쉬운 점은 함께 살펴볼 성장 과제입니다. 순간의 반응을 알아차리고 이름 붙이는 연습이 도움이 될 수 있습니다.", en: "A notable strength is staying self-assured and unrattled even in tense moments. A related growth edge is that this steadiness can make it easy to brush past the quick emotional signals that do surface, like a flash of irritation or a shift in mood, without pausing to name them. Practicing that pause can be worth exploring." },
    relationships: { ko: "가까운 관계에서는 큰 흔들림 없이 안정적인 태도를 보이다가도, 서운함이나 답답함이 쌓이면 표정이나 말투에 즉각 드러나는 편으로 보고됩니다. 그 신호를 상대가 먼저 알아채는 경우가 많아, 감정이 왜 올라왔는지를 스스로 먼저 짚어 보고 짧게라도 말로 전하는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, a steady, unshaken presence is common, but when frustration or hurt builds up, it tends to surface quickly through expression or tone. Others often notice the shift before it is named aloud, so pausing to identify the feeling first and naming it briefly can smooth the relationship." },
    work: { ko: "급한 요구나 갑작스러운 변화 앞에서도 크게 흔들리지 않고 자기 리듬을 지키는 협업 방식이 잘 맞는 편으로 보고됩니다. 감정을 표현하는 데 거리낌이 없는 만큼, 순간의 반응을 그대로 전달하기보다 한 박자 정리한 뒤 공유할 수 있는 여유 있는 업무 환경을 탐색해 보는 것이 좋습니다.", en: "A collaborative setting that lets this person keep their own rhythm even amid sudden demands or change tends to be a good fit, since they hold steady under pressure. Because emotional reactions surface readily, a workplace with enough breathing room to pause and settle a reaction before sharing it may be worth exploring." },
    growth: [
      { ko: "감정이 확 올라오는 순간, 바로 표현하기 전에 잠깐 멈춰 보면 무엇이 달라질까요?", en: "What might change if you paused for a moment before expressing a sudden rush of emotion?" },
      { ko: "확신이 강하게 들 때, 다른 가능성을 한 번 더 물어봐도 괜찮은 상황이 있을까요?", en: "Is there a situation where, even when you feel certain, it is worth asking about another possibility?" },
      { ko: "오늘 짜증이나 기분 변화가 스쳤다면, 그 감정에 이름을 붙여 본다면 무엇일까요?", en: "If a flash of irritation or mood shift passed through you today, what would you name it?" },
    ],
  },
  AW: {
    nickname: { ko: "고요히 다잡는 확신의 조율자", en: "The Steady Tuner Who Settles Inward" },
    keywords: [
      { ko: "차분한 뚝심", en: "Quiet Steadiness" },
      { ko: "내면 다잡기", en: "Inner Recalibration" },
      { ko: "섬세한 진심", en: "Understated Sincerity" },
    ],
    summary: { ko: "현재의 감각과 주변 분위기를 섬세하게 느끼고 자신의 가치에 맞게 조용히 움직이는 ISFP의 결에, 어려운 상황에서도 쉽게 흔들리지 않는 담담한 확신이 더해집니다. 다만 마음이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 자주 보고됩니다.", en: "Building on the ISFP core of sensing the present moment and quietly acting on personal values, this pattern adds a steady, self-assured calm that tends to hold under pressure. When something does unsettle them, though, the first signs are reported to lean inward, showing up more as quiet worry or a dip in mood than as visible reaction." },
    strengths: { ko: "겉으로 흔들리지 않으면서도 스스로를 다잡는 힘이 강점으로 보고됩니다. 다만 그 안정감 뒤에서 걱정이나 낮아진 기분을 혼자 삭이다가 정작 필요한 도움을 청하는 시점을 놓치기 쉬운 점은 함께 돌아볼 성장 과제입니다. 마음이 가라앉을 때 신호를 미리 알아채는 연습이 도움이 될 수 있습니다.", en: "A clear strength is holding steady on the surface while quietly working things out internally. A related growth edge is that this composure can make it easy to sit with worry or a lowered mood alone for too long, missing the point where reaching out would actually help. Noticing that dip earlier can be worth practicing." },
    relationships: { ko: "가까운 관계에서는 흔들림 없는 태도로 상대를 안심시키는 편이지만, 서운함이나 걱정이 쌓이면 말수가 줄거나 혼자 생각에 잠기는 방식으로 먼저 나타나는 경향이 보고됩니다. 상대가 그 변화를 눈치채기 전에, 지금 어떤 마음인지를 짧게라도 먼저 꺼내 보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, a calm, unshaken presence often puts others at ease, but when worry or hurt builds up, it tends to show first as going quiet or withdrawing into private thought. Naming the feeling out loud, even briefly, before the distance grows too wide can be worth practicing." },
    work: { ko: "압박이 있는 상황에서도 흔들리지 않고 맡은 일을 차분히 지켜내는 협업 방식이 잘 맞는 편으로 보고됩니다. 다만 혼자 고민을 오래 끌어안기 쉬운 만큼, 정기적으로 상태를 확인하고 부담을 나눌 수 있는 소통 구조가 있는 업무 환경을 탐색해 보는 것도 좋습니다.", en: "A collaborative style built around calmly holding steady on assigned work, even under pressure, tends to fit well here. Because concerns can be carried alone for a long stretch, though, it may be worth exploring workplaces with regular, low-key check-ins that make space to share the load before it piles up." },
    growth: [
      { ko: "마음이 가라앉는 걸 느꼈을 때, 바로 누군가에게 짧게 털어놓아도 괜찮은 상황이 있을까요?", en: "Is there a moment where you could share how you are feeling with someone right away, even briefly?" },
      { ko: "겉으로는 괜찮아 보이고 싶을 때, 그 마음을 잠깐 멈추고 들여다보면 무엇이 보일까요?", en: "If you paused the urge to look fine on the surface, what might you notice underneath?" },
      { ko: "이번 주, 혼자 삭이던 걱정 하나를 말로 꺼내 본다면 어떤 말이 될까요?", en: "If you put one worry you have been sitting with into words this week, what would it sound like?" },
    ],
  },
  TV: {
    nickname: { ko: "예민하게 살피며 솔직히 흔들리는 조율자", en: "The Watchful Tuner Who Shows the Ripple" },
    keywords: [
      { ko: "예민한 점검", en: "Vigilant Self-Check" },
      { ko: "즉각적 신호", en: "Instant Signals" },
      { ko: "현재의 감각", en: "Present-Moment Sensing" },
    ],
    summary: { ko: "현재의 감각과 사람의 분위기를 섬세히 느끼고 자신의 가치에 맞게 움직이는 ISFP의 결에, 상황 변화나 타인의 반응에 예민하게 반응하며 스스로를 자주 점검하는 성향이 더해집니다. 감정이 흔들릴 때는 짜증이나 기분 변화처럼 겉으로 드러나는 신호가 먼저 나타나는 경향이 상대적으로 자주 보고됩니다.", en: "Building on the ISFP core of sensing the present moment and acting on personal values, this pattern adds a heightened sensitivity to change and others' reactions, along with frequent self-checking. When emotions shift, the first signs tend to be visible ones, like irritability or a noticeable change in mood, more than a quiet, internal response." },
    strengths: { ko: "작은 변화나 분위기 차이를 놓치지 않고 스스로를 점검하는 세심함이 강점으로 보고됩니다. 다만 그 점검이 지나치면 사소한 반응에도 신경을 많이 쓰게 되고, 그 긴장이 짜증이나 기분 변화로 겉에 드러나기 쉬운 점은 함께 살펴볼 성장 과제입니다. 반응의 크기를 가늠해 보는 연습이 도움이 될 수 있습니다.", en: "A clear strength is a fine attentiveness that catches small shifts in mood or circumstance and checks in with oneself accordingly. A related growth edge is that this same vigilance can build tension over minor reactions, which then tends to surface as irritability or a visible mood swing. Gauging the actual size of a reaction can be worth practicing." },
    relationships: { ko: "가까운 관계에서는 상대의 반응이나 분위기 변화를 민감하게 알아차리는 편이지만, 그만큼 작은 신호에도 신경이 곤두서고 짜증이나 기분 변화가 겉으로 빨리 드러나는 경향이 보고됩니다. 반응하기 전에 지금 느낀 것이 실제로 얼마나 큰 일인지 잠깐 가늠해 보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, changes in another person's tone or mood are often picked up quickly, but that same sensitivity can mean small signals set off visible irritability or mood swings. Pausing to gauge how significant the trigger actually is before reacting can be worth practicing in these relationships." },
    work: { ko: "분위기나 상황 변화를 빠르게 감지하고 스스로 점검하며 일하는 방식이 잘 맞는 편으로 보고됩니다. 다만 예민함이 쌓이면 반응이 겉으로 빨리 드러날 수 있는 만큼, 피드백이 과하지 않고 리듬을 지킬 수 있는 여유 있는 업무 환경을 탐색해 보는 것이 좋습니다.", en: "A working style built around quickly sensing shifts in mood or circumstance and checking in with oneself tends to suit this pattern well. Because built-up sensitivity can surface quickly as a visible reaction, it may be worth exploring workplaces with steady, unrushed feedback that does not demand constant vigilance." },
    growth: [
      { ko: "짜증이 확 올라올 때, 그 반응이 실제 상황의 크기와 맞는지 잠깐 물어봐도 괜찮을까요?", en: "When irritation flares up quickly, is it worth pausing to ask whether the reaction matches the actual situation?" },
      { ko: "타인의 반응을 살피는 데 쓰던 에너지를 오늘 하루는 나에게 돌려 본다면 어떨까요?", en: "What might happen if, just for today, you redirected the energy usually spent monitoring others' reactions back toward yourself?" },
      { ko: "기분이 흔들릴 때, 그 원인을 한 문장으로 적어 본다면 무엇이라고 쓸까요?", en: "When your mood shifts, what would you write if you put the cause into a single sentence?" },
    ],
  },
  TW: {
    nickname: { ko: "예민하게 살피며 조용히 다스리는 조율자", en: "The Watchful Tuner Who Holds It Inside" },
    keywords: [
      { ko: "예민한 점검", en: "Vigilant Self-Check" },
      { ko: "내면의 침잠", en: "Inward Turning" },
      { ko: "섬세한 진심", en: "Understated Sincerity" },
    ],
    summary: { ko: "현재의 감각과 사람의 분위기를 섬세히 느끼고 자신의 가치에 맞게 움직이는 ISFP의 결에, 상황 변화나 타인의 평가에 예민하게 반응하며 스스로를 자주 점검하는 성향이 더해집니다. 감정이 흔들릴 때는 걱정이나 낮은 기분처럼 안으로 향하는 신호가 먼저 나타나는 경향이 상대적으로 자주 보고됩니다.", en: "Building on the ISFP core of sensing the present moment and acting on personal values, this pattern adds a heightened sensitivity to change and others' evaluations, along with frequent self-checking. When emotions shift, the first signs tend to turn inward, showing up more as quiet worry or a dip in mood than as anything visible to others." },
    strengths: { ko: "작은 변화나 분위기 차이를 세심하게 알아채고 스스로를 자주 점검하는 힘이 강점으로 보고됩니다. 다만 그 점검이 반복되면 걱정이나 낮아진 기분을 혼자 오래 끌어안기 쉽고, 정작 필요한 도움을 청하지 못하고 지나가는 점은 함께 돌아볼 성장 과제입니다. 걱정의 크기를 소리 내어 확인하는 연습이 도움이 될 수 있습니다.", en: "A clear strength is a fine attentiveness that catches small shifts in mood or circumstance and checks in with oneself accordingly. A related growth edge is that this repeated self-checking can turn into carrying worry or a lowered mood alone for a long stretch, without asking for help that would actually be useful. Saying the worry out loud can be worth practicing." },
    relationships: { ko: "가까운 관계에서는 상대의 반응이나 평가를 민감하게 살피는 편이지만, 그만큼 마음이 흔들릴 때 말수가 줄거나 혼자 생각에 잠기며 걱정을 안으로 쌓아 두는 경향이 보고됩니다. 걱정이 커지기 전에 지금 느낀 것을 짧게라도 상대에게 먼저 전해 보는 연습이 관계에 도움이 될 수 있습니다.", en: "In close relationships, another person's reactions or evaluations are often picked up with real sensitivity, but when something unsettles them, it tends to show first as growing quiet or withdrawing into private worry. Naming the feeling to the other person early, even briefly, before it builds up can be worth practicing." },
    work: { ko: "분위기나 상황 변화를 빠르게 감지하고 스스로 점검하며 꼼꼼하게 일하는 방식이 잘 맞는 편으로 보고됩니다. 다만 걱정을 혼자 끌어안기 쉬운 만큼, 부담을 미리 나눌 수 있는 소통 구조와 평가에 대한 불안을 줄여 주는 안정적인 업무 환경을 탐색해 보는 것이 좋습니다.", en: "A working style built around quickly sensing shifts in mood or circumstance and checking one's own work carefully tends to suit this pattern well. Because worry can be carried alone for a while, it may be worth exploring workplaces with structures for sharing concerns early and steady feedback that eases anxiety about being evaluated." },
    growth: [
      { ko: "걱정이 쌓이는 걸 느꼈을 때, 그 걱정을 오늘 안에 누군가에게 한 문장으로 전해 봐도 괜찮을까요?", en: "When worry starts to build, is it okay to put it into one sentence and share it with someone before the day ends?" },
      { ko: "스스로에 대한 평가가 낮아질 때, 그 생각이 사실인지 다른 사람에게 물어봐도 될까요?", en: "When your self-evaluation dips, would it help to ask someone else whether that thought actually holds up?" },
      { ko: "이번 주, 혼자 끌어안았던 불안 하나를 소리 내어 말해 본다면 어떤 느낌일까요?", en: "If you said one anxiety you have been carrying alone out loud this week, what might that feel like?" },
    ],
  },
});
