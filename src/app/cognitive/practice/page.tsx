import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { PracticeForm } from "@/components/cognitive/PracticeForm";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SceneShell } from "@/components/ui/SceneShell";
import { PRACTICE_ITEMS } from "@/server/cognitive/practiceItems";
import type { Locale } from "@/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cognitive");
  return { title: t("practiceLink") };
}

export default async function CognitivePracticePage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("cognitive")]);
  return (
    <SceneShell tone="cognitive">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/cognitive" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <section className="py-10">
          <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / PRACTICE</p>
          <h1 className="mt-4 text-3xl font-semibold text-hobun">{t("practiceLink")}</h1>
          <p className="mt-4 text-sm leading-relaxed text-hobun-dim">{t("unaidedNotice")}</p>
        </section>
        <PracticeForm items={PRACTICE_ITEMS} locale={locale as Locale} />
      </main>
    </SceneShell>
  );
}
