import { getLocale, getTranslations } from "next-intl/server";
import { SIGNS } from "@engine/astro/constants";
import { branchAt, stemAt, TWELVE_STAGE_EN } from "@engine/saju/constants";
import { pillarFromSexagenary } from "@engine/saju/pillars";
import type { DailyReadingLine, ReadingEvidence, ReadingSlot } from "@engine/horoscope";
import type { Locale } from "@/i18n/locale";
import { OverflowFade } from "@/components/ui/OverflowFade";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function subjectLabel(subject: string, locale: Locale, t: Awaited<ReturnType<typeof getTranslations<"horoscopeReading">>>): string {
  const key: Record<string, string> = {
    moon: "evidenceMoon",
    sun: "evidenceSun",
    mercury: "evidenceMercury",
    mars: "evidenceMars",
    "branch-relation": "evidenceBranchRelation",
    "void-branches": "evidenceVoidBranches",
    "twelve-stage": "evidenceTwelveStage",
    sign: "evidenceSign",
  };
  const messageKey = key[subject];
  if (messageKey) return t(messageKey);
  return locale === "en" ? subject : subject;
}

function valueLabel(value: string, locale: Locale, t: Awaited<ReturnType<typeof getTranslations<"horoscopeReading">>>): string {
  if (value.startsWith("zodiac-sign:")) {
    const index = Number(value.slice("zodiac-sign:".length));
    const sign = SIGNS[index];
    return sign ? (locale === "en" ? sign.en : sign.ko) : value;
  }
  if (value.startsWith("aspect:")) {
    const key = value.slice("aspect:".length);
    const aspectKeys: Record<string, string> = {
      conjunction: "evidenceAspectConjunction",
      square: "evidenceAspectSquare",
      trine: "evidenceAspectTrine",
      sextile: "evidenceAspectSextile",
      opposition: "evidenceAspectOpposition",
    };
    return aspectKeys[key] ? t(aspectKeys[key]) : value;
  }
  if (value.startsWith("natal-aspect:")) {
    const key = value.slice("natal-aspect:".length);
    const aspectKeys: Record<string, string> = {
      conjunction: "evidenceAspectConjunction",
      square: "evidenceAspectSquare",
      trine: "evidenceAspectTrine",
      sextile: "evidenceAspectSextile",
      opposition: "evidenceAspectOpposition",
    };
    return aspectKeys[key] ? t(aspectKeys[key]) : value;
  }
  if (value === "retrograde") return t("evidenceRetrograde");
  if (value.startsWith("relation:")) {
    const key = value.slice("relation:".length);
    const relationKeys: Record<string, string> = {
      clash: "evidenceRelationClash",
      combination: "evidenceRelationCombination",
      trine: "evidenceRelationTrine",
      punishment: "evidenceRelationPunishment",
      harm: "evidenceRelationHarm",
      destruction: "evidenceRelationDestruction",
    };
    return relationKeys[key] ? t(relationKeys[key]) : value;
  }
  if (value.startsWith("stage:")) {
    const stage = value.slice("stage:".length);
    return locale === "en" ? (TWELVE_STAGE_EN[stage] ?? stage) : stage;
  }
  if (value.startsWith("branches:")) return value.slice("branches:".length);
  if (value.startsWith("day-pillar:")) {
    const index = Number(value.slice("day-pillar:".length));
    const pillar = pillarFromSexagenary(index);
    const stem = stemAt(pillar.stem);
    const branch = branchAt(pillar.branch);
    return locale === "en"
      ? `${stem.en}${branch.en}`
      : `${stem.hanja}${branch.hanja}`;
  }
  if (value.startsWith("zodiac:")) return value.slice("zodiac:".length);
  return titleCase(value);
}

const SLOT_LABEL_KEYS: Readonly<Record<ReadingSlot, "moodLabel" | "relationshipLabel" | "workLabel" | "tipLabel">> = Object.freeze({
  mood: "moodLabel",
  relationship: "relationshipLabel",
  work: "workLabel",
  tip: "tipLabel",
});

export async function EvidenceTable({
  evidence,
  lines,
}: {
  readonly evidence: readonly ReadingEvidence[];
  readonly lines: Readonly<Record<ReadingSlot, DailyReadingLine>>;
}) {
  const locale = (await getLocale()) as Locale;
  const [t, tHoroscope] = await Promise.all([
    getTranslations("horoscopeReading"),
    getTranslations("horoscope"),
  ]);
  const linesByEvidence = new Map<string, DailyReadingLine[]>();
  for (const line of Object.values(lines)) {
    const existing = linesByEvidence.get(line.evidenceId) ?? [];
    existing.push(line);
    linesByEvidence.set(line.evidenceId, existing);
  }

  return (
    <OverflowFade className="overflow-x-auto">
      <p className="mb-4 max-w-2xl text-xs leading-relaxed text-hobun-faint">{t("evidenceSelectionNote")}</p>
      <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
        <caption className="mb-4 text-left text-xs text-hobun-faint">{t("evidenceCaption")}</caption>
        <thead>
          <tr className="border-b border-ink-700 text-hobun-faint">
            <th className="py-2 pr-4 font-normal">{t("evidenceSource")}</th>
            <th className="py-2 pr-4 font-normal">{t("evidenceSubject")}</th>
            <th className="py-2 font-normal">{t("evidenceValue")}</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((item) => (
            <tr key={item.id} className="border-b border-ink-800">
              <td className="py-2.5 pr-4 text-hobun-dim">
                {item.source === "sky"
                  ? t("evidenceSky")
                  : item.source === "day"
                    ? t("evidenceDay")
                    : t("evidenceReference")}
              </td>
              <td className="py-2.5 pr-4 text-hobun-dim">{subjectLabel(item.subject, locale, t)}</td>
              <td className="py-2.5 text-hobun">
                {valueLabel(item.value, locale, t)}
                {item.numericValue !== null ? (
                  <span className="ml-2 font-mono text-xs text-hobun-faint">
                    {item.numericValue.toFixed(2)}
                  </span>
                ) : null}
                {linesByEvidence.get(item.id)?.map((line) => (
                  <p key={`${item.id}-${line.id}`} className="mt-1 text-[11px] leading-relaxed text-hobun-faint">
                    {t("evidenceSelection", {
                      slot: tHoroscope(SLOT_LABEL_KEYS[line.slot]),
                      score: line.score.toFixed(2),
                      base: line.baseScore.toFixed(2),
                      weight: line.slotWeight.toFixed(2),
                    })}
                  </p>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </OverflowFade>
  );
}
