import { describe, expect, it } from "vitest";
import { DOMAINS, ITEMS, itemsOfDomain, type CognitiveDomain } from "@engine/cognitive/items";
import { scoreCognitive, type CognitiveResult, type ItemResult } from "@engine/cognitive/scoring";
import {
  COGNITIVE_DOMAIN_ORDER,
  COGNITIVE_ITEM_COUNT,
  buildCognitiveView,
  domainMeta,
  formatElapsedMs,
  localizeDomain,
  localizeDomainDescription,
  localizeExplanation,
} from "../cognitiveModel";

/** correctDomains 안의 영역은 전부 맞히고, 나머지는 전부 틀린 응답. */
function responsesFor(correctDomains: readonly CognitiveDomain[]): Record<number, number> {
  return Object.fromEntries(
    ITEMS.map((item) => {
      const correct = correctDomains.includes(item.domain);
      const wrong = (item.correctOptionIndex + 1) % item.options.length;
      return [item.id, correct ? item.correctOptionIndex : wrong];
    }),
  );
}

describe("domain metadata and localization", () => {
  it("describes every engine domain in both languages", () => {
    for (const domain of DOMAINS) {
      const meta = domainMeta(domain);
      expect(meta.key).toBe(domain);
      expect(meta.ko.trim()).not.toBe("");
      expect(meta.en.trim()).not.toBe("");
      expect(meta.descriptionKo.trim()).not.toBe("");
      expect(meta.descriptionEn.trim()).not.toBe("");
    }
  });

  it("picks Korean for ko and English otherwise", () => {
    expect(localizeDomain("matrixReasoning", "ko")).toBe("도형 행렬");
    expect(localizeDomain("matrixReasoning", "en")).toBe("Matrix Reasoning");
    expect(localizeDomainDescription("verbalReasoning", "ko")).toBe(domainMeta("verbalReasoning").descriptionKo);
    expect(localizeDomainDescription("verbalReasoning", "en")).toBe(domainMeta("verbalReasoning").descriptionEn);
  });

  it("re-exports the engine's fixed order and item count", () => {
    expect(COGNITIVE_DOMAIN_ORDER).toBe(DOMAINS);
    expect(COGNITIVE_ITEM_COUNT).toBe(16);
  });
});

