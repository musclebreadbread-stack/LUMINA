import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InfoNav } from "@/components/ui/InfoNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("methodologyPage");
  return { title: t("title") };
}

export default async function MethodologyPage() {
  const t = await getTranslations("methodologyPage");
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

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("verificationHeading")}</h2>
        <ul className="mt-5 space-y-4">
          {["sajuCases", "astroCases", "dayCases", "norms", "determinism", "jungian"].map((key) => (
            <li key={key} className="border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-dim">
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("limitsHeading")}</h2>
        <p className="mt-4 text-sm leading-relaxed text-hobun-dim">{t("limitsBody")}</p>
        <p className="mt-4 border-l border-ink-600 pl-4 text-[13px] leading-relaxed text-hobun-faint">{t("notYet")}</p>
      </section>

      <Link href="/references" className="mt-10 inline-flex min-h-11 items-center border border-ink-600 px-4 text-sm text-hobun-dim underline underline-offset-4 hover:border-hobun hover:text-hobun">
        {t("backToSources")}
      </Link>
    </main>
  );
}
