import type { Citation } from "@engine/shared/citation";
import { SAJU_CITATIONS } from "@engine/saju/citations";
import { ASTRO_CITATIONS } from "@engine/astro/citations";
import { TAROT_CITATIONS } from "@engine/tarot/citations";
import { NUMEROLOGY_CITATIONS } from "@engine/numerology/citations";
import {
  MCCRAE_COSTA_1989,
  PITTENGER_1993,
  PSYCHOMETRIC_CITATIONS,
  STEIN_SWAN_2019,
} from "@engine/psychometrics/citations";
import { HOROSCOPE_CITATIONS } from "@engine/horoscope/citations";
import { DARK_TRIAD_CITATIONS } from "@engine/darktriad/citations";
import { ATTACHMENT_CITATIONS } from "@engine/attachment/citations";
import { SAJU_TRADITION_CITATIONS } from "@engine/saju/citations";

export type ReferenceGroupKey =
  | "saju"
  | "astro"
  | "tarot"
  | "numerology"
  | "psychometrics"
  | "jungian"
  | "darktriad"
  | "attachment"
  | "horoscope"
  | "compatibility";

export interface ReferenceGroup {
  readonly key: ReferenceGroupKey;
  readonly citations: readonly Citation[];
}

export const REFERENCE_GROUPS: readonly ReferenceGroup[] = Object.freeze([
  Object.freeze({ key: "saju" as const, citations: SAJU_CITATIONS }),
  Object.freeze({ key: "astro" as const, citations: ASTRO_CITATIONS }),
  Object.freeze({ key: "tarot" as const, citations: TAROT_CITATIONS }),
  Object.freeze({ key: "numerology" as const, citations: NUMEROLOGY_CITATIONS }),
  Object.freeze({ key: "psychometrics" as const, citations: PSYCHOMETRIC_CITATIONS }),
  Object.freeze({
    key: "jungian" as const,
    citations: Object.freeze([MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]),
  }),
  Object.freeze({ key: "darktriad" as const, citations: DARK_TRIAD_CITATIONS }),
  Object.freeze({ key: "attachment" as const, citations: ATTACHMENT_CITATIONS }),
  Object.freeze({ key: "horoscope" as const, citations: HOROSCOPE_CITATIONS }),
  Object.freeze({ key: "compatibility" as const, citations: SAJU_TRADITION_CITATIONS }),
]);
