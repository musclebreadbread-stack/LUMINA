import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BGM_PLAYLIST } from "../bgm";

describe("BGM playlist", () => {
  it("lists exactly the two shared tracks in playback order", () => {
    expect(BGM_PLAYLIST).toEqual([
      { id: "track-1", src: "/audio/bgm/track-1.mp3" },
      { id: "track-2", src: "/audio/bgm/track-2.mp3" },
    ]);
  });

  it("ships every playlist MP3 under public/audio/bgm", () => {
    for (const track of BGM_PLAYLIST) {
      const relativePath = track.src.replace(/^\//u, "");
      const filePath = path.resolve(process.cwd(), "public", relativePath);
      expect(existsSync(filePath), `${track.id} asset is missing`).toBe(true);
      expect(statSync(filePath).size, `${track.id} asset is empty`).toBeGreaterThan(0);
    }
  });
});
