/**
 * 오늘의 운세 문장 은행.
 *
 * 각 항목은 14개씩이라 (14^4 = 38,416가지) 조합이 나온다 — 별자리 하나가 1년
 * 내내 같은 날짜를 다시 맞아도 눈에 띄게 반복되지 않을 만큼 넉넉하다.
 * 톤 정책은 다른 엔진과 같다 — 단정적 예언 금지("~할 것이다" 대신 "~할 수 있다"),
 * 공포 유발 표현 금지, 조언은 부드러운 권유형으로 쓴다.
 *
 * 한국어·영어를 짝으로 묶어 둔다 — 두 배열을 따로 관리하면 인덱스가 어긋날 수
 * 있는데, 시드가 인덱스로 문장을 고르는 구조라 어긋나면 조용히 틀린 언어가
 * 섞인다. 튜플로 묶으면 그런 경로 자체가 없다.
 */

const MOOD_PAIRS: readonly (readonly [string, string])[] = [
  ["오늘은 생각보다 마음이 가볍게 풀리는 하루입니다.", "Today, your mood may ease up more than expected."],
  ["오늘은 평소보다 신중해지는 기운이 흐릅니다.", "Today carries a more cautious energy than usual."],
  ["오늘은 뜻밖의 활력이 붙는 하루입니다.", "Today can bring an unexpected boost of energy."],
  ["오늘은 속도를 늦추고 싶어지는 하루입니다.", "Today, you may feel like slowing down."],
  ["오늘은 작은 일에도 마음이 움직이기 쉽습니다.", "Today, small things can move you more than usual."],
  ["오늘은 평소보다 집중이 잘 되는 흐름입니다.", "Today tends to bring sharper focus than usual."],
  ["오늘은 마음이 여러 갈래로 갈라지기 쉽습니다.", "Today, your attention can scatter in several directions."],
  ["오늘은 잔잔하게 흘러가는 하루입니다.", "Today flows quietly, without much disturbance."],
  ["오늘은 예상 밖의 흐름에 마음이 열립니다.", "Today, you may find yourself open to unexpected turns."],
  ["오늘은 스스로를 다독이고 싶어지는 하루입니다.", "Today, you may feel like comforting yourself a little."],
  ["오늘은 결정을 미루고 싶은 기운이 있습니다.", "Today carries an urge to put decisions off."],
  ["오늘은 뭔가를 새로 시작하고 싶은 마음이 듭니다.", "Today, you may feel drawn to start something new."],
  ["오늘은 익숙한 것에 더 끌리는 하루입니다.", "Today, familiar things can feel more appealing."],
  ["오늘은 주변의 반응에 민감해지기 쉽습니다.", "Today, you can become more sensitive to others' reactions."],
];

const RELATIONSHIP_PAIRS: readonly (readonly [string, string])[] = [
  ["가까운 사람과의 대화에서 뜻밖의 위로를 받을 수 있습니다.", "A conversation with someone close can bring unexpected comfort."],
  ["사소한 말 한마디가 평소보다 크게 다가올 수 있습니다.", "A small remark can land harder than usual."],
  ["먼저 다가가면 생각보다 반응이 좋을 수 있습니다.", "Reaching out first may get a better response than expected."],
  ["혼자 있는 시간이 오히려 관계에 도움이 될 수 있습니다.", "Time alone can actually help your relationships."],
  ["오래된 인연에서 연락이 닿을 수 있습니다.", "An old connection may reach out to you."],
  ["말보다 행동으로 마음을 전하는 편이 나을 수 있습니다.", "Showing your feelings through action may work better than words."],
  ["의견 차이가 드러나도 크게 번지지는 않습니다.", "Even if disagreements surface, they tend not to escalate."],
  ["낯선 사람과의 짧은 대화가 기억에 남을 수 있습니다.", "A brief chat with a stranger can stay with you."],
  ["곁에 있는 사람의 사정을 살펴볼 여유가 생깁니다.", "You may find room to notice what someone close to you is going through."],
  ["관계에서 한 발 물러나 보는 것도 나쁘지 않습니다.", "Stepping back a little in a relationship isn't a bad idea."],
  ["작은 배려가 예상보다 큰 반응으로 돌아올 수 있습니다.", "A small kindness can come back to you bigger than expected."],
  ["대화보다 침묵이 더 많은 것을 전할 수 있습니다.", "Silence can say more than conversation today."],
  ["오래 미뤄둔 연락을 해보고 싶어질 수 있습니다.", "You may feel like reaching out to someone you've long put off contacting."],
  ["다른 사람의 속도에 맞추느라 지칠 수 있습니다.", "Keeping pace with someone else can leave you tired."],
];

