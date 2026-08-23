export type ReadingSlot = "mood" | "relationship" | "work" | "tip";

export interface ReadingFragment {
  readonly id: string;
  readonly ko: string;
  readonly en: string;
}

type FragmentSet = Partial<Record<ReadingSlot, ReadingFragment>>;

export const BASELINE_FRAGMENTS: Readonly<Record<ReadingSlot, ReadingFragment>> = Object.freeze({
  mood: Object.freeze({
    id: "baseline-mood",
    ko: "오늘은 흐름을 단정하기보다 현재의 신호를 천천히 살펴보는 날입니다.",
    en: "Today is better used to notice the current signals than to force a conclusion.",
  }),
  relationship: Object.freeze({
    id: "baseline-relationship",
    ko: "가까운 사람과는 짧고 분명한 말이 편안한 간격을 만들어 줍니다.",
    en: "With close people, brief and clear words can create a comfortable distance.",
  }),
  work: Object.freeze({
    id: "baseline-work",
    ko: "작은 순서를 정해 한 가지씩 확인하면 흐름을 안정적으로 이어갈 수 있습니다.",
    en: "A small sequence of checks can help you keep the work moving steadily.",
  }),
  tip: Object.freeze({
    id: "baseline-tip",
    ko: "오늘의 해석은 선택을 대신하지 않으므로, 실제 상황과 함께 참고해 주세요.",
    en: "This reading does not replace your judgment, so use it alongside the actual situation.",
  }),
});

