import type { AxisScore } from "./scoring";

export type AttachmentQuadrant = "secure" | "anxious" | "avoidant" | "fearful";

export interface QuadrantClassification {
  readonly quadrant: AttachmentQuadrant;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
}

/**
 * Bartholomew & Horowitz (1991)의 4사분면 모델
 *
 * - Secure (안정형): 낮은 불안 + 낮은 회피
 * - Anxious (불안형/몰입형): 높은 불안 + 낮은 회피
 * - Avoidant (회피형/소거형): 낮은 불안 + 높은 회피
 * - Fearful (두려움형/혼란형): 높은 불안 + 높은 회피
 *
 * 기준: 평균 3.5점 (5점 척도의 중간값)
 */
export function classifyQuadrant(
  anxiety: AxisScore,
  avoidance: AxisScore
): QuadrantClassification {
  const highAnxiety = anxiety.mean >= 3.5;
  const highAvoidance = avoidance.mean >= 3.5;

  if (!highAnxiety && !highAvoidance) {
    return {
      quadrant: "secure",
      labelKo: "안정형",
      labelEn: "Secure",
      descriptionKo: "친밀한 관계를 편안하게 여기며, 버려질 것에 대한 걱정도 적습니다. 파트너에게 마음을 열고 의존하는 것이 자연스럽습니다.",
      descriptionEn: "Comfortable with intimacy and independence. Low worry about abandonment and comfortable opening up to partners.",
    };
  }

  if (highAnxiety && !highAvoidance) {
    return {
      quadrant: "anxious",
      labelKo: "불안형",
      labelEn: "Anxious",
      descriptionKo: "친밀한 관계를 강하게 원하지만, 파트너가 나를 떠날까 봐 자주 걱정합니다. 관계에 대한 확신이 필요하며, 때로는 과도하게 매달리는 경향이 있습니다.",
      descriptionEn: "Craves intimacy but worries about abandonment. Needs reassurance and may sometimes appear clingy or overly dependent.",
    };
  }

  if (!highAnxiety && highAvoidance) {
    return {
      quadrant: "avoidant",
      labelKo: "회피형",
      labelEn: "Avoidant",
      descriptionKo: "독립성을 중시하며, 너무 가까운 관계를 불편해합니다. 감정적으로 거리를 두려는 경향이 있고, 파트너가 다가오면 멀어지고 싶어 합니다.",
      descriptionEn: "Values independence and feels uncomfortable with too much closeness. Tends to maintain emotional distance and pulls away when partners get too close.",
    };
  }

  // highAnxiety && highAvoidance
  return {
    quadrant: "fearful",
    labelKo: "두려움형",
    labelEn: "Fearful",
    descriptionKo: "친밀한 관계를 원하면서도 두려워합니다. 버림받을 것에 대한 걱정과 가까워지는 것에 대한 불편함이 공존하여, 관계에서 혼란스러운 패턴을 보일 수 있습니다.",
    descriptionEn: "Desires closeness but fears it. Experiences conflicting feelings of wanting intimacy while being uncomfortable with it, leading to confusing relationship patterns.",
  };
}
