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
import { EQ_CITATIONS } from "@engine/eq/citations";
import { COGNITIVE_CITATIONS } from "@engine/cognitive/citations";
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
  | "eq"
  | "cognitive"
  | "horoscope"
  | "compatibility";

export interface ReferenceGroup {
  readonly key: ReferenceGroupKey;
  readonly citations: readonly Citation[];
  /**
   * 문헌 목록이 문항 자체의 출처가 아닐 때 함께 실어야 하는 한 줄(루트 메시지 기준 전체 경로).
   *
   * /references는 모든 분석의 문헌을 같은 모양으로 늘어놓기 때문에, 아무 말이 없으면
   * "이 문헌에서 문항을 가져왔다"로 읽힌다. 결과 페이지에는 같은 문구가 이미 있지만
   * 출처 목록만 보고 나가는 사람에게는 닿지 않는다.
   */
  readonly scopeNoteKey?: string;
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
  Object.freeze({ key: "eq" as const, citations: EQ_CITATIONS }),
  // 문항 형식의 출처이지 문항 자체의 출처가 아니다 — citations.ts 헤더가 그 구분을 적어 두었다.
  Object.freeze({
    key: "cognitive" as const,
    citations: COGNITIVE_CITATIONS,
    scopeNoteKey: "cognitive.citationScopeNote",
  }),
  Object.freeze({ key: "horoscope" as const, citations: HOROSCOPE_CITATIONS }),
  Object.freeze({ key: "compatibility" as const, citations: SAJU_TRADITION_CITATIONS }),
]);
