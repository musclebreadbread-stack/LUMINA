import "server-only";

import type { YearForecast } from "@engine/saju/yearForecast";
import { aiFactsSchema, type AIFact, type AIFacts } from "./types";

function makeFact(
  id: string,
  lane: AIFact["lane"],
  value: string,
  evidenceRef: AIFact["evidenceRef"],
  tier: AIFact["tier"] = "core",
): AIFact {
  return { id, lane, tier, value, evidenceRef };
}

function categoryValue(value: string): string {
  return value.normalize("NFC").replace(/[^\p{L}\p{M}_: -]/gu, "").slice(0, 80).trim();
}

export function buildYearForecastFacts(forecast: YearForecast): AIFacts {
  if (forecast.expertReviewStatus !== "pending") {
    throw new Error("Unexpected year forecast review state");
  }
  const facts: AIFact[] = [
    makeFact("annual.pillar", "annual", categoryValue(forecast.annual.labelHanja), "annual-pillar"),
    makeFact("annual.stem-god", "annual", forecast.annual.stemTenGod, "annual-ten-gods"),
    makeFact("annual.branch-god", "annual", forecast.annual.branchTenGod, "annual-ten-gods"),
    makeFact("annual.stage", "annual", forecast.annual.stage, "annual-stage"),
    makeFact("work.stem-god", "work", forecast.annual.stemTenGod, "annual-ten-gods"),
    makeFact("work.branch-god", "work", forecast.annual.branchTenGod, "annual-ten-gods"),
    makeFact("work.luck-overlap", "work", forecast.luckOverlap.status === "unavailable-time-unknown"
      ? "unavailable-time-unknown"
      : forecast.luckOverlap.periods.length > 0 ? "overlap-present" : "no-overlap",
    "major-luck-overlap", "supporting"),
    makeFact("wellbeing.annual-stage", "wellbeing", forecast.annual.stage, "annual-stage"),
    makeFact("growth.annual-gods", "growth", `${forecast.annual.stemTenGod}:${forecast.annual.branchTenGod}`, "annual-ten-gods"),
  ];

  for (const month of forecast.months) {
    const suffix = String(month.ordinal + 1).padStart(2, "0");
    const pillar = categoryValue(month.labelHanja);
    facts.push(
      makeFact(`month.${suffix}.pillar`, "monthly", pillar, "monthly-pillar", "supporting"),
      makeFact(`month.${suffix}.stem-god`, "monthly", month.stemTenGod, "monthly-ten-gods"),
      makeFact(`month.${suffix}.branch-god`, "monthly", month.branchTenGod, "monthly-ten-gods", "supporting"),
      makeFact(`month.${suffix}.stage`, "monthly", month.stage, "monthly-stage", "supporting"),
    );
  }

  if (forecast.natalBranchRelations.length > 0) {
    for (const [index, relation] of forecast.natalBranchRelations.entries()) {
      const value = categoryValue(`${relation.natalPillar}:${relation.relation.kind}`);
      facts.push(makeFact(`relationship.relation-${index + 1}`, "relationships", value, "natal-branch-relations", "supporting"));
    }
  } else {
    facts.push(makeFact("relationship.none-found", "relationships", "no-relation-match", "natal-branch-relations", "supporting"));
  }

  return aiFactsSchema.parse(facts);
}
