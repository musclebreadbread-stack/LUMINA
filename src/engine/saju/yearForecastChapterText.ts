import type { LocalizedText } from "@engine/shared/explanation";
import type { ElementRole } from "./elements";
import type { BranchRelationKind } from "./relations";
import type { TenGod } from "./constants";

/**
 * Static bilingual reference text for the four domain chapters (work/wealth,
 * relationships, body/rhythm, learning/growth) added by Track B1. This mirrors
 * TEN_GOD_DETAILS/STAGE_DETAILS in explanations.ts — general, cultural, and
 * hedged against prediction — but reframed per life domain rather than per
 * individual Ten God or Stage, since a domain chapter groups several Ten
 * Gods/Stages into the same traditional lens (비겁/식상/재성/관성/인성 for Ten
 * Gods; a four-phase reading of the twelve Growth Stages). Content status:
 * pending expert (명리) review — see MONETIZATION-EXECUTION-PLAN.md Track B1.
 */

/** 십신 → 오행 역할(비겁/식상/재성/관성/인성) 매핑. elements.ts의 ElementRole 재사용. */
export const TEN_GOD_ROLE: Readonly<Record<TenGod, ElementRole>> = Object.freeze({
  비견: "self",
  겁재: "self",
  식신: "output",
  상관: "output",
  편재: "wealth",
  정재: "wealth",
  편관: "officer",
  정관: "officer",
  편인: "resource",
  정인: "resource",
});

/** 일과 재물(work) 챕터에서 오행 역할별로 쓰는 짧은 전통 해설. */
export const ROLE_WORK_BLURB: Readonly<Record<ElementRole, LocalizedText>> = Object.freeze({
  self: Object.freeze({
    ko: "비겁 계열은 동료와 나란히 서는 힘, 자원을 나누거나 지키는 감각과 연결해 온 전통 상징입니다. 일과 재물의 맥락에서는 협업 구조에서 자기 몫을 어떻게 정하는지, 경쟁을 압박이 아니라 자극으로 바꾸는 조건이 무엇인지 살펴보는 질문으로 씁니다. 소득이나 사업 성과를 보장하거나 예측하는 값이 아닙니다.",
    en: "The Companion group is traditionally linked to standing alongside peers and the sense of sharing or guarding resources. In a work-and-money context, use it to ask how you define your share within a collaborative structure and what turns competition into motivation rather than pressure. It does not forecast income or business results.",
  }),
  output: Object.freeze({
    ko: "식상 계열은 배운 것을 결과물로 바꾸고 꾸준히 표현하는 흐름을 상징해 온 전통 분류입니다. 일과 재물의 맥락에서는 만들어 내는 리듬과 휴식의 균형, 그리고 그 결과물을 실제 수입이나 성과로 연결하는 절차를 점검하는 질문으로 사용합니다. 창의성이나 생산성을 수치로 보장하지 않습니다.",
    en: "The Output group traditionally represents turning knowledge into a tangible result through sustained expression. For work and money, use it to check the balance between a productive rhythm and rest, and the concrete steps that connect what you make to real income or outcomes. It does not guarantee a level of creativity or productivity.",
  }),
  wealth: Object.freeze({
    ko: "재성 계열은 자원을 다루고 교환하는 방식과 가장 직접적으로 연결되어 온 전통 상징입니다. 일과 재물의 맥락에서는 고정된 몫을 관리하는 습관과 유동적인 기회를 살피는 감각을 함께 점검하는 질문으로 씁니다. 실제 소득·투자·지출 판단은 이 해석이 아니라 현실의 자료와 전문가 조언을 기준으로 해야 합니다.",
    en: "The Wealth group is traditionally the closest symbolic link to handling and exchanging resources. Use it to examine both the habits that manage a fixed share and the instincts that notice flexible opportunity. Real income, investment, or spending decisions should rely on real-world data and professional advice, not this reading.",
  }),
  officer: Object.freeze({
    ko: "관성 계열은 맡은 역할과 책임, 조직의 규칙을 지키는 반복 행동을 상징해 온 전통 분류입니다. 일의 맥락에서는 외부 요구와 자기 속도 사이에서 어떻게 경계를 세우는지, 규칙이 공정한지까지 함께 묻는 질문으로 사용합니다. 승진이나 지위를 예언하는 값이 아닙니다.",
    en: "The Officer group traditionally symbolizes holding a role, responsibility, and the repeated actions that keep an organization's rules. For work, use it to ask how you set boundaries between external demands and your own pace, and whether a given rule is actually fair. It does not predict promotion or status.",
  }),
  resource: Object.freeze({
    ko: "인성 계열은 배움과 보호, 안정된 기반을 상징해 온 전통 분류입니다. 일과 재물의 맥락에서는 어떤 지원 체계나 자격이 실제 성과로 이어지는지, 도움을 받는 것과 스스로 판단하는 것 사이의 균형을 살피는 질문으로 씁니다. 후원이나 안정성을 보장하는 값이 아닙니다.",
    en: "The Resource group traditionally symbolizes learning, protection, and a stable foundation. For work and money, use it to ask which support systems or credentials actually convert into results, and how to balance receiving help with independent judgment. It does not guarantee sponsorship or stability.",
  }),
});

