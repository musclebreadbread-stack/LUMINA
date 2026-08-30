import { getTranslations } from "next-intl/server";
import type { ValidationStatus } from "@engine/shared/evidence";

/** 다른 화면(OG 카드 등)이 같은 status→common 번역 키 매핑을 다시 만들지 않도록 export한다. */
export const STATUS_KEYS: Record<ValidationStatus, string> = {
  "validated-target-population": "evidenceStatus.validatedTargetPopulation",
  "validated-other-population": "evidenceStatus.validatedOtherPopulation",
  "translation-not-validated": "evidenceStatus.translationNotValidated",
  derived: "evidenceStatus.derived",
  experimental: "evidenceStatus.experimental",
};

export async function EvidenceStatusBadge({
  status,
  tone = "dark",
  derivedOverride,
}: {
  readonly status: ValidationStatus;
  readonly tone?: "dark" | "light";
  /** derived 상태 라벨은 여러 분석이 공유하므로, 특정 분석에서만 문구를 바꿔야 할 때 사용한다. */
  readonly derivedOverride?: string;
}) {
  const t = await getTranslations("common");
  const toneClass = tone === "light" ? "border-ink-900/20 text-ink-800/75" : "border-ink-600 text-hobun-dim";
  const label = status === "derived" && derivedOverride ? derivedOverride : t(STATUS_KEYS[status]);

  return (
    <span
      data-evidence-status={status}
      className={`inline-flex items-center border px-2 py-1 font-mono text-[12px] tracking-wide ${toneClass}`}
    >
      {label}
    </span>
  );
}
