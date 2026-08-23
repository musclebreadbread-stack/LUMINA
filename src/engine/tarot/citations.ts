import type { Citation } from "@engine/shared/citation";

export const WAITE_1910: Citation = Object.freeze({
  authors: ["Waite, A. E."],
  year: 1910,
  title: "The pictorial key to the Tarot",
  venue: "William Rider and Son",
  url: "https://archive.org/details/pictorialkeytota00wait",
});

export const DECKER_2013: Citation = Object.freeze({
  authors: ["Decker, R.", "Dummett, M."],
  year: 2013,
  title: "A history of the occult Tarot",
  venue: "Duckworth Overlook",
});

export const TAROT_CITATIONS: readonly Citation[] = Object.freeze([WAITE_1910, DECKER_2013]);
