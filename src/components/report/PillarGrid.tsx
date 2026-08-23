"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { stageEvidenceRef } from "@engine/saju";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ELEMENT_STYLE } from "@/lib/elements";
import { stageLabel, tenGodLabel, type PillarColumn } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";

/**
 * 사주 원국(原局) — 네 개의 기둥.
 *
 * 四柱는 말 그대로 네 개의 기둥이다. 그래서 평면 표가 아니라 서로 다른 깊이에
 * 서 있는 네 개의 석판으로 세운다. 깊이 순서는 임의가 아니라 해석의 위계를 따른다 —
 * 일주(나)가 가장 앞, 월주(격국의 근간)가 그다음, 시주, 연주(뿌리) 순으로 물러난다.
 *
 * 행 순서는 만세력 그대로다. 왼쪽부터 時·日·月·年, 위 칸이 천간, 아래 칸이 지지.
 * 글자가 들어서는 순서는 반대로 연→월→일→시인데, 실제 계산 순서가 그렇기 때문이다.
 *
 * 등장 연출은 전부 CSS가 맡는다. useReducedMotion() 은 서버에서 언제나 false 라
 * 자바스크립트로 초기 상태를 주면 서버 HTML에 opacity:0 이 박히고, 하이드레이션이
 * 어긋나며, JS가 죽으면 여덟 글자가 사라진다. 여기서 자바스크립트가 하는 일은
 * 포인터를 따라 기울이는 것 하나뿐이다.
 */

interface Props {
  readonly pillars: readonly PillarColumn[];
  readonly voidLabel: string;
}

/** 기둥이 놓이는 깊이(px). 해석에서 차지하는 자리만큼 앞으로 나온다. */
const DEPTH: Record<string, number> = {
  日: 26,
  月: 11,
  時: 0,
  年: -11,
};

const ROW = {
  head: "h-[58px] sm:h-[70px]",
  glyph: "h-[104px] sm:h-[132px]",
  foot: "h-[88px] sm:h-[92px]",
} as const;

const PILLAR_LABEL_KEY: Record<PillarColumn["key"], string> = {
  hour: "pillarHourLabel",
  day: "pillarDayLabel",
  month: "pillarMonthLabel",
  year: "pillarYearLabel",
};
const PILLAR_DOMAIN_KEY: Record<PillarColumn["key"], string> = {
  hour: "pillarHourDomain",
  day: "pillarDayDomain",
  month: "pillarMonthDomain",
  year: "pillarYearDomain",
};

export function PillarGrid({ pillars, voidLabel }: Props) {
  const reduce = useReducedMotion();
  const t = useTranslations("saju");
  const locale = useLocale() as Locale;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 110, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [9, -9]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [-5, 5]), spring);

  // 빛의 위치는 리렌더 없이 DOM 변수로만 옮긴다 — 포인터마다 리액트를 깨우지 않는다.
  const sheenRef = useRef<HTMLSpanElement | null>(null);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    px.set(x - 0.5);
    py.set(y - 0.5);
    const sheen = sheenRef.current;
    if (sheen) {
      sheen.style.setProperty("--lx", `${x * 100}%`);
      sheen.style.setProperty("--ly", `${y * 100}%`);
      sheen.style.opacity = "1";
    }
  }

  function resetTilt() {
    px.set(0);
    py.set(0);
    if (sheenRef.current) sheenRef.current.style.opacity = "0";
  }

  const total = pillars.length;

  return (
    <div>
      <div
        className="scene relative -mx-1 px-1 pt-2 pb-6"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
      >
        {/* 값이 0이면 transform:none 이므로 서버와 클라이언트가 언제나 같은 것을 낸다. */}
        <motion.div
          className="preserve-3d flex gap-1.5 sm:gap-2.5"
          style={{ rotateX, rotateY }}
        >
          {pillars.map((pillar, index) => (
            <Pillar
              key={pillar.mark}
              pillar={pillar}
              // 연주(맨 오른쪽)가 먼저 선다.
              order={total - 1 - index}
              reduce={Boolean(reduce)}
              locale={locale}
              t={t}
            />
          ))}
        </motion.div>

        {/* 석판 위를 훑고 지나가는 빛. 포인터를 따라간다. */}
        <span
          ref={sheenRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(260px circle at var(--lx,50%) var(--ly,50%), rgba(237,230,216,0.5), transparent 68%)",
          }}
        />
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-hobun-faint">
        {t("pillarFootnote", { void: voidLabel })}
      </p>
    </div>
  );
}

