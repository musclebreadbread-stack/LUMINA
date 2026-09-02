import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { allCharacters } from "@engine/characters";
import { CHARACTER_ARTWORK_PATHS, characterArtworkPath } from "../characterArtwork";

describe("character artwork manifest", () => {
  it("maps every character definition to one local WebP asset", () => {
    const characters = allCharacters();

    expect(Object.keys(CHARACTER_ARTWORK_PATHS)).toHaveLength(characters.length);
    expect(
      characters.every((character) => {
        const artworkPath = characterArtworkPath(character.id);
        return (
          artworkPath.endsWith(`/${character.id}.webp`) &&
          existsSync(resolve(process.cwd(), "public", artworkPath.slice(1))) &&
          statSync(resolve(process.cwd(), "public", artworkPath.slice(1))).size > 0
        );
      }),
    ).toBe(true);
  });

  it("does not create a request for an unknown character", () => {
    expect(characterArtworkPath("unknown-character")).toBe("");
  });
});
