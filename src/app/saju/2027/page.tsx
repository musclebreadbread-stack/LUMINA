import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CHINESE_SIGNS } from "@engine/horoscope/constants";
import { STEMS } from "@engine/saju/constants";
import { pillarLabel } from "@engine/saju/pillars";
import {
  ALL_ILJU_PILLARS,
  iljuSlug,
  monthlyPillarTable2027,
  seollalOf,
} from "@engine/saju/publicGuides";
import { ipchunOf } from "@engine/saju/solarTerms";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { InfoNav } from "@/components/ui/InfoNav";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { buildAlternates } from "@/lib/seoAlternates";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * 이 페이지와 형제 라우트(`[sign]`, `ilgan/[stem]`, `ilju/[pillar]`)는 birth data
 * 없이 순수 상수로 계산되지만, 매 요청 동적으로 렌더한다(정적 캐싱하지 않는다).
 * `buildAlternates()`가 프록시가 헤더로 넘기는 요청별 로케일을 읽는데(seoAlternates.ts),
 * 이 사이트는 `/en/*`을 같은 논리 경로로 rewrite하는 구조라서 실제로 정적 캐싱하면
 * Next의 라우트 캐시가 경로만으로 키를 잡아 ko/en 콘텐츠가 뒤섞인다. 상수 계산 비용은
 * 무시할 수준이므로 매 요청 재계산을 택한다.
 */
export const dynamic = "force-dynamic";

function formatKstDate(instant: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(instant);
}

function formatBirthDate(date: Readonly<{ year: number; month: number; day: number }>, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}

function resolveLocale(raw: string): Locale {
  return isLocale(raw) ? raw : "ko";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sajuGuidesPage");
  return {
    alternates: await buildAlternates("/saju/2027"),
    title: t("hubTitle"),
    description: t("hubDescription"),
  };
}

export default async function Saju2027HubPage() {
  const locale = resolveLocale(await getLocale());
  const [t, tNav] = await Promise.all([
    getTranslations("sajuGuidesPage"),
    getTranslations("nav"),
  ]);

  const ipchun = formatKstDate(ipchunOf(2027), locale);
  const seollal = formatBirthDate(seollalOf(2027), locale);
  const monthlyRows = monthlyPillarTable2027();
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("hubTitle"),
    description: t("hubDescription"),
    url: new URL(localePath("/saju/2027", locale), siteUrl).toString(),
    inLanguage: locale,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <JsonLd data={structuredData} />
      <InfoNav />
      <Breadcrumbs
        label={tNav("breadcrumb")}
        items={[{ href: "/", label: "LUMINA" }, { label: t("hubTitle") }]}
      />

      <div className="py-10">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-medium tracking-tight">
          {t("hubTitle")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("hubIntro")}</p>
      </div>

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("boundaryHeading")}</h2>
        <p className="mt-4 text-sm leading-relaxed text-hobun-dim">
          {t("boundaryBody", { ipchun, seollal })}
        </p>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("monthlyTableHeading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("monthlyTableIntro")}</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <tbody>
              {monthlyRows.map((row) => (
                <tr key={row.monthOrdinal} className="border-b border-ink-800">
                  <td className="py-2 pr-4 font-mono text-[13px] text-hobun-faint">
                    {t("monthlyTableMonthLabel", { ordinal: row.monthOrdinal + 1 })}
                  </td>
                  <td className="py-2 pr-4 text-hobun">{pillarLabel(row.pillar, "hanja")}</td>
                  <td className="py-2 text-hobun-dim">{formatKstDate(row.term.instant, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("signSectionHeading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("signSectionIntro")}</p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CHINESE_SIGNS.map((sign) => (
            <li key={sign.key}>
              <Link
                href={localePath(`/saju/2027/${sign.key}`, locale)}
                className="block border border-ink-700 px-4 py-3 text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {locale === "ko" ? sign.ko : sign.en}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("ilganSectionHeading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("ilganSectionIntro")}</p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STEMS.map((stem) => (
            <li key={stem.index}>
              <Link
                href={localePath(`/saju/ilgan/${stem.en.toLowerCase()}`, locale)}
                className="block border border-ink-700 px-4 py-3 text-center text-sm text-hobun-dim hover:border-hobun hover:text-hobun"
              >
                {stem.hanja}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("iljuSectionHeading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("iljuSectionIntro")}</p>
        <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ALL_ILJU_PILLARS.map((pillar) => (
            <li key={pillar.sexagenary}>
              <Link
                href={localePath(`/saju/ilju/${iljuSlug(pillar)}`, locale)}
                className="block border border-ink-800 px-2 py-2 text-center font-mono text-[13px] text-hobun-faint hover:border-hobun hover:text-hobun"
              >
                {pillarLabel(pillar, "hanja")}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href={localePath("/premium/saju-2027", locale)}
        className="mt-12 inline-flex min-h-11 items-center border border-ink-600 px-4 text-sm text-hobun-dim underline underline-offset-4 hover:border-hobun hover:text-hobun"
      >
        {t("hubCta")}
      </Link>
    </main>
  );
}
