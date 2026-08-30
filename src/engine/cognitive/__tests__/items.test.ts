import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import {
  DOMAINS,
  ITEMS,
  ITEMS_PER_DOMAIN,
  ITEM_COUNT,
  itemById,
  itemsOfDomain,
  type Item,
  type MatrixItem,
  type RotationItem,
} from "../items";
import { areRotationEquivalent, isConnected, resolveVoxels, voxelsKey } from "../figures";
import { COGNITIVE_CITATIONS } from "../citations";
import {
  ANSWER_KEY_EXPOSURE,
  COGNITIVE_NORM_ABSENCE,
  ITEM_PROVENANCE,
} from "../provenance";

function matrixItems(): readonly MatrixItem[] {
  return ITEMS.filter((item): item is MatrixItem => item.domain === "matrixReasoning");
}

function rotationItems(): readonly RotationItem[] {
  return ITEMS.filter((item): item is RotationItem => item.domain === "threeDimensionalRotation");
}

function hasText(item: Item): boolean {
  return item.stimulus.kind === "text";
}

describe("인지능력 문항표 무결성", () => {
  it("문항이 16개이고 id가 1..16으로 겹치지 않는다", () => {
    expect(ITEMS).toHaveLength(ITEM_COUNT);
    expect(ITEMS.map((item) => item.id)).toEqual(
      Array.from({ length: ITEM_COUNT }, (_, index) => index + 1),
    );
    expect(new Set(ITEMS.map((item) => item.id)).size).toBe(ITEM_COUNT);
  });

  it("네 영역에 정확히 4문항씩 들어 있다", () => {
    expect(DOMAINS).toHaveLength(4);
    for (const domain of DOMAINS) {
      expect(itemsOfDomain(domain)).toHaveLength(ITEMS_PER_DOMAIN);
    }
    expect(DOMAINS.reduce((sum, domain) => sum + itemsOfDomain(domain).length, 0)).toBe(ITEM_COUNT);
  });

  it("모든 문항의 정답 색인이 실제 보기를 가리킨다", () => {
    for (const item of ITEMS) {
      expect(item.options.length).toBeGreaterThanOrEqual(4);
      expect(item.options.length).toBeLessThanOrEqual(6);
      expect(Number.isInteger(item.correctOptionIndex)).toBe(true);
      expect(item.correctOptionIndex).toBeGreaterThanOrEqual(0);
      expect(item.correctOptionIndex).toBeLessThan(item.options.length);
      expect(item.options[item.correctOptionIndex]).toBeDefined();
    }
  });

  it("한 문항 안에서 보기 id가 겹치지 않는다", () => {
    for (const item of ITEMS) {
      const ids = item.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("모든 문항이 두 로케일 모두에서 비어 있지 않은 규칙 설명을 갖는다", () => {
    for (const item of ITEMS) {
      expect(item.explanationKo.trim().length).toBeGreaterThan(0);
      expect(item.explanationEn.trim().length).toBeGreaterThan(0);
    }
  });

  it("권장 시간이 영역 안에서 뒤로 갈수록 길어진다", () => {
    for (const domain of DOMAINS) {
      const seconds = itemsOfDomain(domain).map((item) => item.recommendedSeconds);
      expect(seconds.every((value) => value > 0)).toBe(true);
      for (let index = 1; index < seconds.length; index += 1) {
        expect(seconds[index]!).toBeGreaterThan(seconds[index - 1]!);
      }
    }
  });

  it("글 자극 문항은 두 로케일 문장이 모두 채워져 있다", () => {
    const textual = ITEMS.filter(hasText);
    expect(textual).toHaveLength(ITEMS_PER_DOMAIN * 2);
    for (const item of textual) {
      if (item.stimulus.kind !== "text") throw new Error("unreachable");
      expect(item.stimulus.textKo.trim().length).toBeGreaterThan(0);
      expect(item.stimulus.textEn.trim().length).toBeGreaterThan(0);
      for (const option of item.options) {
        if (option.kind !== "text") throw new Error("text item must carry text options");
        expect(option.labelKo.trim().length).toBeGreaterThan(0);
        expect(option.labelEn.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("언어 추론 문항은 두 로케일이 실제로 다른 문장이다", () => {
    for (const item of itemsOfDomain("verbalReasoning")) {
      if (item.stimulus.kind !== "text") throw new Error("unreachable");
      expect(item.stimulus.textKo).not.toBe(item.stimulus.textEn);
    }
  });

  it("행렬 자극은 3x3이고 빈칸이 정확히 하나다", () => {
    const items = matrixItems();
    expect(items).toHaveLength(ITEMS_PER_DOMAIN);

    for (const item of items) {
      expect(item.stimulus.rows).toBe(3);
      expect(item.stimulus.columns).toBe(3);
      expect(item.stimulus.cells).toHaveLength(9);
      expect(item.stimulus.cells.filter((cell) => cell.kind === "blank")).toHaveLength(1);

      for (const cell of item.stimulus.cells) {
        if (cell.kind !== "figure") continue;
        expect(cell.content.count).toBeGreaterThanOrEqual(1);
        expect(cell.content.count).toBeLessThanOrEqual(4);
        expect(cell.content.rotationDegrees % 45).toBe(0);
      }

      for (const option of item.options) {
        expect(option.kind).toBe("matrixCell");
        expect(option.cell.count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("행렬 보기들은 서로 다른 칸 내용이다", () => {
    for (const item of matrixItems()) {
      const shapes = item.options.map(
        (option) =>
          `${option.cell.shape}:${option.cell.count}:${option.cell.rotationDegrees}:${option.cell.fill}:${option.cell.size}`,
      );
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  /**
   * 회전 문항의 정답 키는 사람 눈이 아니라 기하로 검증한다.
   * 이 테스트가 통과하지 않으면 문항이 아니라 정답이 틀린 것이다.
   */
  it("회전 문항의 정답 보기만 자극과 회전 합동이다", () => {
    const items = rotationItems();
    expect(items).toHaveLength(ITEMS_PER_DOMAIN);

    for (const item of items) {
      const stimulus = resolveVoxels(item.stimulus.voxels, item.stimulus.rotation);
      expect(item.stimulus.voxels.length).toBeGreaterThanOrEqual(4);
      expect(isConnected(item.stimulus.voxels)).toBe(true);

      item.options.forEach((option, index) => {
        const candidate = resolveVoxels(option.figure.voxels, option.figure.rotation);
        expect(isConnected(option.figure.voxels)).toBe(true);
        expect(areRotationEquivalent(stimulus, candidate)).toBe(index === item.correctOptionIndex);
      });
    }
  });

  it("정답 보기는 자극과 다른 자세로 제시된다", () => {
    for (const item of rotationItems()) {
      const correct = item.options[item.correctOptionIndex];
      expect(correct).toBeDefined();
      const stimulusKey = voxelsKey(resolveVoxels(item.stimulus.voxels, item.stimulus.rotation));
      const correctKey = voxelsKey(resolveVoxels(correct!.figure.voxels, correct!.figure.rotation));
      expect(correctKey).not.toBe(stimulusKey);
    }
  });

  it("itemById는 있는 문항만 돌려준다", () => {
    expect(itemById(1)?.domain).toBe("letterNumberSeries");
    expect(itemById(16)?.domain).toBe("threeDimensionalRotation");
    expect(itemById(0)).toBeUndefined();
    expect(itemById(17)).toBeUndefined();
  });

  it("문항표가 얼어 있어 실행 중에 바뀌지 않는다", () => {
    expect(Object.isFrozen(ITEMS)).toBe(true);
    expect(ITEMS.every((item) => Object.isFrozen(item))).toBe(true);
    expect(ITEMS.every((item) => Object.isFrozen(item.options))).toBe(true);
  });
});

describe("인지능력 근거 표기", () => {
  it("인용 문헌이 모두 형식을 갖췄다", () => {
    expect(COGNITIVE_CITATIONS.length).toBeGreaterThan(0);
    COGNITIVE_CITATIONS.forEach((citation) => {
      expect(isValidCitation(citation)).toBe(true);
    });
  });

  it("문항이 자체 작성이라는 사실을 데이터로 남긴다", () => {
    expect(ITEM_PROVENANCE.usesPublishedItems).toBe(false);
    expect(ITEM_PROVENANCE.formatTaxonomy).toMatch(/ICAR/);
    expect(ITEM_PROVENANCE.itemAuthor).toMatch(/LUMINA/);
  });

  it("규준 표본이 없다는 사실과 그래서 내지 않는 지표를 함께 적어 둔다", () => {
    expect(COGNITIVE_NORM_ABSENCE.hasNormSample).toBe(false);
    expect(COGNITIVE_NORM_ABSENCE.normSource).toBeNull();
    expect(COGNITIVE_NORM_ABSENCE.withheldMetrics).toContain("percentile");
    expect(COGNITIVE_NORM_ABSENCE.withheldMetrics).toContain("IQ-equivalent");
    expect(COGNITIVE_NORM_ABSENCE.withheldMetrics).toContain("deviation IQ");
    expect(COGNITIVE_NORM_ABSENCE.reportedMetrics.some((metric) => metric.includes("accuracy"))).toBe(
      true,
    );
  });

  it("정답 키가 클라이언트에 함께 배포된다는 사실을 숨기지 않는다", () => {
    expect(ANSWER_KEY_EXPOSURE.keysShipToClient).toBe(true);
    expect(ANSWER_KEY_EXPOSURE.reason).toMatch(/unaided/);
  });
});