const WORK_PAIRS: readonly (readonly [string, string])[] = [
  ["미뤄둔 일을 처리하기에 나쁘지 않은 흐름입니다.", "It's a decent time to handle tasks you've been putting off."],
  ["세부적인 부분에서 실수가 나오기 쉬우니 한 번 더 살펴보세요.", "Small details are prone to slip, so give things a second look."],
  ["새로운 방식을 시도해보고 싶은 마음이 듭니다.", "You may feel drawn to try a new approach."],
  ["계획대로 되지 않아도 크게 어긋나지는 않습니다.", "Even if things don't go as planned, they won't stray far off course."],
  ["혼자 처리하는 일에서 더 좋은 결과가 나올 수 있습니다.", "Working on your own can bring better results."],
  ["협업이 필요한 일에서 뜻밖의 도움을 받을 수 있습니다.", "Tasks that need teamwork can bring unexpected help."],
  ["속도보다 정확함이 더 중요한 하루입니다.", "Accuracy matters more than speed today."],
  ["작은 성과가 다음 흐름으로 이어질 수 있습니다.", "A small win can carry into what comes next."],
  ["무리한 욕심은 오히려 흐름을 늦출 수 있습니다.", "Pushing too hard can actually slow things down."],
  ["평소 미뤄온 결정을 내리기에 괜찮은 시점입니다.", "It's a fair moment to make a decision you've been putting off."],
  ["예상보다 시간이 더 걸리는 일이 생길 수 있습니다.", "Something may end up taking longer than expected."],
  ["준비해온 것을 보여줄 기회가 생길 수 있습니다.", "You may get a chance to show what you've prepared."],
  ["다른 사람의 의견을 들어보면 도움이 됩니다.", "Hearing someone else's opinion can help."],
  ["익숙한 방식이 오히려 더 안전할 수 있습니다.", "Sticking with a familiar approach may be the safer bet."],
];

const TIP_PAIRS: readonly (readonly [string, string])[] = [
  ["오늘은 처리 속도보다 마음의 여유를 먼저 챙겨보세요.", "Today, put a little peace of mind before getting things done fast."],
  ["확신이 서지 않는 일은 하루만 더 지켜봐도 괜찮습니다.", "If you're unsure about something, it's fine to wait one more day."],
  ["사소한 감사 인사를 전해보면 하루가 조금 달라질 수 있습니다.", "A small word of thanks can change the shape of your day."],
  ["몸이 보내는 신호에 조금 더 귀 기울여 보세요.", "Try listening a little more closely to what your body is telling you."],
  ["계획을 한 가지만 줄여도 훨씬 가벼워질 수 있습니다.", "Cutting just one thing from your plan can make it much lighter."],
  ["오늘 느낀 감정을 짧게라도 적어두면 도움이 됩니다.", "Jotting down how you feel today, even briefly, can help."],
  ["답을 서두르기보다 질문을 더 오래 붙들어 보세요.", "Instead of rushing to an answer, sit with the question a little longer."],
  ["익숙한 길 대신 다른 경로로 가보는 것도 좋습니다.", "Try a different route instead of the usual one."],
  ["거절해야 할 일이 있다면 오늘 분명히 해두는 편이 낫습니다.", "If there's something you need to decline, it's better to make it clear today."],
  ["작은 휴식을 미루지 말고 먼저 챙겨보세요.", "Don't put off a small break, take it first."],
  ["누군가에게 기대는 것도 방법이라는 걸 떠올려 보세요.", "Remember that leaning on someone else is a valid option too."],
  ["완벽하게 하려는 마음을 잠시 내려놓아도 괜찮습니다.", "It's okay to set aside the urge to be perfect, just for a while."],
  ["평소와 다른 선택을 한 번 해보는 것도 좋습니다.", "Trying a choice different from your usual one can be worthwhile."],
  ["오늘 하루, 스스로에게 어떤 말을 해주고 싶은가요?", "What would you like to say to yourself today?"],
];

function ko(pairs: readonly (readonly [string, string])[]): readonly string[] {
  return Object.freeze(pairs.map(([k]) => k));
}
function en(pairs: readonly (readonly [string, string])[]): readonly string[] {
  return Object.freeze(pairs.map(([, e]) => e));
}

export const MOOD_LINES: readonly string[] = ko(MOOD_PAIRS);
export const MOOD_LINES_EN: readonly string[] = en(MOOD_PAIRS);
export const RELATIONSHIP_LINES: readonly string[] = ko(RELATIONSHIP_PAIRS);
export const RELATIONSHIP_LINES_EN: readonly string[] = en(RELATIONSHIP_PAIRS);
export const WORK_LINES: readonly string[] = ko(WORK_PAIRS);
export const WORK_LINES_EN: readonly string[] = en(WORK_PAIRS);
export const TIP_LINES: readonly string[] = ko(TIP_PAIRS);
export const TIP_LINES_EN: readonly string[] = en(TIP_PAIRS);
