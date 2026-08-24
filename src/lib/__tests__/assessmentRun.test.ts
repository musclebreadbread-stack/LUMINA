import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ASSESSMENT_RUN_STORAGE_PREFIX,
  createAssessmentRun,
  readAssessmentRun,
  removeAssessmentRun,
} from "@/lib/assessmentRun";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const isAttachmentSummary = (value: unknown): value is { readonly mean: number } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "mean" in value &&
    typeof value.mean === "number"
  );
};

describe("assessment run session storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores only a derived summary behind an opaque run id", () => {
    const run = createAssessmentRun({
      methodKey: "attachment",
      instrumentVersion: "test-attachment/1",
      locale: "ko",
      scoreSummary: { mean: 3 },
    });

    expect(run?.id).toMatch(/^[a-zA-Z0-9_-]{16,100}$/);
    expect(storage.getItem(`${ASSESSMENT_RUN_STORAGE_PREFIX}${run?.id}`)).toContain('"scoreSummary"');
  });

  it("round-trips only for the registered method and a valid summary", () => {
    const run = createAssessmentRun({
      methodKey: "attachment",
      instrumentVersion: "test-attachment/1",
      locale: "en",
      scoreSummary: { mean: 4 },
    });

    expect(run).not.toBeNull();
    expect(readAssessmentRun(run!.id, "attachment", isAttachmentSummary)?.scoreSummary).toEqual({ mean: 4 });
    expect(readAssessmentRun(run!.id, "darktriad", isAttachmentSummary)).toBeNull();
  });

  it("removes a stored run", () => {
    const run = createAssessmentRun({
      methodKey: "attachment",
      instrumentVersion: "test-attachment/1",
      locale: "ko",
      scoreSummary: { mean: 3 },
    });

    removeAssessmentRun(run!.id);
    expect(readAssessmentRun(run!.id, "attachment", isAttachmentSummary)).toBeNull();
  });
});
