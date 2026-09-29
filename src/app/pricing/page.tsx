import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildAlternates } from "@/lib/seoAlternates";
import { intlLocale, isLocale, localePath, type Locale } from "@/i18n/locale";
import { getSaju2027SaleState } from "@/server/billing/service";
import { getActiveLuminaPlusSale } from "@/server/billing/subscriptions";

export const dynamic = "force-dynamic";

function copyFor(locale: Locale) {
  const english = locale !== "ko";
  return {
    english,
    title: english ? "Pricing" : "요금 안내",
    description: english
      ? "Paid reports and memberships currently offered on LUMINA, with prices and purchase terms."
      : "LUMINA에서 현재 안내 중인 유료 리포트와 멤버십의 가격·구매 조건입니다.",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const localeValue = await getLocale();
  const copy = copyFor(isLocale(localeValue) ? localeValue : "ko");
  return {
    title: copy.title,
    description: copy.description,
    alternates: await buildAlternates("/pricing"),
    robots: { index: true, follow: true },
  };
}

function formatKrw(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

export default async function PricingPage() {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const { english, title, description } = copyFor(locale);
  const [saleState, plusSale] = await Promise.all([getSaju2027SaleState(), getActiveLuminaPlusSale()]);
  const hasAnyOffer = saleState.status !== "hidden" || plusSale !== null;
  const cardClass = "border border-hobun/30 bg-ink-950/45 p-5 sm:p-7";
  const detailLinkClass = "mt-4 inline-flex min-h-11 items-center border border-hobun/70 px-5 text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun";

  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-700 py-5">
          <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>

        <section className="py-12">
          <p className="font-mono text-xs tracking-[0.2em] text-hobun">PRICING</p>
          <h1 className="mt-3 text-3xl font-medium text-hobun sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-hobun-dim">{description}</p>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-hobun-faint">
            {english
              ? "The free analyses need no payment. The items below are optional paid reports and memberships."
              : "무료 분석은 결제 없이 이용할 수 있습니다. 아래는 선택해서 구매하는 유료 리포트와 멤버십입니다."}
          </p>
        </section>

        {hasAnyOffer ? (
          <section className="grid gap-4 sm:grid-cols-2" aria-label={english ? "Products and prices" : "상품과 가격"}>
            {saleState.status !== "hidden" ? (
              <article className={cardClass}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hobun-faint">
                  {saleState.status === "live"
                    ? (english ? "On sale" : "판매 중")
                    : (english ? "Coming soon" : "판매 시작 예정")}
                </p>
                <h2 className="mt-2 text-lg font-medium text-hobun">{english ? saleState.sale.nameEn : saleState.sale.nameKo}</h2>
                <p className="mt-3 font-mono text-2xl text-hobun">{formatKrw(saleState.sale.amount, locale)}</p>
                <p className="mt-2 text-xs leading-6 text-hobun-dim">
                  {english ? "One-time purchase · digital report" : "1회 결제 · 디지털 리포트"}
                </p>
                <Link href={localePath("/premium/saju-2027", locale)} className={detailLinkClass}>
                  {english ? "View details" : "자세히 보기"}
                </Link>
              </article>
            ) : null}
            {plusSale !== null ? (
              <>
                {([
                  { key: "monthly", value: plusSale.monthly, interval: english ? "per month" : "매월" },
                  { key: "yearly", value: plusSale.yearly, interval: english ? "per year" : "매년" },
                ] as const).map(({ key, value, interval }) => (
                  <article key={key} className={cardClass}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hobun-faint">
                      {english ? "Membership" : "멤버십"}
                    </p>
                    <h2 className="mt-2 text-lg font-medium text-hobun">{english ? value.nameEn : value.nameKo}</h2>
                    <p className="mt-3 font-mono text-2xl text-hobun">
                      {formatKrw(value.amount, locale)}
                      <span className="ml-2 text-xs text-hobun-faint">{interval}</span>
                    </p>
                    <p className="mt-2 text-xs leading-6 text-hobun-dim">
                      {english ? "Recurring payment · cancel any time from your account" : "정기 결제 · 계정에서 언제든 해지"}
                    </p>
                    <Link href={localePath("/plus", locale)} className={detailLinkClass}>
                      {english ? "View details" : "자세히 보기"}
                    </Link>
                  </article>
                ))}
              </>
            ) : null}
          </section>
        ) : (
          <p className="border border-ink-800 bg-ink-950/45 p-5 text-sm text-hobun-dim" role="status">
            {english ? "There are no paid products on sale at the moment." : "현재 판매 중인 유료 상품이 없습니다."}
          </p>
        )}

        <section className="mt-10 border-t border-ink-800 pt-8 text-xs leading-7 text-hobun-dim" aria-label={english ? "Purchase terms" : "구매 조건"}>
          <h2 className="text-sm font-medium text-hobun">{english ? "Purchase terms" : "구매 조건"}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>{english ? "Payments are made by card through Toss Payments." : "결제는 토스페이먼츠를 통한 카드 결제로 진행됩니다."}</li>
            <li>
              {english
                ? "These are digital contents. Opening a report can end the right to withdraw the purchase; you are told this and asked to confirm before paying."
                : "디지털 콘텐츠이므로 리포트를 열람하면 청약철회가 제한될 수 있으며, 결제 전 확인 화면에서 이를 안내하고 동의를 받습니다."}
            </li>
            <li>{english ? "Membership renews automatically until you cancel it from your account." : "멤버십은 계정에서 해지하기 전까지 자동으로 갱신됩니다."}</li>
          </ul>
          <p className="mt-4">
            <Link href={localePath("/refund-policy", locale)} className="underline underline-offset-4">{english ? "Refund policy" : "환불 안내"}</Link>
            <span aria-hidden className="mx-2 text-hobun-faint">·</span>
            <Link href={localePath("/terms", locale)} className="underline underline-offset-4">{english ? "Terms of Service" : "이용약관"}</Link>
            <span aria-hidden className="mx-2 text-hobun-faint">·</span>
            <Link href={localePath("/privacy", locale)} className="underline underline-offset-4">{english ? "Privacy Policy" : "개인정보처리방침"}</Link>
          </p>
        </section>
      </main>
    </SceneShell>
  );
}
