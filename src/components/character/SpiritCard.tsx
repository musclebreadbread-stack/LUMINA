import { getLocale, getTranslations } from "next-intl/server";
import { ElementSpirit } from "./ElementSpirit";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { ReportView } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";

/**
 * 결과를 한 장으로 요약하는 정령 카드.
 *
 * 캐릭터가 왜 이것인지를 같은 카드 안에서 밝힌다 — 지배 오행과 일간 세력,
 * 두 값 모두 아래 표에 그대로 적혀 있는 것이라 앞뒤가 맞는다.
 * 재미를 위해 근거를 숨기지 않는 것이 이 플랫폼의 규칙이다.
 */
export async function SpiritCard({ character }: { readonly character: ReportView["character"] }) {
  const t = await getTranslations("saju");
  const locale = (await getLocale()) as Locale;
  const { def, dominantShare } = character;
  const style = ELEMENT_STYLE[def.element];
  const name = locale === "en" ? def.nameEn : def.name;
  const tagline = locale === "en" ? def.taglineEn : def.tagline;
  const because = locale === "en" ? def.becauseEn : def.because;
  const elementLabel = locale === "en" ? style.en : style.ko;

  return (
    <section
      className="relative flex flex-col items-center gap-6 overflow-hidden border border-ink-700 bg-ink-850/60 px-6 py-8 sm:flex-row sm:gap-9 sm:px-9"
      aria-labelledby="spirit-name"
    >
      {/* 정령이 머금은 빛 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: `radial-gradient(circle, ${style.cssVar}, transparent 68%)` }}
      />

      <div className="relative shrink-0">
        <ElementSpirit character={def} animate size={140} />
      </div>

      <div className="relative min-w-0 text-center sm:text-left">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("spiritLabel")}</p>

        <h2 id="spirit-name" className="mt-2 flex items-baseline justify-center gap-3 sm:justify-start">
          <span className={`text-[clamp(1.6rem,5vw,2.1rem)] leading-none font-medium tracking-tight ${style.text}`}>
            {name}
          </span>
          <span className={`glyph glyph-inlay-sm font-hanja text-xl leading-none ${style.text}`}>
            {def.hanja}
          </span>
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{tagline}</p>

        <p className="mt-4 font-mono text-[13px] leading-relaxed text-hobun-faint">
          {t("spiritReasonPrefix", {
            element: elementLabel,
            hanja: style.hanja,
            percent: dominantShare.toFixed(1),
          })}{" "}
          {because}
        </p>
      </div>
    </section>
  );
}
