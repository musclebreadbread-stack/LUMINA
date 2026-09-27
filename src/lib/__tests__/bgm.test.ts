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
const SHARED_TRACK_SRC = "/audio/bgm/digital-observatory.mp3";

describe("BGM route catalogue", () => {
  it("uses the supplied track for every exploration area", () => {
    expect(Object.keys(BGM_TRACKS).sort()).toEqual([...AREAS].sort());
    for (const area of AREAS) {
      expect(BGM_TRACKS[area].src).toBe(SHARED_TRACK_SRC);
    }
  });

  it("ships the shared MP3 under public/audio/bgm", () => {
    const relativePath = SHARED_TRACK_SRC.replace(/^\//u, "");
    const filePath = path.resolve(process.cwd(), "public", relativePath);
    expect(existsSync(filePath), "Digital Observatory asset is missing").toBe(true);
    expect(statSync(filePath).size, "Digital Observatory asset is empty").toBeGreaterThan(0);
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

  it("maps the query-based Jungian landing page to the Jungian track", () => {
    expect(bgmAreaForPath("/psychometrics", "to=types")).toBe("jungian");
    expect(bgmAreaForPath("/en/psychometrics", "to=types")).toBe("jungian");
    expect(bgmAreaForPath("/psychometrics", "to=bigfive")).toBe("psychometrics");
  });
});
