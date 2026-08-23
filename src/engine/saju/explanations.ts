import type { Citation } from "@engine/shared/citation";
import {
  freezeExplanationBlock,
  type ExplanationBlock,
  type LocalizedText,
} from "@engine/shared/explanation";
import {
  TEN_GOD_LABEL,
  TEN_GODS,
  TWELVE_STAGE_EN,
  TWELVE_STAGES,
  branchAt,
  stemAt,
  type TenGod,
} from "./constants";
import {
  CLASSICAL_BAZI_LINEAGE,
  SAJU_CALCULATION_CITATIONS,
  SAJU_TRADITION_CITATIONS,
} from "./citations";
import type { LuckDirection, LuckPeriod } from "./luck";
import type { DayBoundaryRule } from "./pillars";

const CULTURAL_TIER = "cultural" as const;

const TEN_GOD_DETAILS: readonly LocalizedText[] = Object.freeze([
  Object.freeze({
    ko: "비견은 일간과 같은 오행·같은 음양의 관계를 가리킵니다. 전통 해석에서는 자기 기준, 동료성, 나란히 서는 힘을 살피는 언어로 사용합니다. 원국에 비견이 보인다는 사실만으로 독립적이거나 경쟁적인 사람이라고 단정하지 않고, 자원을 나누거나 같은 목표를 가진 사람과 협력하는 장면에서 어떤 선택을 하는지 관찰하는 것이 안전합니다.",
    en: "Friend describes a stem with the same element and polarity as the Day Master. Traditional readings use it as language for self-reference, peers, and standing alongside others. Its presence does not prove independence or competitiveness. Observe how you share resources, negotiate equal footing, and cooperate with people pursuing a similar goal rather than treating the label as a fixed personality claim.",
  }),
  Object.freeze({
    ko: "겁재는 일간과 같은 오행이지만 음양이 다른 관계입니다. 전통적으로는 동료와의 경쟁, 자원 분배, 빠르게 움직이는 결단의 상징으로 읽어 왔습니다. 그러나 숫자가 많다고 손실이나 갈등을 예언하는 것은 아닙니다. 공동 자원과 개인 몫을 구분해야 하는 상황에서 기준을 어떻게 세우는지, 경쟁을 협력으로 바꾸는 조건이 무엇인지 성찰하는 문장으로 사용합니다.",
    en: "Rob Wealth is the same element as the Day Master with opposite polarity. Traditional language associates it with competition among peers, sharing or dividing resources, and quick decisions. A count does not predict loss or conflict. Use it as a reflection lens for how you distinguish shared resources from personal ownership and which conditions help you turn rivalry into cooperation.",
  }),
  Object.freeze({
    ko: "식신은 일간이 생하는 오행이며 음양이 같은 관계입니다. 전통 해석에서는 표현, 생산, 돌봄, 반복 가능한 즐거움의 흐름을 상징합니다. 식신이 있다고 창의성이나 풍요가 보장되는 것은 아니며, 자신이 알고 있는 것을 천천히 익히고 결과물로 바꾸는 과정에서 어떤 리듬이 지속되는지를 살펴보는 편이 적절합니다. 휴식과 생산의 균형도 함께 기록해 보세요.",
    en: "Eating God is an output element with the same polarity as the Day Master. Traditional readings connect it with expression, production, care, and sustainable enjoyment. It does not guarantee creativity or abundance. Notice which rhythms help you turn what you know into a tangible result without exhausting yourself, and observe how rest supports rather than opposes that process.",
  }),
  Object.freeze({
    ko: "상관은 일간이 생하는 오행이며 음양이 다른 관계입니다. 전통적으로는 규칙을 다시 보고, 기존 표현을 비틀고, 말과 창작으로 바깥에 영향을 주는 상징으로 설명합니다. 권위에 반항하거나 관계를 깨뜨린다는 결정론적 해석은 피해야 합니다. 개선이 필요한 규칙을 발견했을 때 비판을 제안으로 바꾸는 방법과 표현의 책임을 살피는 데 활용합니다.",
    en: "Hurting Officer is an output element with opposite polarity to the Day Master. Traditional language links it with questioning rules, bending familiar forms, and influencing the outside world through speech or creation. It does not predict rebellion or broken relationships. Reflect on how you turn criticism into a workable proposal and how you take responsibility for the impact of expression.",
  }),
  Object.freeze({
    ko: "편재는 일간이 극하는 오행이며 음양이 같은 관계입니다. 전통 해석에서는 유동적인 기회, 거래, 넓은 네트워크, 한곳에 고정되지 않는 자원 운용을 비유하는 말입니다. 재물의 획득이나 투자 결과를 예언하지 않으며, 여러 선택지 사이에서 시간·돈·관심을 어떻게 배분하는지를 돌아보는 질문으로 사용합니다. 불확실성이 큰 결정은 별도의 현실 자료로 판단해야 합니다.",
    en: "Indirect Wealth is a resource managed by the Day Master with the same polarity. Traditional readings use it as a metaphor for flexible opportunity, exchange, broad networks, and resources that move between contexts. It does not forecast money or investment outcomes. Reflect on how you allocate time, money, and attention across options, using real-world evidence for consequential decisions.",
  }),
  Object.freeze({
    ko: "정재는 일간이 극하는 오행이며 음양이 다른 관계입니다. 전통적으로는 정해진 몫, 반복되는 책임, 예측 가능한 관리와 교환의 상징으로 읽습니다. 성실함이나 부를 보장하는 표지가 아니고, 약속과 예산을 꾸준히 운영하는 방식이 어떤 환경에서 잘 작동하는지 살피는 틀입니다. 금전 판단은 이 해석이 아니라 계약·현금흐름·전문 조언을 기준으로 하세요.",
    en: "Direct Wealth is a resource controlled by the Day Master with opposite polarity. Traditional language associates it with defined shares, recurring responsibility, predictable management, and exchange. It does not guarantee diligence or wealth. Use it to examine which environments help you maintain agreements and budgets, while relying on contracts, cash flow, and professional advice for financial decisions.",
  }),
  Object.freeze({
    ko: "편관 또는 칠살은 일간을 극하는 오행이며 음양이 같은 관계입니다. 전통 해석에서는 압박, 경쟁, 빠른 대응, 강한 외부 요구를 상징하는 언어로 사용합니다. 위험이나 불행을 예언하는 이름이 아니며, 긴장이 높은 상황에서 경계를 세우고 책임을 분배하는 방식을 관찰하는 데 의미가 있습니다. 안전과 법률에 관련된 판단은 반드시 현실의 기준과 전문가를 따르세요.",
    en: "Seven Killings is an officer element with the same polarity as the Day Master. Traditional readings use it for pressure, competition, rapid response, and strong external demands. Its name is not a prediction of danger or misfortune. Reflect on how you set boundaries and distribute responsibility under pressure, and use real safety and professional standards for high-stakes decisions.",
  }),
  Object.freeze({
    ko: "정관은 일간을 극하는 오행이며 음양이 다른 관계입니다. 전통적으로는 규범, 역할, 제도, 신뢰를 쌓는 반복 행동을 상징합니다. 지위나 성공을 보장하는 값이 아니며, 공동체의 규칙을 이해하고 그 안에서 책임과 자율성을 조율하는 방식으로 읽는 것이 적절합니다. 규칙이 공정한지, 수정이 필요한지까지 함께 질문하면 해석이 결정론에 머무르지 않습니다.",
    en: "Direct Officer is an officer element with opposite polarity to the Day Master. Traditional language associates it with norms, roles, institutions, and repeated actions that build trust. It does not guarantee status or success. Use it to consider how you understand shared rules and balance responsibility with autonomy, including whether a rule is fair or needs revision.",
  }),
  Object.freeze({
    ko: "편인은 일간을 생하는 오행이며 음양이 같은 관계입니다. 전통 해석에서는 간접적인 배움, 직관적 연결, 익숙한 교육 경로 밖에서 얻는 정보와 회복의 자원을 비유합니다. 현실 감각이 부족하거나 고립된다는 결론을 내리지 않으며, 어떤 자료와 멘토가 새로운 관점을 열어 주는지 살피는 질문으로 사용합니다. 출처를 확인하고 검증하는 습관이 해석의 균형을 잡아 줍니다.",
    en: "Indirect Resource is a resource element that generates the Day Master with the same polarity. Traditional readings use it as a metaphor for indirect learning, intuitive connections, information outside a familiar curriculum, and restorative resources. It does not prove impracticality or isolation. Notice which sources and mentors open a new perspective, and keep the habit of checking evidence.",
  }),
  Object.freeze({
    ko: "정인은 일간을 생하는 오행이며 음양이 다른 관계입니다. 전통적으로는 직접적인 배움, 보호, 문서와 자격, 안정된 지지 기반을 상징합니다. 도움을 받거나 학습을 잘한다는 사실을 보장하지 않으며, 지식과 돌봄을 실제 행동으로 연결하는 조건을 살피는 틀입니다. 보호가 과해 스스로 판단할 기회를 줄이고 있지는 않은지도 함께 관찰해 보세요.",
    en: "Direct Resource is a resource element that generates the Day Master with opposite polarity. Traditional language associates it with direct learning, protection, documents or credentials, and a stable support base. It does not guarantee aptitude or help. Reflect on the conditions that turn knowledge and care into action, and notice whether protection is reducing opportunities for independent judgment.",
  }),
]);

