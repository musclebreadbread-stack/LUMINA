import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { assetPath } from "@/lib/assets";
import { premiumSaleCopyKeys } from "@/lib/premiumSaleCopy";
import { getSaju2027SaleState } from "@/server/billing/service";

export async function PremiumTeaser() {
  const [t, saleState] = await Promise.all([getTranslations("yearlyReport"), getSaju2027SaleState()]);
  const keys = premiumSaleCopyKeys(saleState);

  return (
    <aside
      aria-labelledby="yearly-report-teaser-title"
      className="no-print my-10 overflow-hidden border border-hobun/35 bg-ink-950/70"
    >
      <Link
        href="/premium/saju-2027"
        className="group grid min-h-52 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.72fr)]"
      >
        <div className="flex flex-col items-start justify-center px-6 py-7 sm:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-hobun">
            {t(keys.eyebrowKey)}
          </p>
          <h2
            id="yearly-report-teaser-title"
            className="mt-3 text-xl font-medium tracking-tight text-hobun sm:text-2xl"
          >
            {t(keys.titleKey)}
          </h2>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-hobun-dim">
            {t(keys.descriptionKey)}
          </p>
          <span className="mt-5 border-b border-hobun/60 pb-1 text-xs text-hobun transition-colors group-hover:border-hobun group-hover:text-white">
            {t(keys.linkKey)}
          </span>
        </div>
        <div className="relative min-h-48 overflow-hidden border-t border-ink-800 sm:border-t-0 sm:border-l">
          <Image
            src={assetPath("reports/yearly-2027/hero", "hero")}
            alt=""
            fill
            sizes="(min-width: 640px) 42vw, 100vw"
            className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-950/35 via-transparent to-transparent" />
        </div>
      </Link>
    </aside>
  );
}