/** 배움과 성장(growth) 챕터에서 오행 역할별로 쓰는 짧은 전통 해설. */
export const ROLE_GROWTH_BLURB: Readonly<Record<ElementRole, LocalizedText>> = Object.freeze({
  self: Object.freeze({
    ko: "비겁 계열은 자기 기준과 동료 관계를 상징해 온 전통 분류입니다. 배움의 맥락에서는 스터디 그룹이나 동료 학습에서 자신의 속도를 지키는 방법, 비교에서 오는 압박을 성장의 자극으로 바꾸는 조건을 살피는 질문으로 사용합니다.",
    en: "The Companion group traditionally symbolizes self-reference and peer relationships. For learning, use it to ask how you keep your own pace inside a study group and what turns comparison-driven pressure into a growth cue.",
  }),
  output: Object.freeze({
    ko: "식상 계열은 익힌 것을 표현하고 반복해 다지는 흐름을 상징해 온 전통 분류입니다. 배움과 성장의 맥락에서는 배운 내용을 직접 설명하거나 만들어 보는 연습이 이해를 얼마나 단단하게 하는지 살피는 질문으로 씁니다.",
    en: "The Output group traditionally symbolizes turning what you learn into expression through repetition. For learning and growth, use it to notice how much explaining or building something yourself deepens your understanding.",
  }),
  wealth: Object.freeze({
    ko: "재성 계열은 자원을 다루는 감각과 연결되지만, 배움의 맥락에서는 시간과 관심이라는 자원을 여러 관심사에 어떻게 배분하는지 살피는 질문으로 바꾸어 씁니다. 성과나 습득 속도를 보장하는 값이 아닙니다.",
    en: "The Wealth group is traditionally tied to handling resources; for learning, reframe it as a question about how you allocate the resources of time and attention across different interests. It does not guarantee outcomes or a particular learning speed.",
  }),
  officer: Object.freeze({
    ko: "관성 계열은 규칙과 책임을 지키는 반복 행동을 상징해 온 전통 분류입니다. 배움의 맥락에서는 정해진 커리큘럼이나 마감을 따르는 학습 방식이 자신에게 맞는지, 스스로 규칙을 정하는 학습과 어떻게 균형을 이루는지 살피는 질문으로 사용합니다.",
    en: "The Officer group traditionally symbolizes following rules and responsibility. For learning, use it to ask whether a structured curriculum or deadline-driven approach suits you, and how it balances against self-directed study.",
  }),
  resource: Object.freeze({
    ko: "인성 계열은 직접적인 배움과 안정된 지지 기반을 상징해 온 전통 분류이며, 배움과 성장의 맥락과 가장 가깝게 연결됩니다. 어떤 스승·자료·환경이 실제로 이해를 도왔는지 기록하고, 보호나 정답 의존이 스스로 판단하는 기회를 줄이고 있지는 않은지 함께 살펴보는 질문으로 씁니다.",
    en: "The Resource group traditionally symbolizes direct learning and a stable support base, the closest traditional link to this chapter's theme. Use it to note which mentors, materials, or environments actually helped you understand something, and to check whether relying on protection or ready answers is limiting your own judgment.",
  }),
});

