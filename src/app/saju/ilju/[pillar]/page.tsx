import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CHINESE_SIGNS } from "@engine/horoscope/constants";
import { STEMS, TEN_GOD_LABEL, TWELVE_STAGE_EN, branchAt, stemAt } from "@engine/saju/constants";
import { pillarLabel } from "@engine/saju/pillars";
import {
  ALL_ILJU_PILLARS,
  adjacentIlju,
  findIljuBySlug,
  iljuGuideFor,
  iljuSlug,
} from "@engine/saju/publicGuides";
import type { BranchRelationKind } from "@engine/saju/relations";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { InfoNav } from "@/components/ui/InfoNav";
import { ELEMENT_STYLE } from "@/lib/elements";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { buildAlternates } from "@/lib/seoAlternates";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic"; // see src/app/saju/2027/page.tsx 상단 주석
export const dynamicParams = false;

interface Params {
  readonly pillar: string;
}

const RELATION_LABEL: Readonly<Record<BranchRelationKind, Readonly<Record<Locale, string>>>> = Object.freeze({
  clash: { ko: "충(沖)", en: "clash (沖)" },
  combination: { ko: "육합(六合)", en: "combination (六合)" },
  trine: { ko: "삼합(三合)", en: "trine (三合)" },
  punishment: { ko: "형(刑)", en: "punishment (刑)" },
  harm: { ko: "해(害)", en: "harm (害)" },
  destruction: { ko: "파(破)", en: "destruction (破)" },
} as Record<BranchRelationKind, Record<Locale, string>>);

function relationLabel(kind: BranchRelationKind, locale: Locale): string {
  return RELATION_LABEL[kind][locale === "ko" ? "ko" : "en"];
}

function resolveLocale(raw: string): Locale {
  return isLocale(raw) ? raw : "ko";
}

function stageLabel(stage: string, locale: Locale): string {
  return locale === "ko" ? stage : (TWELVE_STAGE_EN[stage] ?? stage);
}

