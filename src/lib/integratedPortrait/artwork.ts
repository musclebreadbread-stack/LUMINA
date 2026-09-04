import type { PortraitArtworkKey } from "./contracts";

export interface PortraitArtworkDefinition {
  readonly key: PortraitArtworkKey;
  readonly src: string;
  readonly width: 768;
  readonly height: 1152;
}

/** Keep this order aligned with the public integrated-portrait lanes. */
export const PORTRAIT_ARTWORK_KEYS = Object.freeze([
  "saju",
  "astro",
  "numerology",
  "psychometrics",
  "jungian",
  "darktriad",
  "attachment",
  "eq",
] as const satisfies readonly PortraitArtworkKey[]);

const definitions = {
  saju: {
    key: "saju",
    src: "/integrated-portrait/saju.webp",
    width: 768,
    height: 1152,
  },
  astro: {
    key: "astro",
    src: "/integrated-portrait/astro.webp",
    width: 768,
    height: 1152,
  },
  numerology: {
    key: "numerology",
    src: "/integrated-portrait/numerology.webp",
    width: 768,
    height: 1152,
  },
  psychometrics: {
    key: "psychometrics",
    src: "/integrated-portrait/psychometrics.webp",
    width: 768,
    height: 1152,
  },
  jungian: {
    key: "jungian",
    src: "/integrated-portrait/jungian.webp",
    width: 768,
    height: 1152,
  },
  darktriad: {
    key: "darktriad",
    src: "/integrated-portrait/darktriad.webp",
    width: 768,
    height: 1152,
  },
  attachment: {
    key: "attachment",
    src: "/integrated-portrait/attachment.webp",
    width: 768,
    height: 1152,
  },
  eq: {
    key: "eq",
    src: "/integrated-portrait/eq.webp",
    width: 768,
    height: 1152,
  },
} as const satisfies Record<PortraitArtworkKey, PortraitArtworkDefinition>;

export const PORTRAIT_ARTWORK = Object.freeze(definitions);

export function portraitArtwork(key: PortraitArtworkKey): PortraitArtworkDefinition {
  return PORTRAIT_ARTWORK[key];
}
