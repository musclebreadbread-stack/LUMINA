import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { InfoNav } from "@/components/ui/InfoNav";

const ITEM_KEYS = [
  "evidenceRef",
  "tenGod",
  "growthStage",
  "trueSolar",
  "house",
  "aspect",
  "tScore",
  "percentile",
  "sem",
  "masterNumber",
  "jungianAxis",
  "typeBoundary",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("glossaryPage");
  return { title: t("title") };
}

export default async function GlossaryPage() {
  const [t, tNav] = await Promise.all([getTranslations("glossaryPage"), getTranslations("nav")]);
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <InfoNav />
      <Breadcrumbs
        label={tNav("breadcrumb")}
        items={[{ href: "/", label: "LUMINA" }, { label: t("title") }]}
      />
      <div className="py-10">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("intro")}</p>
      </div>
      <dl className="space-y-7 border-t border-ink-700 pt-8">
        {ITEM_KEYS.map((key) => (
          <div key={key} id={`glossary-${key}`} className="border-b border-ink-800 pb-6 last:border-b-0">
            <dt className="text-lg font-medium text-hobun">
              <abbr title={t(`items.${key}.definition`)} className="no-underline">
                {t(`items.${key}.term`)}
              </abbr>
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-hobun-dim">{t(`items.${key}.definition`)}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
