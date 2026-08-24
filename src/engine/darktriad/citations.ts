import type { Citation } from "@engine/shared/citation";

export const JONES_PAULHUS_2014: Citation = Object.freeze({
  authors: Object.freeze(["Jones, D. N.", "Paulhus, D. L."]),
  year: 2014,
  title: "Introducing the Short Dark Triad (SD3): A brief measure of dark personality traits",
  venue: "Assessment, 21(1), 28-41",
  url: "https://doi.org/10.1177/1073191113514105",
});

export const PARK_LEE_OH_2021: Citation = Object.freeze({
  authors: Object.freeze([
    "Park, ChongChol",
    "Lee, DongGwi",
    "Oh, HyunJoo",
    "Lee, NaHee",
    "Sohn, HaRim",
    "Bae, ByeongHun",
  ]),
  year: 2021,
  title: "Factor Structure and Validity Estimates of the Korean Version of the Short Dark Triad",
  venue: "Korean Journal of Industrial and Organizational Psychology, 34(3), 511-539",
  url: "https://doi.org/10.24230/kjiop.v34i3.511-539",
});

export const DARK_TRIAD_CITATIONS: readonly Citation[] = Object.freeze([
  JONES_PAULHUS_2014,
  PARK_LEE_OH_2021,
]);