const STAGE_DETAILS: readonly LocalizedText[] = Object.freeze([
  Object.freeze({ ko: "장생은 새로운 기운이 태어나고 자리를 잡는다는 비유입니다. 시작을 서두르기보다 무엇을 기를지 정하고 작은 반복을 만드는 단계로 읽습니다. 건강·수명·사건을 예언하는 값이 아니며, 실제 계획에서는 현재 자원과 환경을 함께 확인해야 합니다.", en: "Growth is a metaphor for new energy taking root. Read it as an invitation to choose what to cultivate and build a small repeatable practice rather than rushing the first step. It is not a prediction about health, lifespan, or events; real planning still depends on present resources and context." }),
  Object.freeze({ ko: "목욕은 외부 자극을 경험하며 자신을 정돈하는 전환의 비유입니다. 새로운 관계와 환경에서 배운 것을 씻어 내고 다시 선택하는 감각을 살핍니다. 불안정하거나 방탕하다는 단정은 전통 용어를 과장한 것이며, 실제 의미는 변화에 대한 자기 관찰에 둡니다.", en: "Bath is a metaphor for transition, exposure to outside stimulation, and re-ordering the self. Notice what you learn in new relationships or environments and what you choose again after the experience. Calling it unstable or indulgent overstates the traditional label; the useful reading is observation during change." }),
  Object.freeze({ ko: "관대는 준비된 힘이 겉으로 드러나 사회적 역할을 시험하는 비유입니다. 능력을 보여 주는 것과 타인의 기대에 맞추는 것을 구분하며, 어떤 무대에서 자신이 편안한지 살핍니다. 명예나 성공을 보장하는 표지가 아니고 역할과 자원을 조율하는 상징입니다.", en: "Cap represents prepared energy becoming visible and testing a social role. Distinguish showing a capability from conforming to someone else's expectations, and notice which stage or setting feels sustainable. It does not guarantee honor or success; it is a symbolic lens for aligning roles and resources." }),
  Object.freeze({ ko: "건록은 자기 힘으로 역할을 수행하고 기반을 세우는 비유입니다. 독립성과 책임이 함께 커지는 시기로 읽되, 혼자 모든 것을 감당해야 한다는 뜻으로 확대하지 않습니다. 협력 구조와 휴식이 있어야 지속 가능한 성취가 된다는 점을 함께 기록합니다.", en: "Prosperity is a metaphor for performing a role with one's own resources and building a foundation. Read it as growing independence together with responsibility, not as a command to carry everything alone. Sustainable achievement also needs cooperation and recovery, so include those conditions in the reflection." }),
  Object.freeze({ ko: "제왕은 기운이 가장 크게 펼쳐지는 정점의 비유입니다. 추진력과 영향력을 살피면서도 과잉 확신과 소진의 신호를 함께 확인합니다. 최강이나 승리를 보장하지 않으며, 힘을 어디에 쓰고 언제 속도를 낮출지를 선택하는 상징입니다.", en: "Peak is a metaphor for energy reaching a visible high point. Observe initiative and influence while also checking for overconfidence or exhaustion. It does not guarantee victory or superiority; it asks where to spend strength and when to reduce speed." }),
  Object.freeze({ ko: "쇠는 정점 이후 힘의 방향이 바뀌고 정리와 선별이 중요해지는 비유입니다. 덜어 낼 것과 남길 것을 구분하며 경험을 구조화하는 흐름으로 읽습니다. 쇠퇴나 실패를 확정하는 말이 아니며, 변화에 맞춰 전략을 다시 짜는 자기성찰의 언어입니다.", en: "Decline is a metaphor for energy changing direction after a peak, making editing and selection important. Read it as distinguishing what to release from what to retain and structuring experience. It does not confirm failure; it is a reflection language for revising strategy as conditions change." }),
  Object.freeze({ ko: "병은 민감함과 속도 조절이 필요하다는 비유입니다. 익숙한 방식이 더 이상 맞지 않는 신호를 세심하게 관찰하고 회복 자원을 점검합니다. 질병이나 의료적 상태를 뜻하지 않으며, 건강 판단은 전문 의료 기준을 따라야 합니다.", en: "Illness is a metaphor for sensitivity and the need to regulate pace. Notice signals that a familiar method no longer fits and check the resources that support recovery. It does not refer to a medical condition; health decisions belong to qualified clinical guidance." }),
  Object.freeze({ ko: "사는 한 주기가 마무리되고 형태가 바뀌는 경계의 비유입니다. 끝을 재난으로 읽기보다 정리, 애도, 전환, 다음 선택을 준비하는 장면으로 살핍니다. 죽음이나 수명을 예언하는 뜻이 아니며, 공포를 만드는 해석을 거부합니다.", en: "Death is a metaphor for a cycle ending and changing form. Read it as a scene for closure, grief, transition, and preparing the next choice rather than as disaster. It is not a prediction of death or lifespan, and frightening deterministic readings are rejected." }),
  Object.freeze({ ko: "묘는 경험과 자원이 저장되고 숙성되는 비유입니다. 당장 드러나는 결과보다 보관된 지식과 감정을 언제 꺼내 쓸지 살핍니다. 막힘이나 고립을 확정하는 값이 아니며, 축적과 공유의 균형을 생각하는 상징입니다.", en: "Tomb is a metaphor for experience and resources being stored and matured. Notice when preserved knowledge or emotion is ready to be used rather than judging only visible results. It does not confirm blockage or isolation; it invites reflection on the balance between keeping and sharing." }),
  Object.freeze({ ko: "절은 기존 흐름과의 연결이 끊기고 새 방향을 선택하는 단절의 비유입니다. 익숙한 정체성을 내려놓고 무엇을 다시 시작할지 분명히 하는 장면으로 읽습니다. 무조건적인 불운이나 상실을 예언하지 않으며, 실제 변화는 선택과 환경의 영향을 받습니다.", en: "Extinction is a metaphor for a break from an established flow and choosing a new direction. Read it as clarifying what to release and what to begin again. It does not predict bad luck or loss; real change depends on choices and circumstances." }),
  Object.freeze({ ko: "태는 아직 드러나지 않은 가능성이 형태를 얻기 시작하는 비유입니다. 계획을 보호하고 충분히 익히는 시간을 살피되, 가능성을 결과로 착각하지 않습니다. 작은 실험과 현실의 피드백이 있어야 잠재력이 실제 행동으로 이어집니다.", en: "Gestation is a metaphor for an unseen possibility beginning to take form. Protect a plan while it develops, but do not confuse possibility with an outcome. Small experiments and feedback from reality are what allow potential to become action." }),
  Object.freeze({ ko: "양은 외부의 돌봄과 내부의 준비가 함께 자라는 비유입니다. 도움을 받는 것과 의존하는 것을 구분하고, 다음 단계에 필요한 기반을 천천히 마련합니다. 보호받는 운명이나 유아성을 단정하는 값이 아니라 성장 조건을 살피는 상징입니다.", en: "Nurture is a metaphor for care from outside and preparation within growing together. Distinguish receiving support from surrendering agency, and build the foundation needed for the next stage. It does not define a protected destiny or immaturity; it is a lens for examining conditions of growth." }),
]);

