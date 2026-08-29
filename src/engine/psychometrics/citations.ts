import type { Citation } from "@engine/shared/citation";

export const GOLDBERG_1992: Citation = Object.freeze({
  authors: Object.freeze(["Goldberg, L. R."]),
  year: 1992,
  title: "The development of markers for the Big-Five factor structure",
  venue: "Psychological Assessment, 4(1), 26–42",
  url: "https://doi.org/10.1037/1040-3590.4.1.26",
});

export const GOW_2005: Citation = Object.freeze({
  authors: Object.freeze(["Gow, A. J.", "Whiteman, M. C.", "Pattie, A.", "Deary, I. J."]),
  year: 2005,
  title: "Goldberg's IPIP Big-Five factor markers: Internal consistency and concurrent validation in Scotland",
  venue: "Personality and Individual Differences, 39(2), 317–329",
  url: "https://doi.org/10.1016/j.paid.2005.01.011",
});

export const IPIP_TABLE: Citation = Object.freeze({
  authors: Object.freeze(["International Personality Item Pool"]),
  year: 2026,
  title: "Big Five broad-domain scale characteristics",
  venue: "Oregon Research Institute IPIP reference table",
  url: "https://ipip.ori.org/newBigFive5broadTable.htm",
});

export const OPEN_PSYCHOMETRICS_DATA: Citation = Object.freeze({
  authors: Object.freeze(["Open Source Psychometrics Project"]),
  year: 2018,
  title: "IPIP-FFM-data-8Nov2018",
  venue: "Anonymous public response dataset",
  url: "https://openpsychometrics.org/_rawdata/",
});

/** The primary comparison paper behind the MBTI-style four-axis interpretation. */
export const MCCRAE_COSTA_1989: Citation = Object.freeze({
  authors: Object.freeze(["McCrae, R. R.", "Costa, P. T., Jr."]),
  year: 1989,
  title: "Reinterpreting the Myers-Briggs Type Indicator From the Perspective of the Five-Factor Model of Personality",
  venue: "Journal of Personality, 57(1), 17–40",
  url: "https://doi.org/10.1111/j.1467-6494.1989.tb00759.x",
});

export const PITTENGER_1993: Citation = Object.freeze({
  authors: Object.freeze(["Pittenger, D. J."]),
  year: 1993,
  title: "Measuring the MBTI... And coming up short",
  venue: "Journal of Career Planning and Employment, 54(1), 48–52",
});

export const STEIN_SWAN_2019: Citation = Object.freeze({
  authors: Object.freeze(["Stein, R. T.", "Swan, A. B."]),
  year: 2019,
  title: "Evaluating the validity of Myers-Briggs Type Indicator theory: A teaching tool and window into intuitive psychology",
  venue: "Social and Personality Psychology Compass, 13(2), e12434",
  url: "https://doi.org/10.1111/spc3.12434",
});

/** The Neuroticism aspect structure (Withdrawal vs. Volatility) behind the VW axis. */
export const DEYOUNG_QUILTY_PETERSON_2007: Citation = Object.freeze({
  authors: Object.freeze(["DeYoung, C. G.", "Quilty, L. C.", "Peterson, J. B."]),
  year: 2007,
  title: "Between facets and domains: 10 aspects of the Big Five",
  venue: "Journal of Personality and Social Psychology, 93(5), 880–896",
  url: "https://doi.org/10.1037/0022-3514.93.5.880",
});

export const PSYCHOMETRIC_CITATIONS: readonly Citation[] = Object.freeze([
  GOLDBERG_1992,
  GOW_2005,
  IPIP_TABLE,
  OPEN_PSYCHOMETRICS_DATA,
  MCCRAE_COSTA_1989,
  PITTENGER_1993,
  STEIN_SWAN_2019,
  DEYOUNG_QUILTY_PETERSON_2007,
]);
