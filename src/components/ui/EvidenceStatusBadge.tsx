import { getTranslations } from "next-intl/server";
import type { ValidationStatus } from "@engine/shared/evidence";

const STATUS_KEYS: Record<ValidationStatus, string> = {
  "validated-target-population": "evidenceStatus.validatedTargetPopulation",
  "validated-other-population": "evidenceStatus.validatedOtherPopulation",
  "translation-not-validated": "evidenceStatus.translationNotValidated",
  derived: "evidenceStatus.derived",
  experimental: "evidenceStatus.experimental",
};

export async function EvidenceStatusBadge({
  status,
  tone = "dark",
}: {
  readonly status: ValidationStatus;
  readonly tone?: "dark" | "light";
}) {
  const t = await getTranslations("common");
  const toneClass = tone === "light" ? "border-ink-900/20 text-ink-800/75" : "border-ink-600 text-hobun-dim";

  return (
    <span
      data-evidence-status={status}
      className={`inline-flex items-center border px-2 py-1 font-mono text-[12px] tracking-wide ${toneClass}`}
    >
      {t(STATUS_KEYS[status])}
    </span>
  );
}
