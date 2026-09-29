import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CHINESE_SIGNS } from "@engine/horoscope/constants";
import { branchAt } from "@engine/saju/constants";
import { pillarLabel } from "@engine/saju/pillars";
import { signYearGuideFor } from "@engine/saju/publicGuides";
import type { BranchRelationKind } from "@engine/saju/relations";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { InfoNav } from "@/components/ui/InfoNav";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { buildAlternates } from "@/lib/seoAlternates";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic"; // see src/app/saju/2027/page.tsx 상단 주석
export const dynamicParams = false;

interface Params {
  readonly sign: string;
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

function findSignIndex(key: string): number {
  return CHINESE_SIGNS.findIndex((sign) => sign.key === key);
}

export function generateStaticParams(): Params[] {
  return CHINESE_SIGNS.map((sign) => ({ sign: sign.key }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { sign: signKey } = await params;
  const index = findSignIndex(signKey);
  if (index === -1) return {};
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations("sajuGuidesPage");
  const sign = CHINESE_SIGNS[index];
  if (!sign) return {};
  const signName = locale === "ko" ? sign.ko : sign.en;
  const branchHanja = branchAt(index).hanja;
  return {
    alternates: await buildAlternates(`/saju/2027/${signKey}`),
    title: t("signTitle", { sign: signName }),
    description: t("signDescription", { sign: signName, branchHanja }),
  };
}

export default async function Saju2027SignPage({ params }: { params: Promise<Params> }) {
  const { sign: signKey } = await params;
  const index = findSignIndex(signKey);
  if (index === -1) notFound();

  const sign = CHINESE_SIGNS[index];
  if (!sign) notFound();

  const locale = resolveLocale(await getLocale());
  const [t, tNav] = await Promise.all([
    getTranslations("sajuGuidesPage"),
    getTranslations("nav"),
  ]);

  const signName = locale === "ko" ? sign.ko : sign.en;
  const branchHanja = branchAt(index).hanja;
  const guide = signYearGuideFor(index);
  const title = t("signTitle", { sign: signName });
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: t("signDescription", { sign: signName, branchHanja }),
    url: new URL(localePath(`/saju/2027/${signKey}`, locale), siteUrl).toString(),
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
          {t("signIntro", { sign: signName, branchHanja })}
        </p>
      </div>

      <section className="border-t border-ink-700 pt-8">
        {guide.yearRelations.length > 0 ? (
          <p className="text-sm leading-relaxed text-hobun-dim">
            {t("signRelationBody", {
              sign: signName,
              branchHanja,
              relationLabel: guide.yearRelations.map((r) => relationLabel(r.kind, locale)).join(" · "),
            })}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-hobun-dim">
            {t("signNoRelationBody", { sign: signName, branchHanja })}
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("signNotableMonthsHeading")}</h2>
        {guide.notableMonths.length > 0 ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {t("signNotableMonthsIntro", { sign: signName })}
            </p>
            <ul className="mt-5 space-y-3">
              {guide.notableMonths.map((month) => (
                <li key={month.monthOrdinal} className="border-l border-ink-600 pl-4 text-sm text-hobun-dim">
                  {t("signNotableMonthLine", {
                    month: month.monthOrdinal + 1,
                    pillarHanja: pillarLabel(month.monthPillar, "hanja"),
                    relationLabel: month.relations.map((r) => relationLabel(r.kind, locale)).join(" · "),
                  })}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
            {t("signNoNotableMonths", { sign: signName })}
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("signOtherSignsHeading")}</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CHINESE_SIGNS.filter((other) => other.key !== signKey).map((other) => (
            <li key={other.key}>
              <Link
                href={localePath(`/saju/2027/${other.key}`, locale)}
                className="block border border-ink-700 px-4 py-3 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {locale === "ko" ? other.ko : other.en}
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
