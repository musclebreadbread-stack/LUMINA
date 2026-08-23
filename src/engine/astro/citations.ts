import type { Citation } from "@engine/shared/citation";

export const ASTRONOMY_ENGINE: Citation = Object.freeze({
  authors: ["R. M. Sinnott"],
  year: 2024,
  title: "Astronomy Engine: high-precision astronomy library",
  venue: "GitHub repository",
  url: "https://github.com/cosinekitty/astronomy",
});

export const ASTRONOMIA: Citation = Object.freeze({
  authors: ["B. Schaefer"],
  year: 2024,
  title: "astronomia: astronomy algorithms for JavaScript",
  venue: "GitHub repository",
  url: "https://github.com/commenthol/astronomia",
});

export const MEEUS_1998: Citation = Object.freeze({
  authors: ["Meeus, J."],
  year: 1998,
  title: "Astronomical algorithms (2nd ed.)",
  venue: "Willmann-Bell",
});

export const BRETAGNON_FRANCOU_1988: Citation = Object.freeze({
  authors: ["Bretagnon, P.", "Francou, G."],
  year: 1988,
  title: "Planetary theories in rectangular and spherical variables: VSOP87 solutions",
  venue: "Astronomy and Astrophysics, 202, 309–315",
});

export const PTOLEMY_1940: Citation = Object.freeze({
  authors: ["Ptolemy, C."],
  year: 1940,
  title: "Tetrabiblos",
  venue: "Loeb Classical Library, Harvard University Press",
});

export const SWISS_EPHEMERIS_HOUSES: Citation = Object.freeze({
  authors: ["Astrodienst"],
  year: 2024,
  title: "Swiss Ephemeris house calculation reference implementation",
  venue: "GitHub repository",
  url: "https://github.com/astrotools/SwissEphemeris/blob/master/swisseph/swehouse.c",
});

export const ASTRO_CALCULATION_CITATIONS: readonly Citation[] = Object.freeze([
  ASTRONOMY_ENGINE,
  MEEUS_1998,
  BRETAGNON_FRANCOU_1988,
  ASTRONOMIA,
  SWISS_EPHEMERIS_HOUSES,
]);

export const ASTRO_TRADITION_CITATIONS: readonly Citation[] = Object.freeze([PTOLEMY_1940]);

export const ASTRO_CITATIONS: readonly Citation[] = Object.freeze([
  ...ASTRO_CALCULATION_CITATIONS,
  ...ASTRO_TRADITION_CITATIONS,
]);
