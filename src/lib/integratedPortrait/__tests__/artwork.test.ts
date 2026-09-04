import { describe, expect, it } from "vitest";
import {
  PORTRAIT_ARTWORK,
  PORTRAIT_ARTWORK_KEYS,
  portraitArtwork,
} from "../artwork";

describe("integrated portrait artwork manifest", () => {
  it("covers every approved integrated portrait lens", () => {
    expect(PORTRAIT_ARTWORK_KEYS).toHaveLength(8);

    for (const key of PORTRAIT_ARTWORK_KEYS) {
      expect(PORTRAIT_ARTWORK[key]).toMatchObject({
        key,
        src: `/integrated-portrait/${key}.webp`,
        width: 768,
        height: 1152,
      });
    }
  });

  it("returns a stable local definition by lens key", () => {
    expect(portraitArtwork("eq")).toEqual(PORTRAIT_ARTWORK.eq);
  });
});
