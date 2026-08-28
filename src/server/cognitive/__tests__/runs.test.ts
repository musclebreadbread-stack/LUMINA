import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Blueprint, InternalItem } from "@engine/cognitive-standardized/types";
import type { CognitiveSubject } from "../auth";
import {
  createMemoryCognitiveRunStore,
  type CognitiveRunStore,
} from "../runs";

const subject: CognitiveSubject = { id: "11111111-1111-4111-8111-111111111111", isAnonymous: true };
const blueprint: Blueprint = {
  minimumByDomain: { gf: 0, gc: 0, gv: 0, gwm: 0, gs: 0 },
  maximumByDomain: { gf: 2, gc: 2, gv: 2, gwm: 2, gs: 2 },
  maxExposureRate: 1,
  targetStandardError: 0.3,
  maximumItems: 2,
};

const items: readonly InternalItem[] = [
  {
    versionId: "gf-1",
    domain: "gf",
    presentation: {
      domain: "gf",
      stimulus: { kind: "text", textKo: "1 + 1 = ?", textEn: "1 + 1 = ?" },
      options: [
        { id: "gf-1:a", labelKo: "1", labelEn: "1", figure: null },
        { id: "gf-1:b", labelKo: "2", labelEn: "2", figure: null },
      ],
    },
    correctOptionId: "gf-1:b",
    parameters: { discrimination: 1, difficulty: 0, guessing: 0.5 },
    exposureRate: 0,
  },
  {
    versionId: "gc-1",
    domain: "gc",
    presentation: {
      domain: "gc",
      stimulus: { kind: "text", textKo: "A", textEn: "A" },
      options: [
        { id: "gc-1:a", labelKo: "A", labelEn: "A", figure: null },
        { id: "gc-1:b", labelKo: "B", labelEn: "B", figure: null },
      ],
    },
    correctOptionId: "gc-1:a",
    parameters: { discrimination: 1, difficulty: 0, guessing: 0.5 },
    exposureRate: 0,
  },
];

function validStart() {
  return {
    consent: { operationalStorage: true as const, researchParticipation: true },
    capability: {
      locale: "ko" as const,
      device: "desktop" as const,
      keyboard: true,
      pointer: true,
      viewportWidth: 1440,
      viewportHeight: 900,
      reducedMotion: false,
    },
  };
}

describe("cognitive run lifecycle", () => {
  it("does not advance when an old assignment is submitted", async () => {
    const store: CognitiveRunStore = createMemoryCognitiveRunStore({ items, blueprint, seed: "run-a" });
    const started = await store.start(subject, validStart());
    const stale = await store.submit(subject, {
      runId: started.runId,
      assignmentId: "22222222-2222-4222-8222-222222222222",
      optionId: started.nextItem!.options[0]!.id,
      elapsedMs: 20,
    });

    expect(stale.error).toBe("stale_assignment");
    expect(stale.run.answeredCount).toBe(0);
  });

  it("rejects a response with an option not presented to the run", async () => {
    const store = createMemoryCognitiveRunStore({ items, blueprint, seed: "run-b" });
    const started = await store.start(subject, validStart());
    const invalid = await store.submit(subject, {
      runId: started.runId,
      assignmentId: started.nextItem!.assignmentId,
      optionId: "hidden-option",
      elapsedMs: null,
    });

    expect(invalid.error).toBe("invalid_option");
    expect(invalid.run.answeredCount).toBe(0);
  });

  it("keeps a second user from reading or submitting the run", async () => {
    const store = createMemoryCognitiveRunStore({ items, blueprint, seed: "run-c" });
    const started = await store.start(subject, validStart());
    const other: CognitiveSubject = { id: "33333333-3333-4333-8333-333333333333", isAnonymous: true };
    expect(await store.resume(other, started.runId)).toBeNull();
    const result = await store.submit(other, {
      runId: started.runId,
      assignmentId: started.nextItem!.assignmentId,
      optionId: started.nextItem!.options[0]!.id,
      elapsedMs: null,
    });
    expect(result.error).toBe("invalid_run");
  });
});