/** 십이운성 12단계를 4개 국면으로 묶은 이 구현의 단순화 분류 — 유파 표준이 아니라 접근성을 위한 그룹핑. */
export type StagePhase = "rising" | "peak" | "declining" | "resting";

export const STAGE_PHASE: Readonly<Record<string, StagePhase>> = Object.freeze({
  장생: "rising",
  목욕: "rising",
  관대: "rising",
  건록: "peak",
  제왕: "peak",
  쇠: "declining",
  병: "declining",
  사: "declining",
  묘: "resting",
  절: "resting",
  태: "resting",
  양: "resting",
});

/** 몸과 리듬(wellbeing) 챕터에서 국면별로 쓰는 짧은 전통 해설. */
export const PHASE_WELLBEING_BLURB: Readonly<Record<StagePhase, LocalizedText>> = Object.freeze({
  rising: Object.freeze({
    ko: "이 시기의 십이운성은 새로운 기운이 자리를 잡고 바깥 자극을 받아들이며 역할을 시험해 보는 '성장기' 단계로 분류됩니다. 몸과 생활 리듬의 맥락에서는 새로운 습관을 무리 없이 늘려 가는 속도, 낯선 환경에 적응하는 데 필요한 회복 시간을 함께 살피는 질문으로 씁니다. 건강 상태를 진단하거나 예측하지 않습니다.",
    en: "The Growth Stage for this period falls in the 'rising' group — new energy taking root, absorbing outside stimulation, and testing a role. For body and daily rhythm, use it to check the pace at which you add new habits and the recovery time you need while adapting to unfamiliar settings. It does not diagnose or predict a health condition.",
  }),
  peak: Object.freeze({
    ko: "이 시기의 십이운성은 힘이 가장 크게 발휘되는 '전성기' 단계로 분류됩니다. 몸과 리듬의 맥락에서는 추진력을 어디에 쓸지 선택하는 감각과 함께, 과잉 확신이나 소진의 신호를 놓치지 않는지 살피는 질문으로 사용합니다. 최상의 컨디션을 보장하는 표지가 아닙니다.",
    en: "The Growth Stage for this period falls in the 'peak' group, when energy is at its most visible strength. For body and rhythm, use it to choose where to direct that drive while also watching for signs of overconfidence or exhaustion. It does not guarantee peak physical condition.",
  }),
  declining: Object.freeze({
    ko: "이 시기의 십이운성은 정점 이후 힘의 방향이 바뀌며 속도 조절과 정리가 필요해지는 '쇠퇴기' 단계로 분류됩니다. 몸과 리듬의 맥락에서는 익숙한 방식이 더 이상 맞지 않는 신호를 세심히 관찰하고 회복 자원을 미리 점검하는 질문으로 씁니다. 질병이나 쇠약을 예언하는 뜻이 아니며, 건강 판단은 전문 의료 기준을 따라야 합니다.",
    en: "The Growth Stage for this period falls in the 'declining' group, when energy changes direction after a peak and pacing or consolidation matters more. For body and rhythm, use it to notice signals that a familiar method no longer fits and to check your recovery resources in advance. It is not a prediction of illness, and health decisions belong to qualified clinical guidance.",
  }),
  resting: Object.freeze({
    ko: "이 시기의 십이운성은 경험이 저장되고 다음 흐름을 준비하는 '준비기' 단계로 분류됩니다. 몸과 리듬의 맥락에서는 눈에 보이는 성과보다 휴식과 재정비에 얼마나 시간을 내는지, 그 시간이 다음 단계의 바탕이 되는지를 살피는 질문으로 씁니다. 정체나 무기력을 확정하는 표지가 아닙니다.",
    en: "The Growth Stage for this period falls in the 'resting' group, when experience is stored and the next flow is being prepared. For body and rhythm, use it to ask how much time you give to rest and reorganizing rather than visible output, and whether that time is building a foundation for what comes next. It does not confirm stagnation or low energy.",
  }),
});

