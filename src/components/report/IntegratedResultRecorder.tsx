"use client";

import { useEffect } from "react";
import { consumeCompletionArrival } from "@/lib/completionCinematic";
import type { ResultSnapshotDraftV1 } from "@/lib/integratedPortrait/contracts";
import { materializeSnapshot } from "@/lib/integratedPortrait/snapshot";
import { upsertPortraitSnapshot } from "@/lib/integratedPortrait/vault.client";
import { validateSnapshot } from "@/lib/integratedPortrait/validation";

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  const suffix = Date.now().toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${suffix}`;
}

export function IntegratedResultRecorder({
  snapshot,
}: {
  readonly snapshot: ResultSnapshotDraftV1;
}) {
  useEffect(() => {
    if (!consumeCompletionArrival(snapshot.analysisKey)) return;

    const materialized = materializeSnapshot(snapshot, {
      id: createUuid(),
      sourceAssessmentId: createUuid(),
      completedAt: new Date().toISOString(),
    });
    const validated = validateSnapshot(materialized);
    if (!validated.ok) return;

    void upsertPortraitSnapshot(validated.value);
  }, [snapshot]);

  return null;
}