const PILLAR_TEXT: Readonly<Record<"hour" | "day" | "month" | "year", LocalizedText>> = Object.freeze({
  hour: Object.freeze({ ko: "시주는 늦은 삶의 방향과 표현하고 싶은 결과를 비유하는 자리입니다. 자녀나 미래를 결정하는 예언으로 읽지 않고, 시간이 지나며 무엇을 남기고 싶은지 성찰하는 렌즈로 사용합니다.", en: "The Hour Pillar is traditionally used as a lens for later-life direction and what one wants to express or leave behind. It does not determine children or the future; use it to reflect on what you want to develop over time." }),
  day: Object.freeze({ ko: "일주는 일간과 일지로 구성되며 자기 감각과 가까운 관계를 살피는 중심 자리입니다. 배우자나 성격을 단정하지 않고, 자신과 타인의 경계를 어떤 방식으로 조율하는지 관찰하는 출발점으로 삼습니다.", en: "The Day Pillar contains the Day Master and Day Branch and is traditionally treated as close to self-experience and intimate relationships. It does not determine a spouse or personality; use it as a starting point for observing boundaries and reciprocity." }),
  month: Object.freeze({ ko: "월주는 계절의 절기와 사회적 환경의 상징이 겹치는 자리입니다. 전통 해석에서 계절적 힘과 성장기의 구조를 읽지만, 직업·가족·사회적 지위를 결정한다고 보지 않습니다. 현재 환경이 어떤 자원을 주는지 확인하는 데 활용합니다.", en: "The Month Pillar combines seasonal solar-term context with a traditional lens on social environment and formative structure. It does not determine career, family, or status. Use it to ask which resources and constraints your current environment actually provides." }),
  year: Object.freeze({ ko: "연주는 뿌리, 초기 환경, 넓은 공동체와의 연결을 비유하는 자리입니다. 가족 배경이나 어린 시절을 고정된 운명으로 만들지 않고, 물려받은 이야기와 현재의 선택이 어디에서 만나는지 살피는 렌즈로 사용합니다.", en: "The Year Pillar is traditionally used as a metaphor for roots, early context, and connection with a wider community. It does not fix family background or childhood into destiny; use it to notice where inherited stories meet present choices." }),
});

