import { getLocale, getTranslations } from "next-intl/server";
import { Tilt } from "@/components/ui/Tilt";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import type { CardView } from "@/lib/tarotModel";
import type { Locale } from "@/i18n/locale";

/**
 * 타로 카드 한 장.
 *
 * 원화는 색을 쓰지만(수트별 팔레트가 있는 채색 삽화), 그 아래 텍스트 조판은
 * 여전히 무채색이다 — 마이너 수트는 고전 4원소(불·물·공기·흙)에 속하는데,
 * 사주의 오행과 이름이 겹쳐서 텍스트까지 색을 빌리면 두 체계가 대응한다는
 * 잘못된 인상을 준다. 역방향은 원화만 180도 돌려 보여준다 — 이름표는 글자라
 * 거꾸로 두면 읽을 수 없으므로 그대로 세우고, 세모 표식과 글자로도 정직하게
 * 병기한다.
 *
 * 해석문은 여기서 조립한다 — tarotModel 은 카드 이름·방향·키워드 같은 원재료만
 * 넘기고, 문장을 엮는 조사·어순은 로케일마다 다르므로 next-intl 의 t() 로 조립한다.
 *
 * 등장 애니메이션은 CSS 전용이다 — 서버가 보낸 HTML에 opacity:0 을 심지 않으므로
 * 자바스크립트가 늦거나 죽어도 카드 내용이 사라지지 않는다.
 */
export async function TarotCard({ card, order }: { readonly card: CardView; readonly order: number }) {
  const [t, tCommon] = await Promise.all([
    getTranslations("tarot"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;
  const reversed = card.orientation === "reversed";

  const position = locale === "en" ? card.positionEn : card.positionKo;
  const prompt = locale === "en" ? card.promptEn : card.promptKo;
  const name = locale === "en" ? card.nameEn : card.name;
  const suitLabel = (locale === "en" ? card.suitEn : card.suitKo) ?? "";
  const keywords = locale === "en" ? card.keywordsEn : card.keywords;
  const iconography = locale === "en" ? card.iconographyEn : card.iconographyKo;
  const orientationLabel = t(reversed ? "reversed" : "upright");
  const numberLabel = card.isMajor ? t("cardNumberMajor", { n: card.number }) : `${card.number}`;

  const [first = "", ...rest] = keywords;
  const reading = `${t("readingIntro", { name, orientation: orientationLabel })} ${
    rest.length > 0
      ? t("readingWithExtra", { first, rest: rest.join("·") })
      : t("readingSingle", { keyword: first })
  }`;

  return (
    <div
      id={`calculation-tarot-card-${card.id}`}
      className="card-flip-in flex flex-col border border-ink-700 bg-ink-850/70"
      style={{
        animationDelay: `${140 + order * 130}ms`,
        boxShadow: "0 20px 40px -22px rgba(0,0,0,0.85), inset 0 1px 0 rgba(237,230,216,0.06)",
      }}
    >
      <div className="border-b border-ink-700 px-4 py-3">
        <p className="font-mono text-[13px] text-hobun-faint">{position}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-hobun-faint">
          <span className="mr-2 font-mono text-[11px] text-hobun-faint">{t("reflectionLabel")}</span>
          {prompt}
        </p>
      </div>

      <Tilt amount={5} className="border-b border-ink-700 bg-ink-900/40 p-4">
        <div className="tarot-card-art relative mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden border border-ink-700 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.9)]">
          <MotionSafeImage
            src={card.imageSrc}
            alt={name}
            sizes="(min-width: 640px) 33vw, 60vw"
            className={`object-cover transition-transform duration-700 ease-out ${reversed ? "rotate-180" : ""}`}
            priority={order === 0}
            fallbackLabel={name}
          />
        </div>
      </Tilt>

      <div className="flex flex-col items-center px-4 py-7 text-center">
        <span className="font-mono text-[12px] tracking-wide text-hobun-faint">
          {card.isMajor ? numberLabel : `${suitLabel} · ${numberLabel}`}
        </span>
        <h3 className="mt-2 text-xl font-medium tracking-tight text-hobun">{name}</h3>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[12px] ${
            reversed ? "border-ink-600 text-hobun-faint" : "border-hobun/35 text-hobun-dim"
          }`}
        >
          <span aria-hidden>{reversed ? "▽︎" : "△︎"}</span>
          {orientationLabel}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 px-4 pb-4">
        {keywords.map((k) => (
          <span key={k} className="border border-ink-700 px-2 py-1 text-[13px] text-hobun-dim">
            {k}
          </span>
        ))}
      </div>

      <p className="border-t border-ink-700 px-4 py-4 text-xs leading-relaxed text-hobun-dim">
        {reading}
      </p>

      <div className="border-t border-ink-700 px-4 py-4">
        <p className="font-mono text-[11px] tracking-wide text-hobun-faint">{t("iconographyLabel")}</p>
        <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{iconography}</p>
      </div>

      <div className="px-4 pb-2">
        <ProgressiveBlock
          block={card.explanation}
          locale={locale}
          detailLabel={tCommon("explanationDetails")}
          methodLabel={tCommon("explanationMethod")}
          evidenceLabel={tCommon("evidenceView")}
          citationLabel={tCommon("citationLabel")}
        />
      </div>
    </div>
  );
}
