import { describe, it, expect } from "vitest";
import { scoreECR, encodeResponses, decodeResponses, type AttachmentResponse } from "../scoring";
import { classifyQuadrant } from "../quadrants";
import { ECR_ITEMS, getAxisItems } from "../items";

describe("ECR Engine", () => {
  describe("scoring", () => {
    it("keeps the reviewed wording for the relationship-anxiety items", () => {
      expect(ECR_ITEMS.find((item) => item.id === 2)?.textKo).toBe("나는 버림받을까 걱정한다.");
      expect(ECR_ITEMS.find((item) => item.id === 6)?.textKo).toBe(
        "나는 연인이 내가 그 사람을 아끼는 만큼 나를 아껴주지 않을까 걱정한다.",
      );
      expect(ECR_ITEMS.find((item) => item.id === 10)?.textKo).toBe(
        "나는 종종 파트너의 감정이 내 감정만큼 강하기를 바란다.",
      );
    });

    it("should calculate correct scores for all neutral responses", () => {
      const responses: Record<number, 1 | 2 | 3 | 4 | 5> = {};
      ECR_ITEMS.forEach(item => {
        responses[item.id] = 3; // 중립
      });

      const scores = scoreECR(responses);

      expect(scores.anxiety.rawSum).toBe(54); // 18문항 × 3점
      expect(scores.anxiety.mean).toBe(3);
      expect(scores.avoidance.rawSum).toBe(54);
      expect(scores.avoidance.mean).toBe(3);
    });

    it("should correctly reverse-score avoidance items", () => {
      const responses: Record<number, 1 | 2 | 3 | 4 | 5> = {};

      // Q3 (avoidance, reverse): 5 → 1
      responses[3] = 5;
      // Q15 (avoidance, reverse): 5 → 1
      responses[15] = 5;

      // 다른 avoidance 문항들은 1점
      const avoidanceItems = getAxisItems("avoidance");
      avoidanceItems.forEach(item => {
        if (item.id !== 3 && item.id !== 15) {
          responses[item.id] = 1;
        }
      });

      // anxiety 문항들은 3점
      const anxietyItems = getAxisItems("anxiety");
      anxietyItems.forEach(item => {
        responses[item.id] = 3;
      });

      const scores = scoreECR(responses);

      // Avoidance: (16문항 × 1) + (2문항 × 1) = 18
      expect(scores.avoidance.rawSum).toBe(18);
      expect(scores.avoidance.mean).toBe(1);
    });

    it("should handle missing responses gracefully", () => {
      const responses = {
        1: 5,
        2: 5,
        // 나머지는 없음
      } as AttachmentResponse;

      const scores = scoreECR(responses);

      expect(scores.anxiety.rawSum).toBe(5);
      expect(scores.anxiety.mean).toBe(5); // 5 / 1
      expect(scores.avoidance.rawSum).toBe(5);
      expect(scores.avoidance.mean).toBe(5); // 5 / 1
    });
  });

  describe("encoding/decoding", () => {
    it("should encode and decode responses correctly", () => {
      const responses: Record<number, 1 | 2 | 3 | 4 | 5> = {};
      ECR_ITEMS.forEach((item, index) => {
        responses[item.id] = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      });

      const encoded = encodeResponses(responses);
      const decoded = decodeResponses(encoded);

      expect(decoded).toEqual(responses);
    });

    it("should return null for invalid encoded string", () => {
      expect(decodeResponses("")).toBe(null);
      expect(decodeResponses("12345")).toBe(null);
      expect(decodeResponses("a".repeat(36))).toBe(null);
    });
  });

  describe("quadrant classification", () => {
    it("should classify as Secure for low anxiety and low avoidance", () => {
      const result = classifyQuadrant(
        { rawSum: 36, mean: 2.0 }, // 낮은 불안
        { rawSum: 36, mean: 2.0 }  // 낮은 회피
      );

      expect(result.quadrant).toBe("secure");
      expect(result.labelKo).toBe("안정형");
    });

    it("should classify as Anxious for high anxiety and low avoidance", () => {
      const result = classifyQuadrant(
        { rawSum: 72, mean: 4.0 }, // 높은 불안
        { rawSum: 36, mean: 2.0 }  // 낮은 회피
      );

      expect(result.quadrant).toBe("anxious");
      expect(result.labelKo).toBe("불안형");
    });

    it("should classify as Avoidant for low anxiety and high avoidance", () => {
      const result = classifyQuadrant(
        { rawSum: 36, mean: 2.0 }, // 낮은 불안
        { rawSum: 72, mean: 4.0 }  // 높은 회피
      );

      expect(result.quadrant).toBe("avoidant");
      expect(result.labelKo).toBe("회피형");
    });

    it("should classify as Fearful for high anxiety and high avoidance", () => {
      const result = classifyQuadrant(
        { rawSum: 72, mean: 4.0 }, // 높은 불안
        { rawSum: 72, mean: 4.0 }  // 높은 회피
      );

      expect(result.quadrant).toBe("fearful");
      expect(result.labelKo).toBe("두려움형");
    });

    it("should use 3.5 as the boundary", () => {
      // 경계값 테스트
      const result = classifyQuadrant(
        { rawSum: 63, mean: 3.5 }, // 정확히 경계
        { rawSum: 63, mean: 3.5 }  // 정확히 경계
      );

      // 3.5 이상은 "높음"으로 분류
      expect(result.quadrant).toBe("fearful");
    });
  });

});
