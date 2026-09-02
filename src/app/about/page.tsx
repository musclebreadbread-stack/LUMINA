import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { InfoNav } from "@/components/ui/InfoNav";
import { buildAlternates } from "@/lib/seoAlternates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aboutPage");
  return {
    title: t("title"),
    description: t("intro"),
    alternates: await buildAlternates("/about"),
  };
}

/** 근거 계층·데이터 취급·한계를 한 화면에서 밝히는 소개 페이지. */
export default async function AboutPage() {
  const [t, tNav] = await Promise.all([getTranslations("aboutPage"), getTranslations("nav")]);

  const sections = [
    { key: "what", heading: t("whatHeading"), body: t("whatBody") },
    { key: "tier", heading: t("tierHeading"), body: t("tierBody") },
    { key: "data", heading: t("dataHeading"), body: t("dataBody") },
    { key: "limits", heading: t("limitsHeading"), body: t("limitsBody") },
  ] as const;

  const furtherReading = [
    { href: "/methodology", label: tNav("methodology") },
    { href: "/references", label: tNav("references") },
    { href: "/glossary", label: tNav("glossary") },
    { href: "/privacy", label: tNav("privacy") },
    { href: "/terms", label: tNav("terms") },
    { href: "/contact", label: tNav("contact") },
  ] as const;

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

      <div className="space-y-10 border-t border-ink-700 pt-8">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-lg font-medium text-hobun">{section.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{section.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{t("moreHeading")}</h2>
        <nav className="mt-5 flex flex-wrap gap-2">
          {furtherReading.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
