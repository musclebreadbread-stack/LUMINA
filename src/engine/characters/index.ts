import type { EvidenceTier } from "@engine/shared/tier";
import type { FiveElement } from "@engine/saju/constants";
import type { SajuResult } from "@engine/saju";

/**
 * 캐릭터 해석기 (CharacterResolver).
 *
 * 엔진의 구조화 출력을 캐릭터 하나로 사상한다. 규칙은 두 축뿐이다 —
 * 가장 강한 오행이 "무엇으로" 생겼는지를, 일간 세력이 "어떻게 움직이는지"를 정한다.
 * 두 축 모두 엔진이 이미 계산한 값이라 캐릭터가 결과와 어긋날 수 없다.
 *
 * 세력은 좋고 나쁨이 아니라 기운이 놓인 방식이다. 이름과 소개문에 우열의 뉘앙스를
 * 남기지 않는다 — 플랫폼의 결정론적·공포 유발 표현 금지 정책과 같은 이유다.
 */

export type CharacterStrength = "strong" | "balanced" | "weak";

export interface CharacterDef {
  /** `${element}-${strength}` — 15가지 조합의 안정적 키 */
  readonly id: string;
  readonly element: FiveElement;
  readonly strength: CharacterStrength;
  readonly name: string;
  readonly nameEn: string;
  readonly hanja: string;
  /** 한 줄 소개. 단정하지 않고 경향으로 쓴다. */
  readonly tagline: string;
  readonly taglineEn: string;
  /** 이 캐릭터가 오게 된 이유 — 화면에 그대로 노출한다. */
  readonly because: string;
  readonly becauseEn: string;
}

const STRENGTH_MOTION: Readonly<Record<CharacterStrength, string>> = Object.freeze({
  strong: "스스로 밀고 나가는",
  balanced: "고르게 도는",
  weak: "둘레와 어울리는",
});

const STRENGTH_MOTION_EN: Readonly<Record<CharacterStrength, string>> = Object.freeze({
  strong: "self-propelling",
  balanced: "evenly circulating",
  weak: "surroundings-attuned",
});

function def(
  element: FiveElement,
  strength: CharacterStrength,
  name: string,
  nameEn: string,
  hanja: string,
  tagline: string,
  taglineEn: string,
): CharacterDef {
  return Object.freeze({
    id: `${element}-${strength}`,
    element,
    strength,
    name,
    nameEn,
    hanja,
    tagline,
    taglineEn,
    because: `${STRENGTH_MOTION[strength]} 기운`,
    becauseEn: `${STRENGTH_MOTION_EN[strength]} energy`,
  });
}

/** 오행 5 × 세력 3 = 15. 빠진 조합이 없어야 한다. */
export const CHARACTERS: readonly CharacterDef[] = Object.freeze([
  def("wood", "strong", "큰그루", "Big Trunk", "大株", "자리를 스스로 넓혀 가는 편입니다", "Tends to widen its own ground."),
  def("wood", "balanced", "새순", "New Shoot", "新芽", "필요한 만큼만 뻗는 편입니다", "Tends to reach only as far as it needs."),
  def("wood", "weak", "덩굴", "Vine", "蔓", "곁을 타고 함께 오르는 편입니다", "Tends to climb alongside whatever is near."),

  def("fire", "strong", "화톳불", "Bonfire", "篝火", "멀리까지 온기를 보내는 편입니다", "Tends to send its warmth out far."),
  def("fire", "balanced", "등불", "Lamp", "燈", "꺼지지 않게 지켜 두는 편입니다", "Tends to keep itself from going out."),
  def("fire", "weak", "잉걸", "Ember", "熾", "재 속에서 오래 남는 편입니다", "Tends to linger long within the ash."),

  def("earth", "strong", "너른들", "Broad Field", "原", "무엇이든 일단 받아 두는 편입니다", "Tends to take in whatever comes, first."),
  def("earth", "balanced", "두둑", "Furrow", "畦", "물길과 뿌리를 갈라 놓는 편입니다", "Tends to keep water and root apart, each in its place."),
  def("earth", "weak", "고운흙", "Fine Soil", "壤", "손길을 따라 모양이 잡히는 편입니다", "Tends to take shape under a guiding hand."),

  def("metal", "strong", "쇠북", "Bronze Bell", "鐘", "한 번 울리면 오래 가는 편입니다", "Tends to ring long after a single strike."),
  def("metal", "balanced", "자물쇠", "Lock", "鎖", "열고 닫을 때를 아는 편입니다", "Tends to know when to open and when to close."),
  def("metal", "weak", "금박", "Gold Leaf", "箔", "얇아서 어디에나 입혀지는 편입니다", "Tends to be thin enough to cover anything."),

  def("water", "strong", "큰물", "Great River", "河", "길을 스스로 내며 가는 편입니다", "Tends to carve its own path as it goes."),
  def("water", "balanced", "샘", "Spring", "泉", "마르지 않게 고여 두는 편입니다", "Tends to keep itself from running dry."),
  def("water", "weak", "이슬", "Dew", "露", "밤새 조용히 맺히는 편입니다", "Tends to form quietly overnight."),
]);

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export class CharacterResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterResolutionError";
  }
}

/** (오행, 세력) → 캐릭터. 15가지 조합 전부가 정의되어 있으므로 실패할 수 없다. */
export function characterFor(element: FiveElement, strength: CharacterStrength): CharacterDef {
  const found = BY_ID.get(`${element}-${strength}`);
  if (!found) {
    throw new CharacterResolutionError(`no character for ${element}/${strength}`);
  }
  return found;
}

export interface ResolvedCharacter {
  readonly def: CharacterDef;
  readonly tier: EvidenceTier;
  /** 어떤 값에서 나왔는지 — 화면에 근거로 함께 보인다. */
  readonly source: {
    readonly dominantElement: FiveElement;
    readonly strength: CharacterStrength;
    readonly dominantShare: number;
  };
}

/** 사주 결과에서 캐릭터를 뽑는다. */
export function resolveSajuCharacter(result: SajuResult): ResolvedCharacter {
  const dominantElement = result.elements.dominant;
  const strength = result.strength.verdict;

  return Object.freeze({
    def: characterFor(dominantElement, strength),
    tier: result.tier,
    source: Object.freeze({
      dominantElement,
      strength,
      dominantShare: result.elements.percentage[dominantElement],
    }),
  });
}

/** 도감용 — 모든 캐릭터를 오행 순서대로. */
export function allCharacters(): readonly CharacterDef[] {
  return CHARACTERS;
}
