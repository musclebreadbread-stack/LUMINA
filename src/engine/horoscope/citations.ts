import type { Citation } from "@engine/shared/citation";
import {
  ASTRONOMIA,
  ASTRONOMY_ENGINE,
  MEEUS_1998,
  PTOLEMY_1940,
} from "@engine/astro/citations";
import { LUNAR_JAVASCRIPT } from "@engine/saju/citations";

/**
 * References used by the calculated daily-reading route.
 *
 * These sources document astronomical/calendar algorithms or historical
 * symbolic language; they do not validate predictive claims.
 */
export const HOROSCOPE_CALCULATION_CITATIONS: readonly Citation[] = Object.freeze([
  ASTRONOMY_ENGINE,
  ASTRONOMIA,
  MEEUS_1998,
  LUNAR_JAVASCRIPT,
]);

export const HOROSCOPE_TRADITION_CITATIONS: readonly Citation[] = Object.freeze([
  PTOLEMY_1940,
]);

export const HOROSCOPE_CITATIONS: readonly Citation[] = Object.freeze([
  ...HOROSCOPE_CALCULATION_CITATIONS,
  ...HOROSCOPE_TRADITION_CITATIONS,
]);
