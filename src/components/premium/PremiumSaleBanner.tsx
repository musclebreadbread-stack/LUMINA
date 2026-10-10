import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { premiumSaleCopyKeys } from "@/lib/premiumSaleCopy";
import { getSaju2027SaleState } from "@/server/billing/service";

/**
 * astro/all/today/compatibility용 경량 판매 접점 — PremiumTeaser와 같은 카피 선택
 * 로직(premiumSaleCopyKeys)을 쓰지만, 이 페이지들에는 hero 이미지가 없으므로
 * PremiumTeaser보다 더 가볍다.
 */
export async function PremiumSaleBanner() {
  const [t, saleState] = await Promise.all([getTranslations("yearlyReport"), getSaju2027SaleState()]);
  const keys = premiumSaleCopyKeys(saleState);

  return (
    <aside
      aria-labelledby="premium-sale-banner-title"
      className="no-print my-10 border border-hobun/35 bg-ink-950/70 px-6 py-6"
    >
      <Link
        href="/premium/saju-2027"
        className="group flex flex-col items-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-hobun">{t(keys.eyebrowKey)}</p>
        <h2 id="premium-sale-banner-title" className="mt-2 text-lg font-medium tracking-tight text-hobun">
          {t(keys.titleKey)}
        </h2>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-hobun-dim">{t(keys.descriptionKey)}</p>
        <span className="mt-3 border-b border-hobun/60 pb-1 text-xs text-hobun transition-colors group-hover:border-hobun group-hover:text-white">
          {t(keys.linkKey)}
        </span>
      </Link>
    </aside>
  );
}
