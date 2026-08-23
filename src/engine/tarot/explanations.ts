import type { ExplanationBlock } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import type { CardDef } from "./constants";
import { TAROT_CITATIONS, WAITE_1910 } from "./citations";
import type { Orientation } from "./shuffle";

const CULTURAL_TIER = "cultural" as const;

export function tarotCardExplanation(
  card: CardDef,
  orientation: Orientation,
  positionKey: string,
): ExplanationBlock {
  const meaning = card.meaning[orientation];
  const label = orientation === "upright" ? "정방향" : "역방향";
  const labelEn = orientation === "upright" ? "upright" : "reversed";

  return freezeExplanationBlock({
    id: `tarot-card-${card.id}-${orientation}`,
    summary: Object.freeze({
      ko: `${card.name} · ${label} — ${meaning.ko.split(".")[0] ?? meaning.ko}`,
      en: `${card.nameEn} · ${labelEn} — ${meaning.en.split(".")[0] ?? meaning.en}`,
    }),
    detail: meaning,
    method: Object.freeze({
      ko: `카드 고유 의미는 ${positionKey} 자리의 질문과 병치해 읽습니다. 이 자리와 카드의 78×자리 조합을 별도 예언 문장으로 만들지 않고, 카드 상징과 자리 질문이 만나는 지점을 사용자가 직접 성찰하도록 남겨 둡니다. 정·역방향은 라이더-웨이트 계열에서 널리 쓰인 문화적 읽기 규칙입니다. 마르세유 계열은 수트와 숫자 도상을 더 직접적으로 읽고, 토트 계열은 카발라·점성술 대응을 더 강조하는 등 전통에 따라 같은 카드의 초점이 달라질 수 있습니다.`,
      en: `The card-specific meaning is placed beside the question for the ${positionKey} position. LUMINA does not turn all 78-by-position combinations into separate predictions; it leaves the meeting point between symbol and prompt for the user to reflect on. Upright and reversed are cultural reading conventions used in Rider–Waite lineages. Marseille traditions often read pip and number imagery more directly, while Thoth traditions place more emphasis on Qabalistic and astrological correspondences, so the same card can receive different emphasis across traditions.`,
    }),
    evidenceRefs: Object.freeze([`tarot-card-${card.id}`]),
    citations: Object.freeze([...TAROT_CITATIONS]),
    tier: CULTURAL_TIER,
  });
}

export function tarotSeedExplanation(seed: string): ExplanationBlock {
  return freezeExplanationBlock({
    id: "tarot-seed",
    summary: Object.freeze({
      ko: `이 리딩은 전체 시드 ${seed}를 사용하므로 같은 스프레드와 시드에서 같은 카드가 재현됩니다.`,
      en: `This reading uses the full seed ${seed}, so the same spread and seed reproduce the same cards.`,
    }),
    detail: Object.freeze({
      ko: "셔플은 호출부가 전달한 시드를 결정론적 난수 생성기로 바꾸고, Fisher–Yates 방식으로 78장 덱을 한 번씩 섞은 뒤 필요한 장수만 뽑습니다. 정·역방향도 같은 시드에서 파생된 값으로 결정됩니다. 서버에 결과를 저장하지 않아도 링크에 시드가 있으면 결과를 다시 계산할 수 있습니다.",
      en: "The shuffle turns the caller-provided seed into a deterministic random generator, applies Fisher–Yates to the 78-card deck, and draws only the required number of cards. Orientation is derived from the same seed. Because the result is recalculated rather than stored on a server, a link containing the seed can reproduce the reading.",
    }),
    method: Object.freeze({
      ko: "재현성은 예언의 정확도가 아니라 동일한 입력에 동일한 계산을 적용하는 소프트웨어 속성입니다. 시드 전문을 공개하고, 카드 배열·자리·정역방향을 모두 같은 입력에서 다시 산출합니다.",
      en: "Reproducibility here is a software property—identical inputs receive identical calculations—not evidence that a reading predicts the future. The full seed is shown so cards, positions, and orientations can be recalculated from the same input.",
    }),
    evidenceRefs: Object.freeze(["tarot-seed"]),
    citations: Object.freeze([WAITE_1910]),
    tier: CULTURAL_TIER,
  });
}
