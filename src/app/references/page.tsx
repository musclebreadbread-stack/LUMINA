import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CitationList } from "@/components/ui/CitationList";
import { InfoNav } from "@/components/ui/InfoNav";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { REFERENCE_GROUPS } from "@/lib/referenceCatalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("referencesPage");
  return { title: t("title") };
}

export default async function ReferencesPage() {
  const [t, homeT] = await Promise.all([getTranslations("referencesPage"), getTranslations("home")]);
  const groups = ANALYSIS_CATALOG.map((definition) =>
    REFERENCE_GROUPS.find((group) => group.key === definition.key),
  ).filter((group): group is (typeof REFERENCE_GROUPS)[number] => group !== undefined);
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <InfoNav />
      <div className="py-10">
        <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("intro")}</p>
      </div>
      <div className="space-y-10 border-t border-ink-700 pt-8">
        {groups.map((group) => {
          const definition = ANALYSIS_CATALOG.find((item) => item.key === group.key);
          if (!definition) return null;
          return (
          <section key={group.key}>
            <h2 className="text-lg font-medium text-hobun">{homeT(definition.titleKey)}</h2>
            <CitationList citations={group.citations} />
          </section>
          );
        })}
      </div>
      <p className="mt-12 border-l border-ink-600 pl-4 text-[13px] leading-relaxed text-hobun-faint">
        {t("note")}
      </p>
    </main>
  );
}
