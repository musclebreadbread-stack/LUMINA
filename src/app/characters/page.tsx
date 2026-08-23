import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { allCharacters } from "@engine/characters";
import { CharacterCollection } from "@/components/character/CharacterCollection";
import { ElementSpirit } from "@/components/character/ElementSpirit";
import { InfoNav } from "@/components/ui/InfoNav";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { Locale } from "@/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("characters");
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function CharactersPage() {
  const [t, locale] = await Promise.all([getTranslations("characters"), getLocale()]);
  const resolvedLocale = locale as Locale;
  const cards = allCharacters().map((character) => {
    return {
      id: character.id,
      name: resolvedLocale === "en" ? character.nameEn : character.name,
      tagline: resolvedLocale === "en" ? character.taglineEn : character.tagline,
      children: <ElementSpirit character={character} size={92} />,
    };
  });

  return (
    <SceneShell tone="saju" tint={ELEMENT_STYLE.wood.cssVar}>
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <InfoNav />
        <section className="py-10 sm:py-14">
          <div className="reading-panel rounded-[1.75rem] border border-ink-700 p-6 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="font-mono text-[13px] tracking-[0.18em] text-ink-700/75">{t("kicker")}</p>
                <h1 className="mt-4 text-[clamp(1.9rem,5vw,3.4rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-ink-950">
                  {t("title")}
                </h1>
                <p className="mt-5 text-base leading-relaxed text-ink-800/85">{t("intro")}</p>
              </div>
              <div className="flex items-center gap-3 border border-ink-900/15 bg-ink-900/5 px-4 py-3">
                <TierBadge tier="cultural" tone="light" />
                <span className="font-mono text-[13px] text-ink-700/75">{t("allCharacters")}</span>
              </div>
            </div>
          </div>
        </section>

        <CharacterCollection
          cards={cards}
          progressLabel={t("progress")}
          lockedLabel={t("locked")}
          unlockedLabel={t("unlocked")}
          lockedBody={t("lockedBody")}
        />

        <p className="mt-8 border-l border-ink-600 pl-4 text-[13px] leading-relaxed text-hobun-faint">
          {t("catalogNote")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/saju" className="inline-flex min-h-11 items-center bg-hobun px-5 text-sm font-semibold text-ink-900">
            {t("openSaju")}
          </Link>
          <Disclaimer tier="cultural" />
        </div>
      </main>
    </SceneShell>
  );
}
