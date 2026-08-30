import type { Citation } from "@engine/shared/citation";

export const SCHUTTE_ET_AL_1998: Citation = Object.freeze({
  authors: Object.freeze([
    "Schutte, N. S.",
    "Malouff, J. M.",
    "Hall, L. E.",
    "Haggerty, D. J.",
    "Cooper, J. T.",
    "Golden, C. J.",
    "Dornheim, L.",
  ]),
  year: 1998,
  title: "Development and validation of a measure of emotional intelligence",
  venue: "Personality and Individual Differences, 25(2), 167-177",
  url: "https://doi.org/10.1016/S0191-8869(98)00001-4",
});

export const CIARROCHI_CHAN_BAJGAR_2001: Citation = Object.freeze({
  authors: Object.freeze(["Ciarrochi, J.", "Chan, A. Y. C.", "Bajgar, J."]),
  year: 2001,
  title: "Measuring emotional intelligence in adolescents",
  venue: "Personality and Individual Differences, 31(7), 1105-1119",
  url: "https://doi.org/10.1016/S0191-8869(00)00207-5",
});

export const SALOVEY_MAYER_1990: Citation = Object.freeze({
  authors: Object.freeze(["Salovey, P.", "Mayer, J. D."]),
  year: 1990,
  title: "Emotional intelligence",
  venue: "Imagination, Cognition and Personality, 9(3), 185-211",
  url: "https://doi.org/10.2190/DUGG-P24E-52WK-6CDG",
});

export const EQ_CITATIONS: readonly Citation[] = Object.freeze([
  SCHUTTE_ET_AL_1998,
  CIARROCHI_CHAN_BAJGAR_2001,
  SALOVEY_MAYER_1990,
]);