const LABELS: Readonly<Record<"hour" | "day" | "month" | "year", LocalizedText>> = Object.freeze({
  hour: Object.freeze({ ko: "시주", en: "Hour Pillar" }),
  day: Object.freeze({ ko: "일주", en: "Day Pillar" }),
  month: Object.freeze({ ko: "월주", en: "Month Pillar" }),
  year: Object.freeze({ ko: "연주", en: "Year Pillar" }),
});

const STAGE_EVIDENCE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  장생: "growth",
  목욕: "bath",
  관대: "cap",
  건록: "prosperity",
  제왕: "peak",
  쇠: "decline",
  병: "illness",
  사: "death",
  묘: "tomb",
  절: "extinction",
  태: "gestation",
  양: "nurture",
});

export function stageEvidenceRef(stage: string): string {
  return `saju-stage-${STAGE_EVIDENCE_KEYS[stage] ?? "unknown"}`;
}

function block(input: Omit<ExplanationBlock, "tier">): ExplanationBlock {
  return freezeExplanationBlock({ ...input, tier: CULTURAL_TIER });
}

export function sajuMethodExplanation(dayBoundaryRule: DayBoundaryRule = "zi23"): ExplanationBlock {
  const boundaryKo = dayBoundaryRule === "zi23" ? "23시 야자시론" : "자정 경계론";
  const boundaryEn = dayBoundaryRule === "zi23" ? "the 23:00 late-Zi rule" : "the midnight boundary rule";
  return block({
    id: "saju-method",
    summary: Object.freeze({
      ko: "사주는 절기·율리우스 적일·진태양시를 분리해 계산하고, 해석은 전통적 상징 언어로 별도 표시합니다.",
      en: "LUMINA separates solar-term, Julian-day, and true-solar-time calculations from traditional symbolic interpretation.",
    }),
    detail: Object.freeze({
      ko: `연주와 월주는 태양의 겉보기 황경이 절입 각도를 통과한 순간인 절기를 기준으로 정합니다. 일주는 그레고리력 날짜를 율리우스 적일로 바꾸어 60갑자 주기를 적용하고, 시주는 출생지 경도 보정과 균시차를 반영한 진태양시로 계산합니다. 음력은 양력으로 변환한 뒤 같은 절차를 사용하며, 표시된 음력 날짜는 참고값입니다. 이번 결과에는 ${boundaryKo}을 적용했습니다. 이 값들은 재현 가능한 계산 결과이고, 그 위에 얹는 십신·십이운성의 의미는 경험적으로 검증된 예측이 아닌 문화적 해석입니다.`,
      en: `The Year and Month Pillars use solar terms: the instant when the Sun's apparent longitude reaches the relevant seasonal angle. The Day Pillar converts the Gregorian date to a Julian day number and applies the sexagenary cycle. The Hour Pillar uses true solar time after longitude correction and the equation of time. Lunar input is converted to solar input before the same procedure, and the displayed lunar date is for reference. This result applies ${boundaryEn}. These are reproducible calculations; the meanings attached to Ten Gods and Growth Stages remain cultural interpretations, not empirically verified predictions.`,
    }),
    method: Object.freeze({
      ko: "사용한 계산 계보는 astronomy-engine의 태양 위치, JDN 60주기, lunar-javascript와의 독립 교차검증입니다. 이 저장소의 고정 테스트에는 lunar-javascript 대비 사주 436개 케이스가 포함되어 모두 일치합니다. 절입·자시 경계와 유파에 따라 결과가 달라질 수 있으므로, 경계 플래그와 적용 규칙을 함께 공개합니다.",
      en: "The calculation lineage uses Astronomy Engine for solar position, a Julian-day 60-cycle rule, and independent cross-validation against lunar-javascript. The repository's fixed suite contains 436 Saju cases and all currently agree with that oracle. Boundary cases and schools can differ, so LUMINA exposes the applied rule and boundary flags instead of presenting one convention as universal.",
    }),
    evidenceRefs: Object.freeze(["saju-calculation-record"]),
    citations: Object.freeze([...SAJU_CALCULATION_CITATIONS]),
  });
}

