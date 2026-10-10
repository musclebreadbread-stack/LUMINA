import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { STEMS, TEN_GOD_LABEL, TWELVE_STAGE_EN } from "@engine/saju/constants";
import { stemYearForecast } from "@engine/saju/publicGuides";
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
  readonly stem: string;
}

function resolveLocale(raw: string): Locale {
  return isLocale(raw) ? raw : "ko";
}

function findStemIndex(key: string): number {
  return STEMS.findIndex((stem) => stem.en.toLowerCase() === key);
}

function stageLabel(stage: string, locale: Locale): string {
  return locale === "ko" ? stage : (TWELVE_STAGE_EN[stage] ?? stage);
}

export function generateStaticParams(): Params[] {
  return STEMS.map((stem) => ({ stem: stem.en.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { stem: stemKey } = await params;
  const index = findStemIndex(stemKey);
  if (index === -1) return {};
  const stem = STEMS[index];
  if (!stem) return {};
  const t = await getTranslations("sajuGuidesPage");
  return {
    alternates: await buildAlternates(`/saju/ilgan/${stemKey}`),
    title: t("ilganTitle", { stemHanja: stem.hanja, stem: stem.en }),
    description: t("ilganDescription", { stemHanja: stem.hanja, stem: stem.en }),
  };
}

export default async function SajuIlganPage({ params }: { params: Promise<Params> }) {
  const { stem: stemKey } = await params;
  const index = findStemIndex(stemKey);
  if (index === -1) notFound();
  const stem = STEMS[index];
  if (!stem) notFound();

  const locale = resolveLocale(await getLocale());
  const [t, tNav] = await Promise.all([
    getTranslations("sajuGuidesPage"),
    getTranslations("nav"),
  ]);

  const elementStyle = ELEMENT_STYLE[stem.element];
  const elementName = locale === "ko" ? elementStyle.ko : elementStyle.en;
  const forecast = stemYearForecast(index);
  const stemGodLabel = TEN_GOD_LABEL[forecast.stemTenGod];
  const branchGodLabel = TEN_GOD_LABEL[forecast.branchTenGod];
  const title = t("ilganTitle", { stemHanja: stem.hanja, stem: stem.en });
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: t("ilganDescription", { stemHanja: stem.hanja, stem: stem.en }),
    url: new URL(localePath(`/saju/ilgan/${stemKey}`, locale), siteUrl).toString(),
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
          {t("ilganIntro", { stemHanja: stem.hanja, stem: stem.en, element: elementName })}
        </p>
      </div>

      <section className="space-y-4 border-t border-ink-700 pt-8">
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("ilganStemGodBody", { stemGodHanja: stemGodLabel.hanja, stemGod: stemGodLabel[locale === "ko" ? "ko" : "en"] })}
        </p>
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("ilganBranchGodBody", { branchGodHanja: branchGodLabel.hanja, branchGod: branchGodLabel[locale === "ko" ? "ko" : "en"] })}
        </p>
        <p className="text-sm leading-relaxed text-hobun-dim">
          {t("ilganStageBody", { stage: stageLabel(forecast.stage, locale) })}
        </p>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("ilganOtherStemsHeading")}</h2>
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {STEMS.filter((other) => other.en.toLowerCase() !== stemKey).map((other) => (
            <li key={other.index}>
              <Link
                href={localePath(`/saju/ilgan/${other.en.toLowerCase()}`, locale)}
                className="block border border-ink-700 px-4 py-3 text-center text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {other.hanja}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 border-t border-ink-700 pt-8">
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
