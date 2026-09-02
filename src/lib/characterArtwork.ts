import { allCharacters } from "@engine/characters";
import { assetPath } from "@/lib/assets";

/**
 * 엔진에 정의된 캐릭터 ID와 도감 원화의 매핑.
 *
 * 도감의 이름·설명은 엔진 정의와 번역에서 오고, 이미지는 엔진 ID에서 자동으로 파생한다.
 * 새 캐릭터를 추가해도 매핑 코드가 누락되지 않으며, 자산 존재 여부는 manifest 테스트가 검증한다.
 */
export const CHARACTER_ARTWORK_PATHS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    allCharacters().map((character) => [character.id, assetPath("characters", character.id)] as const),
  ),
);

export function characterArtworkPath(id: string): string {
  return CHARACTER_ARTWORK_PATHS[id] ?? "";
}
