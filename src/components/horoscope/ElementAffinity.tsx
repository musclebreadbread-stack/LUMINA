import { getLocale, getTranslations } from "next-intl/server";
import { ELEMENT_SEQUENCE, ELEMENT_STYLE } from "@/lib/elements";
import type { HoroscopeDayElement } from "@/lib/horoscopeModel";
import type { Locale } from "@/i18n/locale";

/**
 * 오늘의 오행 — 이 결과 화면 유일하게 삽화가 없던 자리에 넣는 작은 시각 요소.
 *
 * 새 일러스트를 그리지 않는다. 사주 쪽 ElementSpectrum이 이미 쓰는
 * ELEMENT_STYLE(글리프·색)을 그대로 빌려, 오늘의 일진 지지가 지닌 오행 하나만
 * 다섯 글자 중에서 밝게 켠다 — 별자리 4원소(fire/earth/air/water)와는 다른
 * 체계이므로, 오행 팔레트는 여기서도 그 뜻으로만 쓴다.
 */
export async function ElementAffinity({ dayElement }: { readonly dayElement: HoroscopeDayElement }) {
  const t = await getTranslations("horoscope");
  const locale = (await getLocale()) as Locale;
  const style = ELEMENT_STYLE[dayElement.element];
  const elementLabel = locale === "en" ? style.en : style.ko;
  const branchLabel = locale === "en" ? dayElement.branchEn : dayElement.branchKo;

  return (
    <div className="mt-6 flex items-center gap-4 border-t border-ink-800 pt-5">
      <div className="flex shrink-0 gap-1.5" aria-hidden>
        {ELEMENT_SEQUENCE.map((el) => {
          const glyph = ELEMENT_STYLE[el];
          const active = el === dayElement.element;
          return (
            <span
              key={el}
              className={`font-hanja flex h-8 w-8 items-center justify-center rounded-full border text-base leading-none ${glyph.text} ${glyph.border} ${active ? "" : "opacity-30"}`}
            >
              {glyph.hanja}
            </span>
          );
        })}
      </div>
      <div>
        <p className="font-mono text-[12px] tracking-wide text-hobun-faint">{t("elementAffinityLabel")}</p>
        <p className="mt-1 text-xs leading-relaxed text-hobun-dim">
          {t("elementAffinityBody", { branch: branchLabel, hanja: dayElement.branchHanja, element: elementLabel })}
        </p>
      </div>
    </div>
  );
}