export const SIGNAL_FRAGMENTS: Readonly<Record<string, FragmentSet>> = Object.freeze({
  "moon-sign-match": Object.freeze({
    mood: Object.freeze({
      id: "moon-sign-match-mood",
      ko: "달이 선택한 별자리 구간을 지나며 감정의 결을 알아차리기 쉬운 흐름입니다.",
      en: "With the Moon moving through your chosen sign, emotional texture may be easier to notice.",
    }),
    relationship: Object.freeze({
      id: "moon-sign-match-relationship",
      ko: "상대의 반응을 서둘러 해석하기보다 먼저 자신의 감정을 말해 보세요.",
      en: "Try naming your own feeling before interpreting someone else's response.",
    }),
    work: Object.freeze({
      id: "moon-sign-match-work",
      ko: "집중하고 싶은 대상을 한 가지로 좁히면 감각을 실제 작업에 연결하기 좋습니다.",
      en: "Narrowing your focus to one subject can connect intuition with practical work.",
    }),
    tip: Object.freeze({
      id: "moon-sign-match-tip",
      ko: "몸의 리듬과 기분을 짧게 기록해 두면 오늘의 신호를 구분하는 데 도움이 됩니다.",
      en: "A brief note about your rhythm and mood can help separate today's signals.",
    }),
  }),
  "sun-sign-match": Object.freeze({
    mood: Object.freeze({
      id: "sun-sign-match-mood",
      ko: "태양이 선택한 별자리 구간에 있어 자기 방향을 의식하기 좋은 상징적 배경입니다.",
      en: "The Sun is in your chosen sign, a symbolic backdrop for noticing your direction.",
    }),
    relationship: Object.freeze({
      id: "sun-sign-match-relationship",
      ko: "관계에서 원하는 역할을 먼저 정리하면 말의 중심이 분명해질 수 있습니다.",
      en: "Clarifying the role you want in a relationship can make your words more centered.",
    }),
    work: Object.freeze({
      id: "sun-sign-match-work",
      ko: "오늘의 우선순위를 한 문장으로 정리하면 실행할 방향이 또렷해집니다.",
      en: "Putting today's priority into one sentence can make the next action clearer.",
    }),
    tip: Object.freeze({
      id: "sun-sign-match-tip",
      ko: "주목받는 것보다 스스로 중요하게 여기는 기준을 먼저 확인해 보세요.",
      en: "Check the standards that matter to you before seeking attention from others.",
    }),
  }),
  "mercury-retrograde": Object.freeze({
    mood: Object.freeze({
      id: "mercury-retrograde-mood",
      ko: "수성의 역행 표시는 속도보다 재확인과 정리가 어울리는 상징적 신호입니다.",
      en: "Mercury's retrograde marker is a symbolic cue for review and organization over speed.",
    }),
    relationship: Object.freeze({
      id: "mercury-retrograde-relationship",
      ko: "메시지의 뜻을 짐작하기보다 핵심을 다시 묻는 편이 오해를 줄일 수 있습니다.",
      en: "Asking for the point again may reduce confusion better than guessing at a message.",
    }),
    work: Object.freeze({
      id: "mercury-retrograde-work",
      ko: "보내기 전 날짜와 숫자, 약속을 한 번 더 확인하는 흐름이 적절합니다.",
      en: "A second check of dates, numbers, and commitments is a fitting rhythm today.",
    }),
    tip: Object.freeze({
      id: "mercury-retrograde-tip",
      ko: "새로운 결정보다 이미 시작한 일의 누락을 먼저 살펴보세요.",
      en: "Look for omissions in work already started before adding a new decision.",
    }),
  }),
  "mars-sign-tension": Object.freeze({
    mood: Object.freeze({
      id: "mars-sign-tension-mood",
      ko: "화성과 선택한 별자리의 긴장 구간은 반응하기 전 한 박자를 두라는 상징으로 읽을 수 있습니다.",
      en: "A tense Mars relationship with your sign can be read as a symbolic pause before reacting.",
    }),
    relationship: Object.freeze({
      id: "mars-sign-tension-relationship",
      ko: "대화의 속도를 낮추고 상대의 의도를 확인하면 불필요한 충돌을 피하기 쉽습니다.",
      en: "Slowing a conversation and checking intent can help avoid an unnecessary clash.",
    }),
    work: Object.freeze({
      id: "mars-sign-tension-work",
      ko: "경쟁보다 순서를 지키는 방식이 에너지를 더 오래 유지하게 해 줍니다.",
      en: "Following the order of work may preserve energy longer than competing for speed.",
    }),
    tip: Object.freeze({
      id: "mars-sign-tension-tip",
      ko: "즉시 답해야 한다는 압박이 들면 짧은 휴식 뒤에 다시 선택해 보세요.",
      en: "If an immediate answer feels pressing, pause briefly before choosing again.",
    }),
  }),
  "moon-mars-square": Object.freeze({
    mood: Object.freeze({
      id: "moon-mars-square-mood",
      ko: "달과 화성의 각은 감정과 행동 사이의 간격을 살펴보라는 상징적 신호입니다.",
      en: "The Moon–Mars aspect symbolically invites a look at the gap between feeling and action.",
    }),
    relationship: Object.freeze({
      id: "moon-mars-square-relationship",
      ko: "감정이 올라온 순간에는 결론보다 사실을 먼저 확인하는 편이 안전합니다.",
      en: "When emotion rises, checking the facts before reaching a conclusion is safer.",
    }),
    work: Object.freeze({
      id: "moon-mars-square-work",
      ko: "짧은 단위로 작업을 나누면 마음의 속도와 실제 속도를 맞추기 쉽습니다.",
      en: "Breaking work into short units can align emotional pace with practical pace.",
    }),
    tip: Object.freeze({
      id: "moon-mars-square-tip",
      ko: "반응을 보내기 전에 한 번 읽고, 지금 필요한 말만 남겨 보세요.",
      en: "Read a response once before sending it, and keep only what is needed now.",
    }),
  }),
  "sun-moon-conjunction": Object.freeze({
    mood: Object.freeze({
      id: "sun-moon-conjunction-mood",
      ko: "태양과 달의 합은 의식적인 방향과 현재 감각을 함께 살펴보는 상징적 신호입니다.",
      en: "A Sun–Moon conjunction symbolically brings conscious direction and present feeling together.",
    }),
    relationship: Object.freeze({
      id: "sun-moon-conjunction-relationship",
      ko: "원하는 것과 느끼는 것을 한 문장으로 말하면 대화의 중심이 잡힐 수 있습니다.",
      en: "Naming what you want and feel in one sentence can center a conversation.",
    }),
    work: Object.freeze({
      id: "sun-moon-conjunction-work",
      ko: "목표와 컨디션을 함께 고려해 오늘의 작업량을 정해 보세요.",
      en: "Set today's workload with both your goal and your condition in mind.",
    }),
    tip: Object.freeze({
      id: "sun-moon-conjunction-tip",
      ko: "해야 할 일과 하고 싶은 일을 구분해 적어 보세요.",
      en: "Write down what you need to do separately from what you want to do.",
    }),
  }),
  "mercury-saturn-square": Object.freeze({
    mood: Object.freeze({
      id: "mercury-saturn-square-mood",
      ko: "수성과 토성의 각은 생각을 현실적인 단위로 나누어 보라는 상징적 신호입니다.",
      en: "A Mercury–Saturn aspect symbolically suggests dividing thoughts into practical units.",
    }),
    relationship: Object.freeze({
      id: "mercury-saturn-square-relationship",
      ko: "무게 있는 주제일수록 결론보다 질문을 먼저 정리해 보세요.",
      en: "For a weighty topic, organize the questions before reaching a conclusion.",
    }),
    work: Object.freeze({
      id: "mercury-saturn-square-work",
      ko: "긴 작업은 마감과 중간 점검으로 나누면 다루기 쉬워집니다.",
      en: "Long work is easier to handle when divided by a deadline and checkpoints.",
    }),
    tip: Object.freeze({
      id: "mercury-saturn-square-tip",
      ko: "완벽한 표현보다 확인 가능한 다음 단계를 정해 보세요.",
      en: "Choose a verifiable next step instead of waiting for perfect wording.",
    }),
  }),
  "natal-transit-aspect": Object.freeze({
    mood: Object.freeze({
      id: "natal-transit-aspect-mood",
      ko: "현재 천체와 출생 차트의 각은 익숙한 반응을 새롭게 바라보는 상징적 참고값입니다.",
      en: "An aspect between the current sky and your birth chart is a symbolic reference for seeing familiar reactions anew.",
    }),
    relationship: Object.freeze({
      id: "natal-transit-aspect-relationship",
      ko: "상대에게서 반복되는 장면보다 내가 선택할 수 있는 반응을 먼저 살펴보세요.",
      en: "Look first at the response you can choose rather than a scene that keeps repeating with someone.",
    }),
    work: Object.freeze({
      id: "natal-transit-aspect-work",
      ko: "현재의 자극을 출생 차트의 익숙한 강점과 연결해 실제 행동으로 옮겨 보세요.",
      en: "Connect the current stimulus with a familiar strength in your birth chart and turn it into action.",
    }),
    tip: Object.freeze({
      id: "natal-transit-aspect-tip",
      ko: "개인화된 각은 가능성을 보여 주는 참고값이지 결과를 확정하는 규칙이 아닙니다.",
      en: "A personalized aspect is a possibility to consider, not a rule that fixes an outcome.",
    }),
  }),
  "day-branch-clash": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-clash-mood",
      ko: "오늘의 일지와 선택한 띠의 충은 익숙한 방식에 작은 조정이 필요하다는 상징으로 읽힙니다.",
      en: "A day-branch clash with your sign symbolically points to a small adjustment in familiar habits.",
    }),
    relationship: Object.freeze({
      id: "day-branch-clash-relationship",
      ko: "서로 다른 속도를 인정하고 약속의 기준을 다시 맞춰 보세요.",
      en: "Acknowledge different speeds and reset the terms of an agreement.",
    }),
    work: Object.freeze({
      id: "day-branch-clash-work",
      ko: "계획에 여유 칸을 두면 예상 밖의 변경을 다루기 쉬워집니다.",
      en: "Leaving space in the plan can make unexpected changes easier to handle.",
    }),
    tip: Object.freeze({
      id: "day-branch-clash-tip",
      ko: "오늘은 빠른 결정보다 한 번의 점검을 우선해 보세요.",
      en: "Today, give one review priority over a fast decision.",
    }),
  }),
  "day-branch-combination": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-combination-mood",
      ko: "오늘의 일지와 선택한 띠의 합은 서로 다른 요소를 연결해 보는 상징적 흐름입니다.",
      en: "A day-branch combination symbolically supports connecting different elements of the day.",
    }),
    relationship: Object.freeze({
      id: "day-branch-combination-relationship",
      ko: "혼자 판단하기보다 필요한 사람에게 의견을 묻는 것이 대화를 열어 줍니다.",
      en: "Asking the right person for input can open a conversation better than deciding alone.",
    }),
    work: Object.freeze({
      id: "day-branch-combination-work",
      ko: "서로 다른 작업을 연결하면 작은 진전이 다음 단계의 실마리가 될 수 있습니다.",
      en: "Connecting different tasks can turn a small step into a clue for what comes next.",
    }),
    tip: Object.freeze({
      id: "day-branch-combination-tip",
      ko: "협력할 부분과 혼자 할 부분을 구분해 적어 보세요.",
      en: "Write down which parts belong to collaboration and which belong to you alone.",
    }),
  }),
  "day-branch-trine": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-trine-mood",
      ko: "오늘의 일지와 선택한 띠의 삼합은 익숙한 강점을 묶어 보는 상징적 흐름입니다.",
      en: "A day-branch trine symbolically favors grouping familiar strengths.",
    }),
    relationship: Object.freeze({
      id: "day-branch-trine-relationship",
      ko: "이미 신뢰가 있는 사람과 한 단계 깊은 대화를 시도해 보세요.",
      en: "Try taking one trusted conversation a step deeper.",
    }),
    work: Object.freeze({
      id: "day-branch-trine-work",
      ko: "이미 잘하는 방식을 조합하면 작업의 연결성이 좋아질 수 있습니다.",
      en: "Combining methods you already know may improve the continuity of your work.",
    }),
    tip: Object.freeze({
      id: "day-branch-trine-tip",
      ko: "도움을 요청할 때는 원하는 결과를 구체적으로 말해 보세요.",
      en: "When asking for help, describe the outcome you want specifically.",
    }),
  }),
  "day-branch-punishment": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-punishment-mood",
      ko: "오늘의 형은 같은 패턴을 반복하지 않는지 살펴보라는 상징적 신호입니다.",
      en: "A day-branch punishment symbolically asks whether an old pattern is repeating.",
    }),
    relationship: Object.freeze({
      id: "day-branch-punishment-relationship",
      ko: "상대의 말보다 내가 반복하는 반응을 먼저 관찰해 보세요.",
      en: "Observe your own repeated response before focusing on the other person's words.",
    }),
    work: Object.freeze({
      id: "day-branch-punishment-work",
      ko: "문제가 생긴 지점보다 반복되는 순서를 기록하면 수정할 곳이 보입니다.",
      en: "Recording the repeated sequence can reveal where to adjust the process.",
    }),
    tip: Object.freeze({
      id: "day-branch-punishment-tip",
      ko: "오늘은 자기비판보다 패턴을 관찰하는 데 시간을 써 보세요.",
      en: "Spend today observing a pattern instead of criticizing yourself for it.",
    }),
  }),
  "day-branch-harm": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-harm-mood",
      ko: "오늘의 해는 겉으로 작아 보이는 신호도 살펴보라는 상징적 흐름입니다.",
      en: "A day-branch harm symbolically invites attention to signals that look small on the surface.",
    }),
    relationship: Object.freeze({
      id: "day-branch-harm-relationship",
      ko: "지나가는 말도 가볍게 넘기지 말고 필요한 맥락을 확인해 보세요.",
      en: "Do not dismiss a passing remark; check the context if it matters.",
    }),
    work: Object.freeze({
      id: "day-branch-harm-work",
      ko: "작은 누락을 찾는 점검이 큰 수정으로 번지는 일을 막아 줍니다.",
      en: "A check for small omissions can prevent a larger correction later.",
    }),
    tip: Object.freeze({
      id: "day-branch-harm-tip",
      ko: "오늘은 중요한 내용을 짧게 메모해 두는 편이 좋습니다.",
      en: "It helps to keep a short note of anything important today.",
    }),
  }),
  "day-branch-destruction": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-destruction-mood",
      ko: "오늘의 파는 오래 유지한 구조를 가볍게 다시 배열해 보는 상징적 신호입니다.",
      en: "A day-branch destruction symbolically invites a light rearrangement of an old structure.",
    }),
    relationship: Object.freeze({
      id: "day-branch-destruction-relationship",
      ko: "관계의 규칙을 당연하게 여기지 말고 지금 필요한 합의로 다시 말해 보세요.",
      en: "Restate relationship rules as the agreement needed now instead of taking them for granted.",
    }),
    work: Object.freeze({
      id: "day-branch-destruction-work",
      ko: "불필요한 단계를 줄이면 다음 작업을 위한 공간이 생길 수 있습니다.",
      en: "Removing an unnecessary step may create room for the next task.",
    }),
    tip: Object.freeze({
      id: "day-branch-destruction-tip",
      ko: "버릴 것과 남길 것을 나누는 간단한 정리를 시도해 보세요.",
      en: "Try a simple sort between what to keep and what to release.",
    }),
  }),
  "day-branch-void": Object.freeze({
    mood: Object.freeze({
      id: "day-branch-void-mood",
      ko: "공망 표시는 비어 있는 부분을 실패로 단정하지 말고 여백으로 살펴보라는 전통적 상징입니다.",
      en: "A void-branch marker is a traditional symbol for viewing an empty space as room, not failure.",
    }),
    relationship: Object.freeze({
      id: "day-branch-void-relationship",
      ko: "답이 바로 오지 않아도 관계의 의미를 서둘러 결론 내리지 마세요.",
      en: "If an answer does not arrive at once, avoid rushing to a conclusion about the relationship.",
    }),
    work: Object.freeze({
      id: "day-branch-void-work",
      ko: "완료되지 않은 일을 억지로 닫기보다 다음 확인 시점을 정해 두세요.",
      en: "Set the next check-in rather than forcing an unfinished task to close.",
    }),
    tip: Object.freeze({
      id: "day-branch-void-tip",
      ko: "비어 있는 시간을 회복이나 정리에 배정해 보세요.",
      en: "Consider assigning open time to recovery or organization.",
    }),
  }),
  "day-stage": Object.freeze({
    mood: Object.freeze({
      id: "day-stage-mood",
      ko: "일지와 선택한 띠의 십이운성은 오늘의 속도를 돌아보는 전통적 참고값입니다.",
      en: "The day-stage relation is a traditional reference for reflecting on today's pace.",
    }),
    relationship: Object.freeze({
      id: "day-stage-relationship",
      ko: "관계에서 지금 필요한 것이 시작인지 정리인지 차분히 구분해 보세요.",
      en: "Consider calmly whether the relationship needs a beginning or a reset now.",
    }),
    work: Object.freeze({
      id: "day-stage-work",
      ko: "속도를 올리기 전에 지금 작업이 어느 단계에 있는지 확인해 보세요.",
      en: "Before increasing speed, check which stage the work is actually in.",
    }),
    tip: Object.freeze({
      id: "day-stage-tip",
      ko: "오늘의 단계에 맞는 작은 행동 하나만 정해 보세요.",
      en: "Choose one small action that matches the stage of today.",
    }),
  }),
});

