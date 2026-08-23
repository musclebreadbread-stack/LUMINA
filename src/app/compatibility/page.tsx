import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CompatibilityForm } from "@/components/synastry/CompatibilityForm";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compatibility");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function CompatibilityPage() {
  const t = await getTranslations("compatibility");
  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <div className="no-print flex items-center gap-3">
            <LocaleSwitcher />
            <TierBadge tier="cultural" />
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
          <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-hobun">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("body")}</p>
        </section>

        <section className="border-t border-ink-700 pt-8" aria-labelledby="compatibility-input-heading">
          <h2 id="compatibility-input-heading" className="mb-7 text-lg font-medium text-hobun">{t("sectionInput")}</h2>
          <CompatibilityForm />
        </section>

        <footer className="mt-14 border-t border-ink-700 pt-8">
          <Disclaimer tier="cultural" />
        </footer>
      </main>
    </SceneShell>
  );
}
