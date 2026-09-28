import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { TierBadge } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";
import { assetPath } from "@/lib/assets";
import { buildAlternates } from "@/lib/seoAlternates";
import { contentLocaleFor, intlLocale, localePath, type Locale } from "@/i18n/locale";
import { CheckoutButton } from "@/components/premium/CheckoutButton";
import {
  PremiumReportFreeAnalysisLink,
  PremiumReportViewTracker,
} from "@/components/premium/PremiumReportAnalytics";
import { getSaju2027SaleState, type ActiveSaju2027Sale } from "@/server/billing/service";

export const dynamic = "force-dynamic";

const CHAPTERS = [
  { key: "work", directory: "reports/yearly-2027/chapters/work", name: "work" },
  {
    key: "relationships",
    directory: "reports/yearly-2027/chapters/relationships",
    name: "relationships",
  },
  {
    key: "wellbeing",
    directory: "reports/yearly-2027/chapters/wellbeing",
    name: "wellbeing",
  },
  { key: "growth", directory: "reports/yearly-2027/chapters/growth", name: "growth" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("yearlyReport");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await buildAlternates("/premium/saju-2027"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: [assetPath("reports/yearly-2027/hero", "hero")],
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

interface YearlySaju2027PageProps {
  readonly searchParams: Promise<Readonly<{ purchase?: string | readonly string[] }>>;
}

function PriceDisplay({ sale, locale }: { readonly sale: ActiveSaju2027Sale; readonly locale: Locale }) {
  return (
    <>
      <h3 id="yearly-report-purchase" className="text-lg font-medium text-hobun">
        {locale !== "ko" ? sale.nameEn : sale.nameKo}
      </h3>
      <p className="mt-2 font-mono text-xl text-hobun">
        {new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: sale.currency }).format(sale.amount)}
      </p>
    </>
  );
}

export default async function YearlySaju2027Page({ searchParams }: YearlySaju2027PageProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("yearlyReport");
  const [saleState, query] = await Promise.all([getSaju2027SaleState(), searchParams]);
  const purchaseState = Array.isArray(query.purchase) ? query.purchase[0] : query.purchase;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("metaTitle"),
    description: t("metaDescription"),
    inLanguage: contentLocaleFor(locale),
    image: assetPath("reports/yearly-2027/cover", "cover"),
    ...(saleState.status !== "hidden" ? {
      offers: {
        "@type": "Offer",
        price: saleState.sale.amount,
        priceCurrency: saleState.sale.currency,
        availability: saleState.status === "live" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        url: localePath("/premium/saju-2027", locale),
      },
    } : {}),
  } as const;

  return (
    <SceneShell tone="saju">
      <PremiumReportViewTracker />
      <JsonLd data={structuredData} />
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <TierBadge tier="cultural" />
          </div>
        </header>

        <section className="grid items-center gap-8 py-10 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] sm:py-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-hobun">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-3xl font-medium tracking-tight text-hobun sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-hobun-dim sm:text-base">
              {t("intro")}
            </p>
            <p className="mt-4 max-w-xl border-l border-hobun/50 pl-4 text-xs leading-relaxed text-hobun-faint">
              {t("status")}
            </p>
          </div>
          <div className="relative aspect-[2/3] max-h-[620px] overflow-hidden border border-hobun/30 bg-ink-950 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.9)]">
            <Image
              src={assetPath("reports/yearly-2027/cover", "cover")}
              alt={t("coverAlt")}
              fill
              sizes="(min-width: 640px) 42vw, 88vw"
              preload
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-2 flex flex-col gap-5 border-y border-ink-700 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-hobun">{t("freeAnalysisTitle")}</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-hobun-faint">
              {t("freeAnalysisDescription")}
            </p>
          </div>
          <PremiumReportFreeAnalysisLink
            className="inline-flex min-h-11 shrink-0 items-center justify-center border border-hobun/70 px-5 text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun"
          >
            {t("freeAnalysisCta")}
          </PremiumReportFreeAnalysisLink>
        </section>

        <section aria-labelledby="yearly-report-chapters" className="mt-10 border-t border-ink-700 pt-10">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-hobun">
              {t("chaptersEyebrow")}
            </p>
            <h2 id="yearly-report-chapters" className="mt-3 text-2xl font-medium text-hobun">
              {t("chaptersTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("chaptersDescription")}</p>
          </div>
          {saleState.status !== "hidden" ? (
            <section aria-labelledby="yearly-report-purchase" className="mt-6 border border-hobun/30 bg-ink-950/45 p-5 sm:p-7">
              <PriceDisplay sale={saleState.sale} locale={locale} />
              {saleState.status === "live" ? (
                <CheckoutButton locale={locale} />
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("previewNotice")}</p>
              )}
            </section>
          ) : null}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {CHAPTERS.map(({ key, directory, name }) => (
              <article key={key} className="overflow-hidden border border-ink-800 bg-ink-950/55">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={assetPath(directory, name)}
                    alt={t(`${key}Alt`)}
                    fill
                    sizes="(min-width: 640px) 45vw, 92vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-medium text-hobun">{t(`${key}Title`)}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-hobun-faint">
                    {t(`${key}Description`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {purchaseState === "success" ? (
          <p className="mt-6 border-l-2 border-hobun px-4 py-3 text-sm text-hobun" role="status" aria-live="polite">
            {locale !== "ko" ? "Payment is confirmed. Sign in to open your report." : "결제가 확인되었습니다. 로그인 후 리포트를 열 수 있습니다."}
            <Link className="ml-2 underline underline-offset-4" href={localePath("/account", locale)}>
              {locale !== "ko" ? "Open account" : "계정 열기"}
            </Link>
          </p>
        ) : purchaseState === "failed" ? (
          <p className="mt-6 text-sm text-hobun-dim" role="status" aria-live="polite">
            {locale !== "ko" ? "Payment was not confirmed. No report access was granted." : "결제가 확인되지 않아 리포트 이용 권한이 부여되지 않았습니다."}
          </p>
        ) : null}

        <p className="mt-7 text-[11px] leading-relaxed text-hobun-faint">{t("disclaimer")}</p>
      </main>
    </SceneShell>
  );
}