const STYLE_VARIANTS: Readonly<Record<ReadingSlot, readonly (readonly [string, string])[]>> = Object.freeze({
  mood: Object.freeze([
    ["현재의 감각을 실제 일정과 나란히 확인해 보세요.", "Check the present feeling beside your actual schedule."] as const,
    ["느낌과 사실을 나누어 적으면 신호가 더 또렷해질 수 있습니다.", "Separating feeling from fact may make the signal clearer."] as const,
    ["오늘의 상태를 이름 붙이기보다 한 장면으로 기록해 보세요.", "Record one scene from today instead of forcing a label onto your state."] as const,
  ]),
  relationship: Object.freeze([
    ["상대의 의도는 직접 확인하고, 자신의 경계도 함께 말해 보세요.", "Ask about the other person's intent directly and name your own boundary too."] as const,
    ["대화의 속도와 거리를 현실의 맥락에 맞춰 조정해 보세요.", "Adjust the pace and distance of the conversation to its real context."] as const,
    ["서로 다른 해석이 생기면 관찰한 사실부터 다시 맞춰 보세요.", "When interpretations differ, compare the observed facts again first."] as const,
  ]),
  work: Object.freeze([
    ["작은 확인 한 번을 다음 행동의 기준으로 삼아 보세요.", "Let one small check become the basis for the next action."] as const,
    ["결과를 서두르기보다 지금 통제할 수 있는 단계를 골라 보세요.", "Choose the step you can control now instead of rushing the result."] as const,
    ["완료 기준을 작게 정하면 다음 점검으로 이어가기 쉽습니다.", "A smaller definition of done can make the next check easier to reach."] as const,
  ]),
  tip: Object.freeze([
    ["해석은 참고로 두고, 중요한 판단은 현실의 자료로 확인하세요.", "Keep the reading as a reference and use real information for important decisions."] as const,
    ["오늘의 질문을 한 문장으로 남겨 두면 다음 선택을 돌아보기 쉽습니다.", "Leaving today's question in one sentence can make the next choice easier to review."] as const,
    ["지금 확인할 수 있는 사실 하나를 골라 다음 행동에 연결해 보세요.", "Choose one fact you can verify now and connect it to the next action."] as const,
  ]),
});

/**
 * 계산 신호가 고른 의미를 바꾸지 않고, 같은 의미 안에서만 문체를 변주한다.
 * variantIndex는 호출부가 날짜·별자리에서 결정론적으로 만들며, 이 함수는 시계를
 * 읽거나 난수를 만들지 않는다.
 */
export function fragmentFor(signalId: string, slot: ReadingSlot, variantIndex = 0): ReadingFragment {
  const base = SIGNAL_FRAGMENTS[signalId]?.[slot] ?? BASELINE_FRAGMENTS[slot];
  const variant = STYLE_VARIANTS[slot][variantIndex - 1];
  if (!variant) return base;
  return Object.freeze({
    id: `${base.id}-v${variantIndex}`,
    ko: `${base.ko} ${variant[0]}`,
    en: `${base.en} ${variant[1]}`,
  });
}
