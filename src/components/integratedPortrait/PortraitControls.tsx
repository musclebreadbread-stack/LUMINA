"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ResultSnapshotV1 } from "@/lib/integratedPortrait/contracts";
import {
  deleteAllPortraitSnapshots,
  excludePortraitSnapshot,
  exportPortraitSnapshots,
  type PortraitVaultStatus,
} from "@/lib/integratedPortrait/vault.client";

const ANALYSIS_KEYS = [
  "saju",
  "astro",
  "numerology",
  "psychometrics",
  "jungian",
  "darktriad",
  "attachment",
  "eq",
] as const;

interface PortraitControlsProps {
  readonly snapshots: readonly ResultSnapshotV1[];
  readonly status: PortraitVaultStatus;
  readonly onRefresh: () => Promise<void>;
  readonly onError: () => void;
}

export function PortraitControls({ snapshots, status, onRefresh, onError }: PortraitControlsProps) {
  const t = useTranslations("integratedPortrait");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (operation: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await operation();
      await onRefresh();
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  };

  const download = async (): Promise<void> => {
    setBusy(true);
    try {
      const payload = await exportPortraitSnapshots();
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "lumina-integrated-portrait.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  };

  const persistenceLabel = status.persistence === "indexeddb" ? t("controls.indexeddb") : t("controls.memory");

  return (
    <section className="integrated-portrait-controls" aria-labelledby="integrated-controls-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("controls.kicker")}</p>
          <h2 id="integrated-controls-heading" className="mt-2 text-xl font-medium text-hobun">
            {t("controls.title")}
          </h2>
        </div>
        <span className="font-mono text-[11px] text-hobun-faint">{persistenceLabel}</span>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("controls.body")}</p>

      <ul className="mt-5 space-y-2">
        {snapshots.map((snapshot) => (
          <li key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 py-3">
            <span className="text-sm text-hobun">
              {ANALYSIS_KEYS.includes(snapshot.analysisKey as (typeof ANALYSIS_KEYS)[number])
                ? t(`analysis.${snapshot.analysisKey}`)
                : t("claim.unknownSource")}
            </span>
            <button
              type="button"
              className="min-h-10 border border-ink-700 px-3 text-xs text-hobun-dim transition-colors hover:border-hobun/60 hover:text-hobun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
              disabled={busy}
              onClick={() => void run(() => excludePortraitSnapshot(snapshot.id))}
            >
              {t("controls.exclude")}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="min-h-11 border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
          disabled={busy || snapshots.length === 0}
          onClick={() => void download()}
        >
          {t("controls.export")}
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            className="min-h-11 border border-ink-700 px-4 text-sm text-hobun-dim transition-colors hover:border-hobun/60 hover:text-hobun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
            disabled={busy || snapshots.length === 0}
            onClick={() => setConfirmDelete(true)}
          >
            {t("controls.deleteAll")}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("controls.deleteConfirmLabel")}>
            <span className="text-xs text-hobun-faint">{t("controls.deleteConfirm")}</span>
            <button
              type="button"
              className="min-h-11 border border-red-300/50 px-4 text-sm text-red-200 transition-colors hover:bg-red-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                void run(deleteAllPortraitSnapshots);
              }}
            >
              {t("controls.deleteConfirmCta")}
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink-700 px-4 text-sm text-hobun-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              {t("controls.cancel")}
            </button>
          </div>
        )}
      </div>

      <details className="mt-6 integrated-portrait-details">
        <summary>{t("controls.privacyTitle")}</summary>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{t("controls.privacyBody")}</p>
      </details>
    </section>
  );
}
