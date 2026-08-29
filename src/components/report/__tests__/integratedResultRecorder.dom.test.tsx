import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultSnapshotDraftV1 } from "@/lib/integratedPortrait/contracts";

const consumeCompletionArrival = vi.hoisted(() => vi.fn<() => boolean>(() => false));
const upsertPortraitSnapshot = vi.hoisted(() => vi.fn(async (_snapshot: unknown) => ({
  ok: true as const,
  status: { persistence: "memory" as const, lastError: null, revision: 1 },
})));

vi.mock("@/lib/completionCinematic", () => ({ consumeCompletionArrival }));
vi.mock("@/lib/integratedPortrait/vault.client", () => ({ upsertPortraitSnapshot }));

import { IntegratedResultRecorder } from "../IntegratedResultRecorder";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draft: ResultSnapshotDraftV1 = {
  schemaVersion: 1,
  analysisKey: "psychometrics",
  provenanceGroup: "ipip-50-v1",
  lane: "scientific",
  instrumentVersion: "IPIP-50/Goldberg-1992",
  scoringModelVersion: "big-five-derived-v1",
  locale: "ko",
  signals: [
    {
      constructId: "bigfive.extraversion",
      value: { kind: "band", band: "mid" },
      descriptorIds: ["relative-band.mid"],
      limitationIds: ["limitation.psychometrics"],
    },
  ],
  referenceIds: ["psychometrics"],
};

describe("IntegratedResultRecorder", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    consumeCompletionArrival.mockReset();
    consumeCompletionArrival.mockReturnValue(false);
    upsertPortraitSnapshot.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("does not call the vault when there is no completion arrival marker", async () => {
    await act(async () => {
      root.render(<IntegratedResultRecorder snapshot={draft} />);
    });

    expect(consumeCompletionArrival).toHaveBeenCalledWith("psychometrics");
    expect(upsertPortraitSnapshot).not.toHaveBeenCalled();
  });

  it("stores only after the completion marker is consumed", async () => {
    consumeCompletionArrival.mockReturnValue(true);

    await act(async () => {
      root.render(<IntegratedResultRecorder snapshot={draft} />);
    });

    expect(upsertPortraitSnapshot).toHaveBeenCalledTimes(1);
    const stored = upsertPortraitSnapshot.mock.calls[0]?.[0];
    expect(stored).toMatchObject({ analysisKey: "psychometrics", schemaVersion: 1 });
    expect(JSON.stringify(stored)).not.toContain("responses");
  });
});
