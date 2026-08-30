import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { Disclaimer } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { COGNITIVE_OVERVIEW_IMAGE } from "@/lib/psychometricsAssets";

interface Query {
  readonly r?: string;
  readonly s?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cognitive");
  return {
    title: t("legacyNotice"),
    description: t("legacyNotice"),
    robots: { index: false, follow: false },
  };
}

/** 과거 ?r= 응답 링크는 보존하되, 클라이언트 정답키·해설·새 공유를 다시 만들지 않는다. */
export default async function CognitiveLegacyResultPage({
  searchParams,
}: {
  readonly searchParams: Promise<Query>;
}) {
  const { s } = await searchParams;
  if (s) redirect(`/s/cognitive/${s}`);
  const t = await getTranslations("cognitive");
  const evidence = analysisDefinition("cognitive");

  return (
    <SceneShell tone="cognitive">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <section className="py-24">
          <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">{evidence.key.toUpperCase()} / LEGACY</p>
          <h1 className="mt-4 text-3xl font-semibold text-hobun">{t("legacyNotice")}</h1>
          <div className="assessment-result-art relative mt-6 aspect-[3/2] w-full max-w-[260px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900">
            <MotionSafeImage
              src={COGNITIVE_OVERVIEW_IMAGE}
              alt={t("resultImageAlt")}
              sizes="(min-width: 640px) 260px, 82vw"
              priority
              className="object-cover"
              fallbackLabel={t("legacyNotice")}
            />
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-hobun-dim">{t("pilotNotice")}</p>
          <Link href="/cognitive" className="mt-8 inline-block min-h-11 bg-hobun px-5 py-3 text-sm font-medium text-ink-900">{t("pilotResultCta")}</Link>
        </section>
        <footer className="border-t border-ink-700 pt-8"><Disclaimer tier="scientific" /></footer>
      </main>
    </SceneShell>
  );
}
