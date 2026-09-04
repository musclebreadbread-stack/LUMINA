import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultSnapshotV1 } from "../contracts";
import {
  deleteAllPortraitSnapshots,
  getPortraitVaultSnapshot,
  upsertPortraitSnapshot,
} from "../vault.client";

const snapshot: ResultSnapshotV1 = {
  schemaVersion: 1,
  id: "00000000-0000-4000-8000-000000000021",
  sourceAssessmentId: "00000000-0000-4000-8000-000000000022",
  analysisKey: "psychometrics",
  provenanceGroup: "ipip-50-v1",
  lane: "scientific",
  instrumentVersion: "IPIP-50/Goldberg-1992",
  scoringModelVersion: "big-five-derived-v1",
  completedAt: "2026-08-29T00:00:00.000Z",
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

describe("integrated portrait session fallback", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    await deleteAllPortraitSnapshots();
  });

  afterEach(async () => {
    await deleteAllPortraitSnapshots();
    window.sessionStorage.clear();
  });

  it("persists privacy-safe snapshots in session storage when IndexedDB is unavailable", async () => {
    const result = await upsertPortraitSnapshot(snapshot);
    const stored = window.sessionStorage.getItem("lumina.integrated-portrait.v1");

    expect(result.ok).toBe(true);
    expect(getPortraitVaultSnapshot().persistence).toBe("session-storage");
    expect(stored).toContain(snapshot.id);
    expect(stored).not.toContain("responses");
  });

  it("reports a failed clear when the fallback storage cannot persist deletion", async () => {
    await upsertPortraitSnapshot(snapshot);
    expect(getPortraitVaultSnapshot().persistence).toBe("session-storage");
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    try {
      const result = await deleteAllPortraitSnapshots();

      expect(setItem).toHaveBeenCalled();
      expect(result).toMatchObject({ ok: false, reason: "storage-failed" });
    } finally {
      setItem.mockRestore();
    }
  });
});