/** 관계(relationships) 챕터에서 원국 관계 종류별로 쓰는 짧은 전통 해설. */
export const RELATION_KIND_BLURB: Readonly<Record<BranchRelationKind, LocalizedText>> = Object.freeze({
  clash: Object.freeze({
    ko: "충은 두 지지가 정면으로 부딪히는 자리를 표시하는 전통 분류입니다. 관계의 맥락에서는 서로 다른 속도나 방향이 드러나는 순간, 그 마찰을 갈등으로 키울지 대화의 계기로 바꿀지를 스스로 선택하는 장면으로 읽습니다. 이별이나 다툼을 예언하는 표지가 아닙니다.",
    en: "Clash marks two branches in direct opposition, a traditional category. In relationships, read it as a moment when different paces or directions surface, and notice whether you turn that friction into conflict or into a chance to talk. It is not a prediction of a breakup or a fight.",
  }),
  combination: Object.freeze({
    ko: "육합은 두 지지가 짝을 이루어 합쳐지는 전통 분류입니다. 관계의 맥락에서는 자연스럽게 협력이 이루어지는 지점을 살피되, 맞춰 가는 과정에서 자신의 기준을 잃지 않는지도 함께 확인하는 장면으로 읽습니다. 궁합의 좋고 나쁨을 판정하지 않습니다.",
    en: "Combination marks two branches pairing and joining, a traditional category. In relationships, notice where cooperation comes naturally, while also checking that you are not losing your own standards while adapting to someone else. It does not rate compatibility as good or bad.",
  }),
  trine: Object.freeze({
    ko: "삼합은 세 지지가 모여 하나의 기운을 이루는 전통 분류입니다. 관계의 맥락에서는 여러 사람이 함께 만드는 공동체나 팀의 흐름을 살피는 장면으로 읽으며, 개인 간의 궁합을 확정하는 값이 아닙니다.",
    en: "Trine marks three branches converging into one combined energy, a traditional category. In relationships, read it as a lens on the flow of a group or team formed by several people, not a determination of one-on-one compatibility.",
  }),
  punishment: Object.freeze({
    ko: "형은 지지 사이의 긴장과 반복되는 마찰을 표시하는 전통 분류입니다. 관계의 맥락에서는 같은 문제가 되풀이될 때 규칙이나 기대치를 다시 점검해 보는 장면으로 읽습니다. 불행이나 형벌을 예언하는 뜻이 아닙니다.",
    en: "Punishment marks tension and recurring friction between branches, a traditional category. In relationships, read it as a cue to revisit rules or expectations when the same issue keeps returning. It is not a prediction of misfortune or punishment in the literal sense.",
  }),
  harm: Object.freeze({
    ko: "해는 지지 사이의 미묘한 불편함이나 어긋남을 표시하는 전통 분류입니다. 관계의 맥락에서는 뚜렷한 갈등이라기보다 작은 오해가 쌓이지 않도록 확인하는 습관을 살피는 장면으로 읽습니다.",
    en: "Harm marks a subtle discomfort or mismatch between branches, a traditional category. In relationships, read it less as overt conflict and more as a cue to check in before small misunderstandings accumulate.",
  }),
  destruction: Object.freeze({
    ko: "파는 지지 사이의 흐름이 깨지거나 계획이 틀어지는 전통 분류입니다. 관계의 맥락에서는 일정이나 합의가 예상과 달라질 때 유연하게 조정하는 태도를 살피는 장면으로 읽습니다. 관계의 파탄을 예언하는 뜻이 아닙니다.",
    en: "Destruction marks a break in flow or a plan going off course between branches, a traditional category. In relationships, read it as a cue to notice how flexibly you adjust when a schedule or agreement changes. It is not a prediction that a relationship will end.",
  }),
});

export const NO_NATAL_RELATION_BLURB: LocalizedText = Object.freeze({
  ko: "이번 세운 지지와 원국 지지 사이에서 현재 엔진의 관계표에 정의된 조합은 확인되지 않았습니다. 이는 특정 규칙의 조회 결과일 뿐이며, 실제 관계의 좋고 나쁨을 판정하지 않습니다.",
  en: "No relation-table combination defined by the current engine was found between this year's branch and the supplied natal branches. This reflects only a rule lookup and makes no judgment about real relationships.",
});
