import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { TarotCard } from "@/components/tarot/TarotCard";
import { TarotRevealGate } from "@/components/tarot/TarotRevealGate";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { MethodNote } from "@/components/ui/MethodNote";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildTarotView } from "@/lib/tarotModel";
import type { Locale } from "@/i18n/locale";
import type { SpreadKey } from "@engine/tarot";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";

const SPREAD_KEYS: readonly SpreadKey[] = ["single", "three", "celtic-cross"];

function isSpreadKey(value: string): value is SpreadKey {
  return (SPREAD_KEYS as readonly string[]).includes(value);
}

interface Params {
  readonly spread: string;
  readonly seed: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { spread, seed } = await params;
  const t = await getTranslations("tarot");
  const locale = (await getLocale()) as Locale;

  if (!isSpreadKey(spread)) return { title: t("metaTitle"), robots: { index: false } };

  const view = buildTarotView(spread, seed);
  const first = view.cards[0];
  const spreadName = locale === "en" ? view.spreadEn : view.spreadKo;
  const cardName = first ? (locale === "en" ? first.nameEn : first.name) : t("metaTitle");

  return {
    robots: { index: false, follow: false },
    title: `${spreadName} · ${cardName}`,
    description: t("resultMetaDescription", { spread: spreadName }),
  };
}

export default async function TarotResultPage({ params }: { params: Promise<Params> }) {
  const { spread, seed } = await params;
  if (!isSpreadKey(spread)) notFound();

  const [t, tCommon] = await Promise.all([
    getTranslations("tarot"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;

  let view;
  try {
    view = buildTarotView(spread, seed);
  } catch {
    notFound();
  }

  const spreadName = locale === "en" ? view.spreadEn : view.spreadKo;

  const gridClass =
    view.cards.length === 1
      ? "grid gap-6"
      : view.cards.length === 3
        ? "grid gap-5 sm:grid-cols-3"
        : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <SceneShell tone="tarot">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="tarot" />

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="no-print flex items-center gap-3">
          <LocaleSwitcher />
          <TierBadge tier="cultural" />
        </div>
      </header>

      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={t("sectionCards")}
          title={spreadName}
          summary={t("resultMetaDescription", { spread: spreadName })}
          imageSrc={view.cards[0]?.imageSrc}
          imageAlt={view.cards[0] ? (locale === "en" ? view.cards[0].nameEn : view.cards[0].name) : spreadName}
          imageLabel={spreadName}
          tier="cultural"
        />
        <p id="calculation-tarot-seed" className="mt-3 break-all font-mono text-[13px] leading-relaxed text-hobun-faint">
          {t("seedLabel")} · {view.seed}
        </p>
      </div>

      <Section index="01" title={t("sectionCards")} aside={<>{t("cardCount", { count: view.cards.length })}</>}>
        <TarotRevealGate
          openLabel={t("revealCta")}
          hint={t("revealHint")}
          choices={view.cards.map((card) => (locale === "en" ? card.positionEn : card.positionKo))}
        >
          <div className={gridClass}>
            {view.cards.map((card, i) => (
              <TarotCard key={`${card.name}-${i}`} card={card} order={i} />
            ))}
          </div>
        </TarotRevealGate>
      </Section>

      <div className="mt-8">
        <MethodNote locale={locale} title={tCommon("methodNote")} block={view.method} />
      </div>

      <AdSlot slot="tarot-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar
          title={`${spreadName} · LUMINA ${t("metaTitle")}`}
          restartHref="/tarot"
          restartLabel={t("redraw")}
        />
        <Disclaimer />
      </footer>
      </main>
    </SceneShell>
  );
}
