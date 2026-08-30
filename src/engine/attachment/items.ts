export type AttachmentAxis = "anxiety" | "avoidance";

/** Current five-point item set is exploratory and is not the official ECR-R instrument. */

export type LikertScale = 1 | 2 | 3 | 4 | 5;

export interface ECRItem {
  readonly id: number;
  readonly axis: AttachmentAxis;
  readonly reverseScored: boolean;
  readonly textKo: string;
  readonly textEn: string;
}

/**
 * Exploratory attachment items informed by the ECR-R construct.
 * This is not the official ECR-R instrument.
 *
 * 36문항: 불안(18문항) + 회피(18문항)
 * 5점 척도: 1(전혀 동의하지 않음) ~ 5(매우 동의함)
 *
 * 역채점 문항:
 * - Avoidance: Q3, Q15 (긍정적 표현 → 역채점)
 * - Anxiety: 없음
 */
export const ECR_ITEMS: readonly ECRItem[] = [
  // Avoidance (회피) - 홀수 번호
  { id: 1, axis: "avoidance", reverseScored: false, textKo: "나는 파트너에게 깊은 속마음을 드러내지 않는 편이다.", textEn: "I prefer not to show a partner how I feel deep down." },
  { id: 3, axis: "avoidance", reverseScored: true, textKo: "나는 연인과 매우 가까이 있는 것이 편안하다.", textEn: "I am very comfortable being close to romantic partners." },
  { id: 5, axis: "avoidance", reverseScored: false, textKo: "파트너가 나에게 다가오려 하면 오히려 멀어지게 된다.", textEn: "Just when my partner starts to get close to me I find myself pulling away." },
  { id: 7, axis: "avoidance", reverseScored: false, textKo: "연인이 매우 가까이 다가오려 하면 불편하다.", textEn: "I get uncomfortable when a romantic partner wants to be very close." },
  { id: 9, axis: "avoidance", reverseScored: false, textKo: "나는 연인에게 마음을 열고 이야기하는 것이 편하지 않다.", textEn: "I don't feel comfortable opening up to romantic partners." },
  { id: 11, axis: "avoidance", reverseScored: false, textKo: "파트너에게 다가가고 싶지만 자꾸 멀어지게 된다.", textEn: "I want to get close to my partner, but I keep pulling back." },
  { id: 13, axis: "avoidance", reverseScored: false, textKo: "파트너가 너무 가까이 다가오면 긴장된다.", textEn: "I am nervous when partners get too close to me." },
  { id: 15, axis: "avoidance", reverseScored: true, textKo: "나는 파트너와 개인적인 생각과 느낌을 나누는 것이 편하다.", textEn: "I feel comfortable sharing my private thoughts and feelings with my partner." },
  { id: 17, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와 너무 가까워지는 것을 피하려 한다.", textEn: "I try to avoid getting too close to my partner." },
  { id: 19, axis: "avoidance", reverseScored: false, textKo: "나는 연인에게 감정적으로 의존하는 것을 선호하지 않는다.", textEn: "I prefer not to depend too much on romantic partners." },
  { id: 21, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와 거리를 두는 편이다.", textEn: "I prefer to keep some distance from my partner." },
  { id: 23, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와 너무 많은 시간을 함께 보내는 것을 좋아하지 않는다.", textEn: "I don't like spending too much time with my partner." },
  { id: 25, axis: "avoidance", reverseScored: false, textKo: "나는 파트너에게 완전히 의존하는 것을 꺼린다.", textEn: "I am uncomfortable depending on romantic partners." },
  { id: 27, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와 정서적으로 너무 가까워지는 것을 피한다.", textEn: "I avoid getting too emotionally close to my partner." },
  { id: 29, axis: "avoidance", reverseScored: false, textKo: "나는 파트너에게 나의 모든 것을 드러내는 것이 불편하다.", textEn: "I am uncomfortable revealing everything about myself to my partner." },
  { id: 31, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와의 친밀한 관계를 유지하는 것이 어렵다.", textEn: "I find it difficult to maintain intimate relationships with my partner." },
  { id: 33, axis: "avoidance", reverseScored: false, textKo: "나는 파트너에게 전적으로 의지하는 것을 좋아하지 않는다.", textEn: "I don't like depending completely on my partner." },
  { id: 35, axis: "avoidance", reverseScored: false, textKo: "나는 파트너와 매우 친밀한 관계를 맺는 것을 꺼린다.", textEn: "I am reluctant to form very close relationships with my partner." },

  // Anxiety (불안) - 짝수 번호
  { id: 2, axis: "anxiety", reverseScored: false, textKo: "나는 버림받을까 걱정한다.", textEn: "I worry about being abandoned." },
  { id: 4, axis: "anxiety", reverseScored: false, textKo: "나는 연애에 대해 많은 걱정을 한다.", textEn: "I worry a lot about my relationships." },
  { id: 6, axis: "anxiety", reverseScored: false, textKo: "나는 연인이 내가 그 사람을 아끼는 만큼 나를 아껴주지 않을까 걱정한다.", textEn: "I worry that romantic partners won't care about me as much as I care about them." },
  { id: 8, axis: "anxiety", reverseScored: false, textKo: "나는 파트너를 잃을까 봐 상당히 걱정한다.", textEn: "I worry a fair amount about losing my partner." },
  { id: 10, axis: "anxiety", reverseScored: false, textKo: "나는 종종 파트너의 감정이 내 감정만큼 강하기를 바란다.", textEn: "I often wish that my partner's feelings for me were as strong as my feelings for him/her." },
  { id: 12, axis: "anxiety", reverseScored: false, textKo: "나는 종종 연인과 완전히 하나가 되고 싶어 하며, 이것이 때때로 그들을 멀리하게 만든다.", textEn: "I often want to merge completely with romantic partners, and this sometimes scares them away." },
  { id: 14, axis: "anxiety", reverseScored: false, textKo: "나는 혼자가 될까 봐 걱정한다.", textEn: "I worry about being alone." },
  { id: 16, axis: "anxiety", reverseScored: false, textKo: "나의 매우 가까워지고 싶은 욕구가 때때로 사람들을 멀어지게 한다.", textEn: "My desire to be very close sometimes scares people away." },
  { id: 18, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 떠날까 봐 걱정한다.", textEn: "I worry that my partner will leave me." },
  { id: 20, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 사랑하지 않을까 봐 걱정한다.", textEn: "I worry that my partner doesn't love me." },
  { id: 22, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 필요로 하지 않을까 봐 걱정한다.", textEn: "I worry that my partner doesn't need me." },
  { id: 24, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 버릴까 봐 걱정한다.", textEn: "I worry that my partner will abandon me." },
  { id: 26, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 실망시킬까 봐 걱정한다.", textEn: "I worry that my partner will disappoint me." },
  { id: 28, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 이해하지 못할까 봐 걱정한다.", textEn: "I worry that my partner won't understand me." },
  { id: 30, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 거부할까 봐 걱정한다.", textEn: "I worry that my partner will reject me." },
  { id: 32, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 잊을까 봐 걱정한다.", textEn: "I worry that my partner will forget about me." },
  { id: 34, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 무시할까 봐 걱정한다.", textEn: "I worry that my partner will ignore me." },
  { id: 36, axis: "anxiety", reverseScored: false, textKo: "나는 파트너가 나를 실망시킬까 봐 걱정한다.", textEn: "I worry that my partner will let me down." },
];

/**
 * 점수 계산:
 * - 일반 문항: 응답 그대로 (1~5)
 * - 역채점 문항: 6 - 응답 (1→5, 2→4, 3→3, 4→2, 5→1)
 *
 * 축별 점수 범위:
 * - Anxiety: 18~90 (18문항 × 1~5점)
 * - Avoidance: 18~90 (18문항 × 1~5점)
 */
export function scoreItem(item: ECRItem, response: LikertScale): number {
  return item.reverseScored ? 6 - response : response;
}

export function getAxisItems(axis: AttachmentAxis): readonly ECRItem[] {
  return ECR_ITEMS.filter(item => item.axis === axis);
}
