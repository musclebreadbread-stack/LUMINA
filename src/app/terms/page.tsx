import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("policy");
  return { title: t("termsTitle") };
}

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export default async function TermsPage() {
  const [t, tNav] = await Promise.all([getTranslations("policy"), getTranslations("nav")]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <LocaleSwitcher />
      </header>

      <div className="py-10">
        <h1 className="text-[clamp(1.5rem,4.5vw,2rem)] leading-tight font-medium tracking-tight">
          {t("termsTitle")}
        </h1>
        <p className="mt-3 font-mono text-[13px] text-hobun-faint">{t("draftNote")}</p>
      </div>

      <div className="space-y-10 border-t border-ink-700 pt-8 text-sm leading-relaxed text-hobun-dim">
        {SECTIONS.map((n) => (
          <section key={n}>
            <h2 className="mb-3 text-base font-medium text-hobun">{t(`terms${n}Title`)}</h2>
            <p>{t(`terms${n}Body`)}</p>
          </section>
        ))}
      </div>

      <footer className="mt-16 border-t border-ink-700 pt-8">
        <Link href="/privacy" className="font-mono text-[13px] text-hobun-faint underline underline-offset-4">
          {tNav("privacyView")}
        </Link>
      </footer>
    </main>
  );
}
