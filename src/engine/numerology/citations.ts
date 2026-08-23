import type { Citation } from "@engine/shared/citation";

export const IAMBLICHUS_1988: Citation = Object.freeze({
  authors: ["Iamblichus"],
  year: 1988,
  title: "On the Pythagorean life",
  venue: "Society of Biblical Literature",
});

export const BALLIETT_1908: Citation = Object.freeze({
  authors: ["Balliett, L. D."],
  year: 1908,
  title: "The philosophy of numbers",
  venue: "Historical numerology text",
});

export const NUMEROLOGY_CITATIONS: readonly Citation[] = Object.freeze([
  IAMBLICHUS_1988,
  BALLIETT_1908,
]);
