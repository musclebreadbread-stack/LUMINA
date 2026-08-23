import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CitationList } from "@/components/ui/CitationList";
import { InfoNav } from "@/components/ui/InfoNav";
import { REFERENCE_GROUPS, type ReferenceGroupKey } from "@/lib/referenceCatalog";

const TITLE_KEYS: Readonly<Record<ReferenceGroupKey, string>> = Object.freeze({
  saju: "saju",
  astro: "astro",
  tarot: "tarot",
  numerology: "numerology",
  psychometrics: "psychometrics",
  jungian: "jungian",
  horoscope: "horoscope",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("referencesPage");
  return { title: t("title") };
}

export default async function ReferencesPage() {
  const t = await getTranslations("referencesPage");
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
        {REFERENCE_GROUPS.map((group) => (
          <section key={group.key}>
            <h2 className="text-lg font-medium text-hobun">{t(TITLE_KEYS[group.key])}</h2>
            <CitationList citations={group.citations} />
          </section>
        ))}
      </div>
      <p className="mt-12 border-l border-ink-600 pl-4 text-[13px] leading-relaxed text-hobun-faint">
        {t("note")}
      </p>
    </main>
  );
}