export function pillarExplanation(key: "hour" | "day" | "month" | "year"): ExplanationBlock {
  const label = LABELS[key];
  return block({
    id: `saju-pillar-${key}`,
    summary: Object.freeze({ ko: `${label.ko}: ${PILLAR_TEXT[key].ko}`, en: `${label.en}: ${PILLAR_TEXT[key].en}` }),
    detail: PILLAR_TEXT[key],
    method: Object.freeze({
      ko: "이 설명은 해당 기둥의 계산 위치와 전통적인 영역 언어를 병치한 것입니다. 기둥 하나만으로 성격, 관계, 직업 또는 사건을 확정하지 않습니다.",
      en: "This block places the calculated pillar position beside its traditional domain language. One pillar cannot determine personality, relationships, career, or events.",
    }),
    evidenceRefs: Object.freeze(["saju-pillars"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
  });
}

export function tenGodExplanation(god: TenGod, count = 0): ExplanationBlock {
  const index = TEN_GODS.indexOf(god);
  const detail = TEN_GOD_DETAILS[index] ?? TEN_GOD_DETAILS[0]!;
  const label = TEN_GOD_LABEL[god];
  return block({
    id: `saju-ten-god-${god}`,
    summary: Object.freeze({
      ko: `${label.ko}(${label.hanja}) · 원국 표시 ${count}회 — ${detail.ko.split(".")[0] ?? detail.ko}`,
      en: `${label.en} (${label.hanja}) · ${count} occurrence${count === 1 ? "" : "s"} — ${detail.en.split(".")[0] ?? detail.en}`,
    }),
    detail,
    method: Object.freeze({
      ko: "십신은 일간과 대상 천간의 오행 관계(같음·생함·극함)와 음양의 같고 다름을 조합해 판정합니다. 지지는 자리의 음양이 아니라 정기 지장간을 기준으로 판정합니다. 문헌마다 이름과 강조점이 다를 수 있습니다.",
      en: "Ten Gods combine the Day Master's Five-Element relationship to a target stem (same, generating, controlling, or being controlled) with matching or opposite polarity. A branch uses its principal Hidden Stem rather than its positional polarity. Names and emphases vary across texts.",
    }),
    evidenceRefs: Object.freeze(["saju-tengods"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
  });
}

export function stageExplanation(stage: string): ExplanationBlock {
  const index = TWELVE_STAGES.indexOf(stage);
  const detail = STAGE_DETAILS[index] ?? STAGE_DETAILS[0]!;
  const en = TWELVE_STAGE_EN[stage] ?? stage;
  return block({
    id: `saju-stage-${stage}`,
    summary: Object.freeze({ ko: `${stage}: ${detail.ko.split(".")[0] ?? detail.ko}`, en: `${en}: ${detail.en.split(".")[0] ?? detail.en}` }),
    detail,
    method: Object.freeze({
      ko: "십이운성은 일간의 천간과 각 지지의 위치를 12단계 비유로 매핑한 값입니다. 병·사 같은 명칭은 상징적 용어이며 건강·수명·죽음을 예측하는 의학적 지표가 아닙니다.",
      en: "The Twelve Growth Stages map the Day Master's stem to a branch through a twelve-step life-cycle metaphor. Terms such as Illness and Death are symbolic labels, not medical, lifespan, or mortality indicators.",
    }),
    evidenceRefs: Object.freeze([stageEvidenceRef(stage)]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
  });
}

export function strengthExplanation(input: {
  readonly ratio: number;
  readonly verdict: "strong" | "balanced" | "weak";
  readonly seasonal: boolean;
  readonly root: boolean;
  readonly peer: boolean;
}): ExplanationBlock {
  const ratio = (input.ratio * 100).toFixed(1);
  const flags = `${input.seasonal ? "득령" : "무득령"} · ${input.root ? "득지" : "무득지"} · ${input.peer ? "득세" : "무득세"}`;
  return block({
    id: "saju-strength",
    summary: Object.freeze({
      ko: `일간 지원 비율 ${ratio}%와 ${flags}를 함께 본 결과, 현재 규칙에서는 ${input.verdict === "strong" ? "신강" : input.verdict === "weak" ? "신약" : "중화"}으로 분류됩니다.`,
      en: `The supporting ratio is ${ratio}% with ${input.seasonal ? "seasonal" : "no seasonal"}, ${input.root ? "root" : "no root"}, and ${input.peer ? "broad" : "no broad"} support; the applied rule classifies it as ${input.verdict}.`,
    }),
    detail: Object.freeze({
      ko: "지원 비율은 일간과 같은 오행인 비겁, 일간을 생하는 인성의 가중 합을 분자로 삼고, 나머지 오행의 가중 합을 함께 비교한 값입니다. 일간 자신은 항상 한 글자이므로 지원 합에서 1을 빼 정보량을 조정합니다. 득령은 월지, 득지는 일지, 득세는 나머지 글자에서 돕는 오행이 과반인지 보는 보조 플래그입니다. 이 판정은 재현 가능한 플랫폼 규칙이지 사람의 강약이나 가치의 서열이 아닙니다.",
      en: "The supporting ratio uses the weighted sum of the Day Master's own element and the Resource element in the numerator, compared with the remaining weighted elements. One point for the Day Master itself is subtracted because it is always present and therefore adds little information. Seasonal support reads the Month Branch, root support reads the Day Branch, and broad support asks whether helping elements are a majority among the remaining characters. This is a reproducible platform rule, not a ranking of a person's strength or worth.",
    }),
    method: Object.freeze({
      ko: "임계값은 ratio > 0.55이면 신강, ratio < 0.45이면 신약, 0.45 이상 0.55 이하이면 중화입니다. 경계값은 유파마다 다르며, 이 구현은 경계에서 단정하지 않도록 중화 구간을 둡니다.",
      en: "The thresholds are: ratio > 0.55 for strong, ratio < 0.45 for weak, and 0.45 through 0.55 inclusive for balanced. Schools vary on these cutoffs; this implementation keeps a neutral band rather than forcing a close case into one side.",
    }),
    evidenceRefs: Object.freeze(["saju-strength-ratio"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
  });
}

export function voidExplanation(voidLabel: string): ExplanationBlock {
  return block({
    id: "saju-void",
    summary: Object.freeze({
      ko: `공망은 일주가 속한 순에서 짝을 이루지 못한 두 지지를 표시하며, 현재 결과에서는 ${voidLabel}입니다.`,
      en: `Void marks the two branches not paired within the Day Pillar's ten-day sequence; this chart shows ${voidLabel}.`,
    }),
    detail: Object.freeze({
      ko: "공망은 60갑자를 10일 단위의 순으로 나누었을 때 해당 순에 들어오지 않는 두 지지를 산출하는 규칙입니다. 전통 해석에서는 비어 있음, 지연, 비집착, 상징적 공백 등 여러 비유로 읽으며 유파마다 강조점이 크게 다릅니다. 공망이 있다고 관계·재산·수명에 결핍이 생긴다고 단정하지 않습니다. 실제 계획에서는 계산된 지지 자체와 현실의 선택을 분리해 살펴보세요.",
      en: "Void is calculated by dividing the 60-day cycle into ten-day sequences and finding the two branches not included in the Day Pillar's sequence. Traditional schools read it through several metaphors, including absence, delay, non-attachment, or symbolic space, and their emphases differ. It does not establish deficiency in relationships, wealth, or lifespan. Keep the calculated branches separate from real-world choices and evidence.",
    }),
    method: Object.freeze({
      ko: "일주의 60갑자 index에서 순의 시작을 구하고, 해당 순의 열 칸 뒤에 남는 두 지지를 12지지에 매핑했습니다. 결과는 문화적 분류이며 예측 확률이 아닙니다.",
      en: "The implementation finds the start of the Day Pillar's ten-day sequence from its sexagenary index, then maps the two remaining branches in the twelve-branch cycle. It is a cultural classification, not a probability of future events.",
    }),
    evidenceRefs: Object.freeze(["saju-void"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
  });
}

export function luckExplanation(period: LuckPeriod, direction: LuckDirection): ExplanationBlock {
  const stem = stemAt(period.pillar.stem);
  const branch = branchAt(period.pillar.branch);
  const stemGod = TEN_GOD_LABEL[period.stemTenGod];
  const branchGod = TEN_GOD_LABEL[period.branchTenGod];
  const stage = TWELVE_STAGE_EN[period.stage] ?? period.stage;
  const directionKo = direction === "forward" ? "순행" : "역행";
  const directionEn = direction === "forward" ? "forward" : "reverse";

  return block({
    id: `saju-luck-${period.ordinal}`,
    summary: Object.freeze({
      ko: `${period.ordinal + 1}번째 대운 ${stem.hanja}${branch.hanja} · ${period.fromAge}~${period.toAge}세`,
      en: `${period.ordinal + 1}${period.ordinal === 0 ? "st" : period.ordinal === 1 ? "nd" : period.ordinal === 2 ? "rd" : "th"} Major Luck ${stem.en}${branch.en} · ages ${period.fromAge}–${period.toAge}`,
    }),
    detail: Object.freeze({
      ko: `이 대운은 월주에서 ${directionKo}으로 ${period.ordinal + 1}칸째 이동한 ${stem.hanja}${branch.hanja}입니다. ${period.fromAge}세부터 ${period.toAge}세 직전까지의 구간으로 계산하며, 천간 십신은 ${stemGod.ko}, 지지 정기 십신은 ${branchGod.ko}, 십이운성은 ${period.stage}로 표시됩니다. 이 조합은 해당 기간을 예언하는 문장이 아니라, 자원·역할·속도를 점검하는 자기성찰용 표식입니다.`,
      en: `This period is the ${period.ordinal + 1}${period.ordinal === 0 ? "st" : period.ordinal === 1 ? "nd" : period.ordinal === 2 ? "rd" : "th"} step from the Month Pillar in the ${directionEn} direction, represented by ${stem.en}${branch.en}. The calculation spans ages ${period.fromAge} through ${period.toAge - 1}; its stem Ten God is ${stemGod.en}, its branch's Principal Hidden Stem maps to ${branchGod.en}, and its Growth Stage is ${stage}. This is a reflection marker for resources, roles, and pace—not a prediction for the period.`,
    }),
    method: Object.freeze({
      ko: "대운은 월주의 60갑자 index에서 순행이면 +1, 역행이면 -1씩 이동합니다. 시작 나이는 출생 시각과 기준 절입의 거리 ÷ 3일을 관례적으로 환산하고, 이후 10년 간격으로 표시합니다. 대운수와 해석 명칭은 유파와 환산법에 따라 달라질 수 있습니다.",
      en: "Major Luck advances or retreats one sexagenary step from the Month Pillar. The starting age converts the distance between birth and the reference solar-term boundary at three days per year, then displays ten-year intervals. Starting-age conventions and interpretive names vary across schools.",
    }),
    evidenceRefs: Object.freeze(["saju-luck-periods"]),
    citations: Object.freeze([...SAJU_CALCULATION_CITATIONS, ...SAJU_TRADITION_CITATIONS]),
  });
}

export const SAJU_EXPLANATION_CITATIONS: readonly Citation[] = Object.freeze([
  ...SAJU_CALCULATION_CITATIONS,
  ...CLASSICAL_BAZI_LINEAGE,
]);