describe("formatElapsedMs", () => {
  it("splits milliseconds into rounded minutes and seconds", () => {
    expect(formatElapsedMs(125_400)).toEqual({ totalMs: 125_400, minutes: 2, seconds: 5 });
    expect(formatElapsedMs(59_600)).toEqual({ totalMs: 59_600, minutes: 1, seconds: 0 });
  });

  it("keeps zero distinct from unmeasured", () => {
    expect(formatElapsedMs(0)).toEqual({ totalMs: 0, minutes: 0, seconds: 0 });
    expect(formatElapsedMs(null)).toBeNull();
  });

  it("rejects negative and non-finite values", () => {
    expect(formatElapsedMs(-1)).toBeNull();
    expect(formatElapsedMs(Number.NaN)).toBeNull();
    expect(formatElapsedMs(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(formatElapsedMs(1000))).toBe(true);
  });
});

describe("buildCognitiveView", () => {
  it("reports a perfect run with no strongest or weakest domain", () => {
    const view = buildCognitiveView(scoreCognitive({ responses: responsesFor([...DOMAINS]) }));
    expect(view.correctCount).toBe(16);
    expect(view.itemCount).toBe(16);
    expect(view.accuracyPercent).toBe(100);
    expect(view.strongestDomain).toBeNull();
    expect(view.weakestDomain).toBeNull();
    expect(view.elapsed).toBeNull();
    expect(view.domains.map((d) => d.key)).toEqual([...DOMAINS]);
    expect(view.domains.every((d) => d.elapsedMs === null)).toBe(true);
    expect(view.reviews).toHaveLength(16);
    expect(view.reviews.every((r) => r.isCorrect)).toBe(true);
    expect(Object.isFrozen(view)).toBe(true);
  });

  it("reports an all-wrong run the same way", () => {
    const view = buildCognitiveView(scoreCognitive({ responses: responsesFor([]) }));
    expect(view.correctCount).toBe(0);
    expect(view.accuracyPercent).toBe(0);
    expect(view.strongestDomain).toBeNull();
    expect(view.weakestDomain).toBeNull();
    expect(view.reviews.every((r) => !r.isCorrect)).toBe(true);
  });

  it("picks the first domain in engine order on ties for strongest and weakest", () => {
    const view = buildCognitiveView(
      scoreCognitive({ responses: responsesFor([DOMAINS[1]!, DOMAINS[2]!]) }),
    );
    expect(view.strongestDomain).toBe(DOMAINS[1]);
    expect(view.weakestDomain).toBe(DOMAINS[0]);
    expect(view.accuracyPercent).toBe(50);
  });

  it("finds a single strongest and a single weakest domain", () => {
    const view = buildCognitiveView(
      scoreCognitive({ responses: responsesFor([DOMAINS[3]!, DOMAINS[2]!, DOMAINS[1]!]) }),
    );
    expect(view.strongestDomain).toBe(DOMAINS[1]);
    expect(view.weakestDomain).toBe(DOMAINS[0]);
    expect(view.accuracyPercent).toBe(75);
  });

  it("rounds the headline accuracy to an integer while keeping the raw value", () => {
    const responses = responsesFor([...DOMAINS]);
    const item = ITEMS[0]!;
    responses[item.id] = (item.correctOptionIndex + 1) % item.options.length;
    const view = buildCognitiveView(scoreCognitive({ responses }));
    expect(view.accuracy0to100).toBeCloseTo(93.75);
    expect(view.accuracyPercent).toBe(94);
  });

  it("builds reviews with 1-based positions and both options resolved", () => {
    const responses = responsesFor([]);
    const view = buildCognitiveView(scoreCognitive({ responses }));
    view.reviews.forEach((review, index) => {
      expect(review.position).toBe(index + 1);
      expect(review.item.id).toBe(ITEMS[index]!.id);
      expect(review.chosenOption).toBe(review.item.options[review.chosenOptionIndex]);
      expect(review.correctOption).toBe(review.item.options[review.correctOptionIndex]);
      expect(review.recommendedSeconds).toBe(review.item.recommendedSeconds);
    });
  });

  it("localizes explanations per locale", () => {
    const review = buildCognitiveView(scoreCognitive({ responses: responsesFor([]) })).reviews[0]!;
    expect(localizeExplanation(review, "ko")).toBe(review.explanationKo);
    expect(localizeExplanation(review, "en")).toBe(review.explanationEn);
  });

  it("carries injected elapsed time per domain and in total", () => {
    const elapsedMsByItem = Object.fromEntries(ITEMS.map((item) => [item.id, 30_000]));
    const view = buildCognitiveView(
      scoreCognitive({ responses: responsesFor([...DOMAINS]), elapsedMsByItem }),
    );
    expect(view.elapsed).toEqual({ totalMs: 480_000, minutes: 8, seconds: 0 });
    for (const domain of view.domains) {
      expect(domain.elapsedMs).toBe(30_000 * itemsOfDomain(domain.key).length);
    }
  });

  describe("with hand-built engine results", () => {
    const base = scoreCognitive({ responses: responsesFor([...DOMAINS]) });

    it("skips item results whose item id or option index cannot be resolved", () => {
      const good = base.itemResults[0]!;
      const unknownItem: ItemResult = { ...good, itemId: 99_999 };
      const badChosen: ItemResult = { ...good, chosenOptionIndex: 99 };
      const badCorrect: ItemResult = { ...good, correctOptionIndex: -1 };
      const result: CognitiveResult = { ...base, itemResults: [unknownItem, badChosen, badCorrect, good] };

      const view = buildCognitiveView(result);
      expect(view.reviews).toHaveLength(1);
      // 위치는 걸러내기 전 배열 순서를 따른다.
      expect(view.reviews[0]!.position).toBe(4);
    });

    it("zero-fills domains the engine result does not contain", () => {
      const result: CognitiveResult = { ...base, domains: [] };
      const view = buildCognitiveView(result);
      expect(view.domains).toHaveLength(DOMAINS.length);
      for (const domain of view.domains) {
        expect(domain.correctCount).toBe(0);
        expect(domain.itemCount).toBe(0);
        expect(domain.accuracy0to100).toBe(0);
        expect(domain.elapsedMs).toBeNull();
      }
      expect(view.strongestDomain).toBeNull();
    });
  });
});
