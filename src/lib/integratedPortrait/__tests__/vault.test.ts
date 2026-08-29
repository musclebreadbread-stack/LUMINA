import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ResultSnapshotV1 } from "../contracts";
import {
  deleteAllPortraitSnapshots,
  excludePortraitSnapshot,
  exportPortraitSnapshots,
  getPortraitVaultSnapshot,
  listPortraitSnapshots,
  upsertPortraitSnapshot,
} from "../vault.client";

const snapshot: ResultSnapshotV1 = {
  schemaVersion: 1,
  id: "00000000-0000-4000-8000-000000000011",
  sourceAssessmentId: "00000000-0000-4000-8000-000000000012",
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

describe("integrated portrait local vault", () => {
  beforeEach(async () => {
    await deleteAllPortraitSnapshots();
  });

  afterEach(async () => {
    await deleteAllPortraitSnapshots();
  });

  it("uses a memory-only session when IndexedDB is unavailable", async () => {
    const result = await upsertPortraitSnapshot(snapshot);
    const listed = await listPortraitSnapshots();

    expect(result.ok).toBe(true);
    expect(result.status.persistence).toBe("memory");
    expect(listed.snapshots).toEqual([snapshot]);
    expect(getPortraitVaultSnapshot().persistence).toBe("memory");
  });

  it("rejects unknown fields before anything is stored", async () => {
    const unsafe: unknown = { ...snapshot, responses: [1, 2] };
    const result = await upsertPortraitSnapshot(unsafe);

    expect(result).toMatchObject({ ok: false, reason: "unknown-field" });
    expect((await listPortraitSnapshots()).snapshots).toEqual([]);
  });

  it("excludes one result without deleting the stored snapshot", async () => {
    await upsertPortraitSnapshot(snapshot);
    const excluded = await excludePortraitSnapshot(snapshot.id);

    expect(excluded.ok).toBe(true);
    expect((await listPortraitSnapshots()).snapshots).toEqual([]);
    expect(await exportPortraitSnapshots()).toBe(
      JSON.stringify({ schemaVersion: 1, snapshots: [] }),
    );
  });

  it("deletes all snapshots and returns a privacy-safe export", async () => {
    await upsertPortraitSnapshot(snapshot);

    expect(await exportPortraitSnapshots()).not.toContain("responses");
    await deleteAllPortraitSnapshots();

    expect((await listPortraitSnapshots()).snapshots).toEqual([]);
    expect(await exportPortraitSnapshots()).toBe(
      JSON.stringify({ schemaVersion: 1, snapshots: [] }),
    );
  });
});
