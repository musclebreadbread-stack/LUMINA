import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BGM_TRACKS, bgmAreaForPath, type BgmArea } from "@/lib/bgm";

const AREAS: readonly BgmArea[] = [
  "home",
  "saju",
  "astro",
  "tarot",
  "numerology",
  "psychometrics",
  "jungian",
  "darktriad",
  "attachment",
  "eq",
  "cognitive",
  "horoscope",
  "compatibility",
];

describe("BGM route catalogue", () => {
  it("contains one local MP3 for every exploration area", () => {
    expect(Object.keys(BGM_TRACKS).sort()).toEqual([...AREAS].sort());
    for (const area of AREAS) {
      expect(BGM_TRACKS[area].src).toBe(`/audio/bgm/${area}.mp3`);
    }
  });

  it("ships every mapped MP3 under public/audio/bgm", () => {
    for (const area of AREAS) {
      const relativePath = BGM_TRACKS[area].src.replace(/^\//u, "");
      const filePath = path.resolve(process.cwd(), "public", relativePath);
      expect(existsSync(filePath), `${area} asset is missing`).toBe(true);
      expect(statSync(filePath).size, `${area} asset is empty`).toBeGreaterThan(0);
    }
  });

  it.each([
    ["/", "home"],
    ["/en", "home"],
    ["/saju", "saju"],
    ["/en/astro", "astro"],
    ["/tarot/celtic-cross/seed", "tarot"],
    ["/numerology/result", "numerology"],
    ["/psychometrics", "psychometrics"],
    ["/psychometrics/types/result", "jungian"],
    ["/darktriad/result", "darktriad"],
    ["/attachment/result", "attachment"],
    ["/eq/result", "eq"],
    ["/cognitive/run/abc", "cognitive"],
    ["/horoscope/zodiac/aries", "horoscope"],
    ["/compatibility/a/b", "compatibility"],
    ["/r/encoded", "saju"],
    ["/en/r/encoded/astro", "astro"],
    ["/r/encoded/today", "horoscope"],
    ["/s/bigfive/code", "psychometrics"],
    ["/en/s/jungian/code", "jungian"],
    ["/about", "home"],
  ] as const)("maps %s to %s", (pathname, expected) => {
    expect(bgmAreaForPath(pathname)).toBe(expected);
  });
});