function Pillar({
  pillar,
  order,
  reduce,
  locale,
  t,
}: {
  readonly pillar: PillarColumn;
  readonly order: number;
  readonly reduce: boolean;
  readonly locale: Locale;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  const depth = DEPTH[pillar.mark] ?? 0;
  const stemStyle = ELEMENT_STYLE[pillar.stem.element];
  const branchStyle = ELEMENT_STYLE[pillar.branch.element];

  /** slot 0 = 천간, 1 = 지지. 지연 값은 서버·클라이언트에서 동일하게 계산된다. */
  const riseDelay = (slot: number) => `${200 + (order * 2 + slot) * 85}ms`;

  return (
    <motion.div
      className="pillar-stand preserve-3d relative flex-1"
      style={{ z: depth, animationDelay: `${order * 70}ms` }}
      whileHover={reduce ? undefined : { z: depth + 18 }}
    >
      {/* 석판 본체 */}
      <div
        className={`relative flex h-full flex-col border border-ink-700 ${
          pillar.isDayMaster ? "bg-ink-800" : "bg-ink-850/70"
        }`}
        style={{
          boxShadow: pillar.isDayMaster
            ? "0 26px 50px -18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(237,230,216,0.09)"
            : "0 18px 38px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(237,230,216,0.05)",
        }}
      >
        {/* 머리 */}
        <div
          className={`${ROW.head} flex flex-col items-center justify-center border-b border-ink-700 px-1`}
        >
          <span className="font-hanja text-base leading-none text-hobun-dim">{pillar.mark}</span>
          <span className="mt-1 text-[12px] tracking-wide text-hobun-faint">
            {t(PILLAR_LABEL_KEY[pillar.key])}
          </span>
          <span className="mt-0.5 hidden text-[12px] text-hobun-faint sm:block">
            {t(PILLAR_DOMAIN_KEY[pillar.key])}
          </span>
        </div>

        {/* 천간 */}
        <div
          className={`${ROW.glyph} relative flex items-center justify-center border-b border-ink-700 px-1`}
        >
          <span className="absolute top-1.5 text-[12px] leading-none text-hobun-dim">
            {pillar.isDayMaster ? (
              <span className="text-hobun">{t("selfMark")}</span>
            ) : (
              pillar.stem.tenGod && tenGodLabel(pillar.stem.tenGod, locale)
            )}
          </span>
          <span
            className={`glyph glyph-inlay glyph-rise font-hanja text-[clamp(1.9rem,9vw,3.5rem)] leading-none font-black ${stemStyle.text}`}
            style={{ animationDelay: riseDelay(0) }}
          >
            {pillar.stem.hanja}
          </span>
          <span className="absolute bottom-1.5 text-[12px] text-hobun-dim">
            {locale === "en" ? pillar.stem.en : pillar.stem.ko}
            <span className="ml-1 text-hobun-faint">
              {locale === "en" ? stemStyle.en : stemStyle.ko}
            </span>
          </span>
        </div>

        {/* 지지 */}
        <div
          className={`${ROW.glyph} relative flex items-center justify-center border-b border-ink-700 px-1`}
        >
          <span className="absolute top-1.5 text-[12px] leading-none text-hobun-dim">
            {pillar.branch.tenGod && tenGodLabel(pillar.branch.tenGod, locale)}
          </span>
          <span
            className={`glyph glyph-inlay glyph-rise font-hanja text-[clamp(1.9rem,9vw,3.5rem)] leading-none font-black ${branchStyle.text}`}
            style={{ animationDelay: riseDelay(1) }}
          >
            {pillar.branch.hanja}
          </span>
          <span className="absolute bottom-1.5 text-[12px] text-hobun-dim">
            {locale === "en" ? pillar.branch.en : pillar.branch.ko}
            <span className="ml-1 text-hobun-faint">
              {locale === "en" ? branchStyle.en : branchStyle.ko}
            </span>
          </span>
        </div>

        {/* 지장간 · 십이운성 · 띠 */}
        <div className={`${ROW.foot} flex flex-col items-center justify-center gap-1.5 px-1`}>
          <span className="font-hanja flex gap-1 text-sm text-hobun-dim">
            {pillar.hidden.map((h, k) => (
              <span key={`${h.hanja}-${k}`} title={h.tenGod ? tenGodLabel(h.tenGod, locale) : undefined}>
                {h.hanja}
              </span>
            ))}
          </span>
          <a
            href={`#calculation-${stageEvidenceRef(pillar.stage)}`}
            className="text-[12px] text-hobun-faint underline decoration-ink-700 underline-offset-2 hover:text-hobun"
          >
            {stageLabel(pillar.stage, locale)}
          </a>
          <span className="flex items-center gap-1.5 text-[12px] text-hobun-faint">
            <Image
              src={pillar.zodiacImageSrc}
              alt=""
              aria-hidden
              width={20}
              height={30}
              className="h-5 w-[13px] object-cover object-top opacity-90"
            />
            {/* 좁은 기둥 폭에서 긴 띠 이름은 네 기둥의 발판 높이를 어긋나게 한다 —
                이미지는 남기고 이름은 넓은 화면에서만 */}
            <span className="hidden sm:inline">
              {locale === "en" ? pillar.zodiacEn : `${pillar.zodiacKo}띠`}
            </span>
          </span>
          {pillar.isVoid && <span className="text-[12px] text-hobun-faint">{t("voidMark")}</span>}
        </div>
      </div>

      {/* 바닥에 지는 그림자 — 기둥이 무언가 위에 서 있다는 단서 */}
      <span
        aria-hidden
        className="absolute inset-x-2 -bottom-2.5 h-3 rounded-[50%] blur-[6px]"
        style={{ background: "rgba(0,0,0,0.8)" }}
      />
    </motion.div>
  );
}
