"use client";

import { useTranslations } from "next-intl";
import type {
  ResultSnapshotV1,
  SynthesisClaimV1,
  SynthesisReportV1,
} from "@/lib/integratedPortrait/contracts";

interface EvidenceLanesProps {
  readonly report: SynthesisReportV1;
  readonly snapshots: readonly ResultSnapshotV1[];
}

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

function sourceSnapshot(
  claim: SynthesisClaimV1,
  snapshotsById: ReadonlyMap<string, ResultSnapshotV1>,
): ResultSnapshotV1 | null {
  const signalId = claim.sourceSignalIds[0];
  if (!signalId) return null;
  const separator = signalId.indexOf(":");
  if (separator < 1) return null;
  return snapshotsById.get(signalId.slice(0, separator)) ?? null;
}

function signalDescription(snapshot: ResultSnapshotV1 | null, claim: SynthesisClaimV1, t: ReturnType<typeof useTranslations>): string {
  if (!snapshot) return t("claim.unknownSource");
  const signalId = claim.sourceSignalIds[0] ?? "";
  const separator = signalId.indexOf(":");
  const constructId = separator >= 0 ? signalId.slice(separator + 1) : "";
  const value = snapshot.signals.find((signal) => signal.constructId === constructId)?.value;

  if (!value) return t("claim.observation");
  if (value.kind === "band") return t(`bands.${value.band}`);
  if (value.kind === "observation") return t("claim.observation");
  return t("claim.symbolicSignal");
}

function ClaimList({
  claims,
  snapshots,
  t,
}: {
  readonly claims: readonly SynthesisClaimV1[];
  readonly snapshots: readonly ResultSnapshotV1[];
  readonly t: ReturnType<typeof useTranslations>;
}) {
  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  if (claims.length === 0) {
    return <p className="mt-4 text-sm leading-relaxed text-hobun-dim">{t("claim.none")}</p>;
  }

  return (
    <ul className="integrated-portrait-claim-list mt-5">
      {claims.map((claim) => {
        const snapshot = sourceSnapshot(claim, snapshotsById);
        const analysisKey = snapshot?.analysisKey;
        return (
          <li key={claim.claimId} className="integrated-portrait-claim">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] tracking-[0.14em] text-hobun-faint">
                {analysisKey && ANALYSIS_KEYS.includes(analysisKey as (typeof ANALYSIS_KEYS)[number])
                  ? t(`analysis.${analysisKey}`)
                  : t("claim.unknownSource")}
              </span>
              <span className="integrated-portrait-status integrated-portrait-status-exploratory">
                {t("claim.exploratory")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {t("claim.singleSource", { signal: signalDescription(snapshot, claim, t) })}
            </p>
            <details className="mt-3 integrated-portrait-details">
              <summary>{t("claim.details")}</summary>
              <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{t("claim.limit")}</p>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function EvidenceLanes({ report, snapshots }: EvidenceLanesProps) {
  const t = useTranslations("integratedPortrait");

  return (
    <div className="integrated-portrait-lanes">
      <section
        className="integrated-portrait-lane integrated-portrait-lane-scientific"
        data-testid="integrated-scientific-lane"
        aria-labelledby="integrated-scientific-heading"
      >
        <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("lanes.scientificKicker")}</p>
        <h2 id="integrated-scientific-heading" className="mt-2 text-xl font-medium text-hobun">
          {t("lanes.scientificTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("lanes.scientificBody")}</p>
        <ClaimList claims={report.scientificClaims} snapshots={snapshots} t={t} />
      </section>

      <section
        className="integrated-portrait-lane integrated-portrait-lane-cultural"
        data-testid="integrated-cultural-lane"
        aria-labelledby="integrated-cultural-heading"
      >
        <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("lanes.culturalKicker")}</p>
        <h2 id="integrated-cultural-heading" className="mt-2 text-xl font-medium text-hobun">
          {t("lanes.culturalTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("lanes.culturalBody")}</p>
        <ClaimList claims={report.culturalObservations} snapshots={snapshots} t={t} />
      </section>
    </div>
  );
}
