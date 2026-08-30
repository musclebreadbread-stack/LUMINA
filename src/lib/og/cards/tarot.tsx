import { getTranslations } from "next-intl/server";
import { buildTarotView, type TarotView } from "@/lib/tarotModel";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import type { Locale } from "@/i18n/locale";
import type { SpreadKey } from "@engine/tarot";

/**
 * 타로 결과 공유 카드의 가운데 콘텐츠 — 처음 최대 3장을 부채꼴로 펼친다.
 *
 * spread·seed 두 경로 세그먼트만으로 이미 결과가 완전히 결정되므로(buildTarotView,
 * page.tsx와 동일한 함수) 공유 코드 없이 그 자리에서 다시 뽑는다.
 */

const FAN_CONTAINER_WIDTH = 420;
const FAN_CONTAINER_HEIGHT = 320;
const FAN_CARD_WIDTH = 168;
const FAN_CARD_HEIGHT = 252;
const FAN_MAX_CARDS = 3;

interface FanSlot {
  readonly left: number;
  readonly top: number;
  readonly rotate: number;
}

const FAN_SLOTS_1: readonly FanSlot[] = Object.freeze([
  { left: (FAN_CONTAINER_WIDTH - FAN_CARD_WIDTH) / 2, top: (FAN_CONTAINER_HEIGHT - FAN_CARD_HEIGHT) / 2, rotate: 0 },
]);

const FAN_SLOTS_2: readonly FanSlot[] = Object.freeze([
  { left: 40, top: 30, rotate: -8 },
  { left: 212, top: 30, rotate: 8 },
]);

const FAN_SLOTS_3: readonly FanSlot[] = Object.freeze([
  { left: 8, top: 56, rotate: -10 },
  { left: 118, top: 12, rotate: 0 },
  { left: 228, top: 56, rotate: 10 },
]);

function fanSlotsFor(count: number): readonly FanSlot[] {
  if (count >= 3) return FAN_SLOTS_3;
  if (count === 2) return FAN_SLOTS_2;
  return FAN_SLOTS_1;
}

export async function buildTarotOgCard(spread: SpreadKey, seed: string, locale: Locale): Promise<OgCard> {
  const view: TarotView = buildTarotView(spread, seed);
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "tarot" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const shown = view.cards.slice(0, FAN_MAX_CARDS);
  const slots = fanSlotsFor(shown.length);
  const illustrations = await Promise.all(
    shown.map((card) => loadOgPng(`tarot/cards/${String(card.id).padStart(2, "0")}.png`)),
  );

  const primary = view.cards[0];
  const spreadName = locale === "en" ? view.spreadEn : view.spreadKo;
  const primaryName = primary ? (locale === "en" ? primary.nameEn : primary.name) : "";
  const orientationLabel = primary ? t(primary.orientation === "reversed" ? "reversed" : "upright") : "";
  const kicker = t("sectionCards");
  const countLabel = t("cardCount", { count: view.cards.length });

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 60, lineHeight: 1.15, color: HOBUN, maxWidth: 520 }}>
          {spreadName}
        </div>
        {primary ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontFamily: "Sans", fontSize: 24, color: HOBUN_DIM }}>{primaryName}</div>
            <div style={{ display: "flex", fontFamily: "Sans", fontSize: 16, color: HOBUN_FAINT }}>
              {`${orientationLabel} · ${countLabel}`}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", position: "relative", width: FAN_CONTAINER_WIDTH, height: FAN_CONTAINER_HEIGHT }}>
        {shown.map((card, i) => {
          const slot = slots[i] ?? slots[0]!;
          const spin = slot.rotate + (card.orientation === "reversed" ? 180 : 0);
          const src = illustrations[i];

          return (
            <div
              key={`${card.id}-${i}`}
              style={{
                display: "flex",
                position: "absolute",
                left: slot.left,
                top: slot.top,
                width: FAN_CARD_WIDTH,
                height: FAN_CARD_HEIGHT,
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${INK_LINE}`,
                transform: `rotate(${spin}deg)`,
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 next/image를 지원하지 않는다.
                <img
                  src={src}
                  alt=""
                  width={FAN_CARD_WIDTH}
                  height={FAN_CARD_HEIGHT}
                  style={{ objectFit: "cover", width: FAN_CARD_WIDTH, height: FAN_CARD_HEIGHT }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon("tierCultural"),
    footerText: t("ogFooterNotice"),
    serifText: spreadName,
    sansText: `${kicker}${primaryName}${orientationLabel}${countLabel}`,
  };
}
