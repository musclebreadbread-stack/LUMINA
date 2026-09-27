import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BGM_PLAYLIST } from "../bgm";

describe("BGM playlist", () => {
  it("uses only the supplied track across the site", () => {
    expect(BGM_PLAYLIST).toEqual([
      { id: "digital-observatory", src: "/audio/bgm/digital-observatory.mp3" },
    ]);
  });

  it("ships the supplied MP3 under public/audio/bgm", () => {
    for (const track of BGM_PLAYLIST) {
      const relativePath = track.src.replace(/^\//u, "");
      const filePath = path.resolve(process.cwd(), "public", relativePath);
      expect(existsSync(filePath), `${track.id} asset is missing`).toBe(true);
      expect(statSync(filePath).size, `${track.id} asset is empty`).toBeGreaterThan(0);
    }
  });
});
