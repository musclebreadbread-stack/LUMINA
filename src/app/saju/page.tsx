import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BirthForm } from "@/components/BirthForm";
import { RestoreFromStorage } from "@/components/report/RestoreFromStorage";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { TierBadge } from "@/components/ui/Chrome";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { SAJU_OVERVIEW_IMAGE } from "@/lib/sajuAssets";

/**
 * "내 결과 다시 보기" 입구.
 *
 * 리포트는 /r/[encoded] 에 있다. 여기서는 이 브라우저에 저장된 값을 찾아
 * 그 주소로 보내 줄 뿐이다. 서버는 아무것도 기억하지 않는다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("saju");
  return { title: t("entryTitle"), robots: { index: false } };
}

export default async function SajuEntryPage() {
  const t = await getTranslations("saju");
  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <TierBadge tier="cultural" />
        </div>
      </header>
      <RestoreFromStorage />
      <section className="border-t border-ink-700 py-12" aria-labelledby="new-saju-heading">
        <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.48fr)]">
          <div>
            <h1 id="new-saju-heading" className="text-2xl font-medium tracking-tight text-hobun">{t("newTitle")}</h1>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("newIntro")}</p>
          </div>
          <div className="assessment-hero-art relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
            <MotionSafeImage
              src={SAJU_OVERVIEW_IMAGE}
              alt={t("heroImageAlt")}
              sizes="(min-width: 640px) 320px, 82vw"
              priority
              className="object-cover"
              fallbackLabel={t("newTitle")}
            />
          </div>
        </div>
        <div className="mt-8">
          <BirthForm />
        </div>
      </section>
      </main>
    </SceneShell>
  );
}
