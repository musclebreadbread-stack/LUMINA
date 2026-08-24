import type { Citation } from "@engine/shared/citation";

export const FRALEY_WALLER_BRENNAN_2000: Citation = Object.freeze({
  authors: Object.freeze(["Fraley, R. C.", "Waller, N. G.", "Brennan, K. A."]),
  year: 2000,
  title: "The Experiences in Close Relationships-Revised (ECR-R) Questionnaire",
  venue: "University of Illinois at Urbana-Champaign measure documentation",
  url: "https://labs.psychology.illinois.edu/~rcfraley/measures/ecrritems.htm",
});

export const LEE_KIM_SHIN_2023: Citation = Object.freeze({
  authors: Object.freeze(["Lee, Ji-yeon", "Kim, Yun-Kyung", "Shin, Yun-Jeong"]),
  year: 2023,
  title: "Validation of the Korean Version of Culturally Responsive Experiences in Close Relationships-Short Form",
  venue: "International Journal for the Advancement of Counselling, 45(1), 57-81",
  url: "https://doi.org/10.1007/s10447-023-09503-6",
});

export const ATTACHMENT_CITATIONS: readonly Citation[] = Object.freeze([
  FRALEY_WALLER_BRENNAN_2000,
  LEE_KIM_SHIN_2023,
]);