export function generateStaticParams(): Params[] {
  return ALL_ILJU_PILLARS.map((pillar) => ({ pillar: iljuSlug(pillar) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { pillar: slug } = await params;
  const pillar = findIljuBySlug(slug);
  if (!pillar) return {};
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations("sajuGuidesPage");
  const hanja = pillarLabel(pillar, "hanja");
  const label = pillarLabel(pillar, locale === "ko" ? "ko" : "en");
  return {
    alternates: await buildAlternates(`/saju/ilju/${slug}`),
    title: t("iljuTitle", { hanja, label }),
    description: t("iljuDescription", { hanja, stemHanja: stemAt(pillar.stem).hanja, branchHanja: branchAt(pillar.branch).hanja }),
  };
}

export default async function SajuIljuPage({ params }: { params: Promise<Params> }) {
  const { pillar: slug } = await params;
  const pillar = findIljuBySlug(slug);
  if (!pillar) notFound();

  const locale = resolveLocale(await getLocale());
  const [t, tNav] = await Promise.all([
    getTranslations("sajuGuidesPage"),
    getTranslations("nav"),
  ]);

  const stem = stemAt(pillar.stem);
  const branch = branchAt(pillar.branch);
  const hanja = pillarLabel(pillar, "hanja");
  const label = pillarLabel(pillar, locale === "ko" ? "ko" : "en");
  const guide = iljuGuideFor(pillar);
  const stemElementStyle = ELEMENT_STYLE[stem.element];
  const stemElementName = locale === "ko" ? stemElementStyle.ko : stemElementStyle.en;
  const sign = CHINESE_SIGNS[pillar.branch];
  const branchZodiacName = locale === "ko" ? (sign?.ko ?? branch.zodiacKo) : (sign?.en ?? branch.zodiacEn);
  const stemGodLabel = TEN_GOD_LABEL[guide.yearForecast.stemTenGod];
  const branchGodLabel = TEN_GOD_LABEL[guide.yearForecast.branchTenGod];
  const title = t("iljuTitle", { hanja, label });
  const siteUrl = getSiteUrl();

  const { previous, next } = adjacentIlju(pillar);
  const previousLabel = pillarLabel(previous, locale === "ko" ? "ko" : "en");
  const nextLabel = pillarLabel(next, locale === "ko" ? "ko" : "en");

  const parentStem = STEMS[pillar.stem];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: t("iljuDescription", { hanja, stemHanja: stem.hanja, branchHanja: branch.hanja }),
    url: new URL(localePath(`/saju/ilju/${slug}`, locale), siteUrl).toString(),
    inLanguage: locale,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <JsonLd data={structuredData} />
      <InfoNav />
      <Breadcrumbs
        label={tNav("breadcrumb")}
        items={[
          { href: "/", label: "LUMINA" },
          { href: "/saju/2027", label: t("hubTitle") },
          { label: title },
        ]}
      />

      <div className="py-10">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-medium tracking-tight">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">
          {t("iljuIntro", {
            hanja,
            label,
            stemHanja: stem.hanja,
            stemElement: stemElementName,
            branchHanja: branch.hanja,
            branchZodiac: branchZodiacName,
          })}
        </p>
      </div>

      <section className="space-y-4 border-t border-ink-700 pt-8">
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("iljuSeatedStageBody", { branchHanja: branch.hanja, seatedStage: stageLabel(guide.seatedStage, locale) })}
        </p>
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("iljuYearStemGodBody", { stemGodHanja: stemGodLabel.hanja, stemGod: stemGodLabel[locale === "ko" ? "ko" : "en"] })}
        </p>
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("iljuYearBranchGodBody", { branchGodHanja: branchGodLabel.hanja, branchGod: branchGodLabel[locale === "ko" ? "ko" : "en"] })}
        </p>
        {guide.yearBranchRelations.length > 0 ? (
          <p className="text-sm leading-relaxed text-hobun-dim">
            {t("iljuYearRelationBody", {
              branchHanja: branch.hanja,
              relationLabel: guide.yearBranchRelations.map((r) => relationLabel(r.kind, locale)).join(" · "),
            })}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-hobun-dim">
            {t("iljuNoYearRelationBody", { branchHanja: branch.hanja })}
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("iljuRelatedHeading")}</h2>
        <ul className="mt-5 flex flex-wrap gap-3">
          {sign ? (
            <li>
              <Link
                href={localePath(`/saju/2027/${sign.key}`, locale)}
                className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {t("iljuSiblingSign", { sign: branchZodiacName })}
              </Link>
            </li>
          ) : null}
          {parentStem ? (
            <li>
              <Link
                href={localePath(`/saju/ilgan/${parentStem.en.toLowerCase()}`, locale)}
                className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {t("iljuParentStem", { stem: parentStem.hanja })}
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 border-t border-ink-700 pt-8">
        <Link
          href={localePath(`/saju/ilju/${iljuSlug(previous)}`, locale)}
          className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
        >
          {t("iljuPrevious", { label: previousLabel })}
        </Link>
        <Link
          href={localePath(`/saju/ilju/${iljuSlug(next)}`, locale)}
          className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
        >
          {t("iljuNext", { label: nextLabel })}
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 border-t border-ink-700 pt-8">
        <Link
          href={localePath("/saju/2027", locale)}
          className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun-dim underline underline-offset-4 hover:border-hobun hover:text-hobun"
        >
          {t("backToHub")}
        </Link>
        <Link
          href={localePath("/premium/saju-2027", locale)}
          className="inline-flex min-h-11 items-center border border-ink-600 px-4 text-sm text-hobun-dim underline underline-offset-4 hover:border-hobun hover:text-hobun"
        >
          {t("hubCta")}
        </Link>
      </div>
    </main>
  );
}
