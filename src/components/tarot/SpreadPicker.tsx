"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { assetPath } from "@/lib/assets";
import type { SpreadKey } from "@engine/tarot";

/**
 * 스프레드를 고르고 시드를 만들어 결과 주소로 보낸다.
 *
 * 시드는 여기, 클라이언트에서만 만든다 — 엔진은 Math.random 도 현재 시각도 읽지
 * 않는다. 이 시드가 곧 공유 링크의 일부가 되므로, 같은 링크는 언제 열어도
 * 같은 카드를 낸다.
 *
 * 라벨·설명은 메시지 카탈로그의 "tarot" 네임스페이스에서 가져온다 — 스프레드
 * 이름 자체(SpreadDef.ko/en)가 아니라 화면 문구용으로 이미 있는 키를 쓴다.
 */

const SPREAD_KEYS: readonly SpreadKey[] = ["single", "three", "celtic-cross"];

const LABEL_KEY: Record<SpreadKey, string> = {
  single: "spreadSingle",
  three: "spreadThree",
  "celtic-cross": "spreadCeltic",
};
const DESC_KEY: Record<SpreadKey, string> = {
  single: "spreadSingleDesc",
  three: "spreadThreeDesc",
  "celtic-cross": "spreadCelticDesc",
};

const PREVIEW_CARD: Record<SpreadKey, string> = {
  single: "00",
  three: "17",
  "celtic-cross": "21",
};

function makeSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function SpreadPicker() {
  const router = useRouter();
  const t = useTranslations("tarot");
  const [pending, setPending] = useState<SpreadKey | null>(null);

  function draw(spread: SpreadKey) {
    setPending(spread);
    router.push(`/tarot/${spread}/${makeSeed()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {SPREAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          disabled={pending !== null}
          onClick={() => draw(key)}
          aria-busy={pending === key}
          className="tarot-spread-option group flex min-h-[250px] flex-col border border-ink-900/15 bg-surface-soft/55 p-3 text-left text-ink-900 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-ink-900/35 hover:shadow-[0_18px_35px_-24px_rgba(18,16,13,0.8)] disabled:cursor-wait disabled:opacity-60"
        >
          <div className="relative aspect-[4/3] overflow-hidden border border-ink-900/15 bg-ink-900">
            <MotionSafeImage
              src={assetPath("tarot/cards", PREVIEW_CARD[key])}
              alt=""
              sizes="(min-width: 640px) 30vw, 84vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              fallbackLabel={t(LABEL_KEY[key])}
            />
            <span className="absolute inset-x-3 bottom-3 font-mono text-[11px] tracking-[0.16em] text-white drop-shadow-md">
              LUMINA / TAROT
            </span>
          </div>
          <p className="mt-5 text-lg font-semibold tracking-tight">{t(LABEL_KEY[key])}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700/80">{t(DESC_KEY[key])}</p>
          <p className="mt-auto pt-4 font-mono text-[13px] text-ink-700/75">
            {pending === key ? t("drawing") : t("drawCta")}
          </p>
        </button>
      ))}
    </div>
  );
}
