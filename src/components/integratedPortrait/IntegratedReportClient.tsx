"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { createCharacterRecipe } from "@/lib/integratedPortrait/character";
import { createSynthesis } from "@/lib/integratedPortrait/synthesis";
import type { ResultSnapshotV1 } from "@/lib/integratedPortrait/contracts";
import {
  getPortraitEligibility,
  selectCurrentSnapshots,
} from "@/lib/integratedPortrait/snapshot";
import {
  getPortraitVaultServerSnapshot,
  getPortraitVaultSnapshot,
  listPortraitSnapshots,
  subscribePortraitVault,
  type PortraitVaultStatus,
} from "@/lib/integratedPortrait/vault.client";
import { EvidenceLanes } from "./EvidenceLanes";
import { IntegratedPortraitHero } from "./IntegratedPortraitHero";
import { PortraitControls } from "./PortraitControls";

type IntegratedReportState = "empty" | "locked" | "unlocked" | "memory-only" | "error";

function stateFor(
  snapshots: readonly ResultSnapshotV1[],
  status: PortraitVaultStatus,
  readError: boolean,
): IntegratedReportState {
  if (readError) return "error";
  if (snapshots.length === 0 && status.persistence === "memory" && status.lastError !== null) {
    return "memory-only";
  }
  if (snapshots.length === 0) return "empty";
  return getPortraitEligibility(snapshots).isUnlocked ? "unlocked" : "locked";
}

export function IntegratedReportClient() {
  const t = useTranslations("integratedPortrait");
  const vaultStatus = useSyncExternalStore(
    subscribePortraitVault,
    getPortraitVaultSnapshot,
    getPortraitVaultServerSnapshot,
  );
  const [snapshots, setSnapshots] = useState<readonly ResultSnapshotV1[]>([]);
  const [readError, setReadError] = useState(false);
  const [operationError, setOperationError] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const result = await listPortraitSnapshots();
      setSnapshots(result.snapshots);
      setReadError(false);
    } catch {
      setReadError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void refresh();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const currentSnapshots = useMemo(() => selectCurrentSnapshots(snapshots), [snapshots]);
  const eligibility = useMemo(() => getPortraitEligibility(snapshots), [snapshots]);
  const report = useMemo(() => createSynthesis(snapshots), [snapshots]);
  const recipe = useMemo(() => createCharacterRecipe(snapshots), [snapshots]);
  const state = stateFor(currentSnapshots, vaultStatus, readError);

  const handleError = useCallback(() => setOperationError(true), []);
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <section
      className="integrated-portrait-client"
      data-testid="integrated-report-state"
      data-state={state}
      data-integrated-report-state={state}
      aria-live="polite"
    >
      <p className="integrated-report-count-label">
        {t("countLabel")} <span data-testid="integrated-report-count">{currentSnapshots.length}</span>
      </p>

      {vaultStatus.lastError !== null || vaultStatus.persistence === "memory" ? (
        <p data-testid="integrated-persistence-warning" className="mt-4 border-l border-amber-200/50 pl-4 text-xs leading-relaxed text-hobun-faint">
          {t("persistenceWarning")}
        </p>
      ) : null}

      {operationError ? (
        <p role="alert" className="mt-4 border-l border-red-300/50 pl-4 text-xs leading-relaxed text-red-100">
          {t("controls.operationError")}
        </p>
      ) : null}

      {state === "empty" ? (
        <div className="integrated-portrait-state-card">
          <h2 className="text-xl font-medium text-hobun">{t("states.emptyTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("states.emptyBody")}</p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
          >
            {t("states.homeCta")}
          </Link>
        </div>
      ) : null}

      {state === "memory-only" ? (
        <div className="integrated-portrait-state-card">
          <h2 className="text-xl font-medium text-hobun">{t("states.memoryTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("states.memoryBody")}</p>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="integrated-portrait-state-card" role="alert">
          <h2 className="text-xl font-medium text-hobun">{t("states.errorTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("states.errorBody")}</p>
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 items-center border border-hobun/60 px-4 text-sm text-hobun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
            onClick={() => void refresh()}
          >
            {t("states.retryCta")}
          </button>
        </div>
      ) : null}

      {state === "locked" ? (
        <div className="integrated-portrait-state-card">
          <h2 className="text-xl font-medium text-hobun">{t("states.lockedTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("states.lockedBody")}</p>
          <dl className="integrated-portrait-eligibility mt-6">
            <div>
              <dt>{t("eligibility.analysisLabel")}</dt>
              <dd>{t("eligibility.analysisValue", { count: eligibility.distinctAnalysisCount })}</dd>
            </div>
            <div>
              <dt>{t("eligibility.scientificLabel")}</dt>
              <dd>{t("eligibility.scientificValue", { count: eligibility.scientificProvenanceCount })}</dd>
            </div>
            <div>
              <dt>{t("eligibility.remainingLabel")}</dt>
              <dd>{t("eligibility.missingAnalysis", { count: eligibility.missingAnalysisCount })}</dd>
            </div>
            <div>
              <dt>{t("eligibility.remainingScientificLabel")}</dt>
              <dd>{t("eligibility.missingScientific", { count: eligibility.missingScientificProvenanceCount })}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {state === "unlocked" ? (
        <div className="integrated-portrait-unlocked">
          <IntegratedPortraitHero recipe={recipe} eligibility={eligibility} />
          <EvidenceLanes report={report} snapshots={currentSnapshots} />
          <PortraitControls
            snapshots={currentSnapshots}
            status={vaultStatus}
            onRefresh={handleRefresh}
            onError={handleError}
          />
        </div>
      ) : null}

      {state !== "empty" && state !== "memory-only" && state !== "error" && state !== "unlocked" ? (
        <PortraitControls
          snapshots={currentSnapshots}
          status={vaultStatus}
          onRefresh={handleRefresh}
          onError={handleError}
        />
      ) : null}

      {state === "memory-only" && currentSnapshots.length > 0 ? (
        <PortraitControls
          snapshots={currentSnapshots}
          status={vaultStatus}
          onRefresh={handleRefresh}
          onError={handleError}
        />
      ) : null}

    </section>
  );
}
