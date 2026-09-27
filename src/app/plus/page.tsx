import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SubscriptionCheckoutButton } from "@/components/premium/SubscriptionCheckoutButton";
import { SceneShell } from "@/components/ui/SceneShell";
import { intlLocale, isLocale, localePath } from "@/i18n/locale";
import { getActiveLuminaPlusSale } from "@/server/billing/subscriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LUMINA+",
  description: "Manage your LUMINA+ membership.",
  robots: { index: false, follow: false },
};

interface PlusPageProps {
  readonly searchParams: Promise<Readonly<{ subscription?: string | readonly string[] }>>;
}

export default async function PlusPage({ searchParams }: PlusPageProps) {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const english = locale !== "ko";
  const [sale, query] = await Promise.all([getActiveLuminaPlusSale(), searchParams]);
  const subscriptionState = Array.isArray(query.subscription) ? query.subscription[0] : query.subscription;

  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-700 py-5">
          <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <section className="py-12">
          <p className="font-mono text-xs tracking-[0.2em] text-hobun">LUMINA+</p>
          <h1 className="mt-3 text-3xl font-medium text-hobun sm:text-5xl">
            {english ? "A deeper way to explore yourself." : "나를 더 깊이 탐색하는 멤버십"}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-hobun-dim">
            {english
              ? "LUMINA+ is a recurring membership for integrated reports and premium chapters. Signup opens only after payment and legal setup is approved."
              : "LUMINA+는 통합 리포트와 프리미엄 챕터를 위한 정기 구독입니다. 결제 계약과 법무 검토가 완료된 뒤에만 가입을 엽니다."}
          </p>
        </section>

        {sale ? (
          <section className="grid gap-4 sm:grid-cols-2" aria-label={english ? "Subscription plans" : "구독 플랜"}>
            {([
              { key: "lumina-plus-monthly", value: sale.monthly, interval: english ? "per month" : "매월" },
              { key: "lumina-plus-yearly", value: sale.yearly, interval: english ? "per year" : "매년" },
            ] as const).map(({ key, value, interval }) => (
              <article key={key} className="border border-hobun/30 bg-ink-950/45 p-5 sm:p-7">
                <h2 className="text-lg font-medium text-hobun">{english ? value.nameEn : value.nameKo}</h2>
                <p className="mt-3 text-2xl text-hobun">
                  {new Intl.NumberFormat(intlLocale(locale), {
                    style: "currency",
                    currency: value.currency,
                    maximumFractionDigits: 0,
                  }).format(value.amount)}
                  <span className="ml-2 text-xs text-hobun-faint">{interval}</span>
                </p>
                <SubscriptionCheckoutButton locale={locale} productKey={key} />
              </article>
            ))}
          </section>
        ) : (
          <p className="border border-ink-800 bg-ink-950/45 p-5 text-sm text-hobun-dim" role="status">
            {english ? "Membership signup is not available yet." : "현재 멤버십 가입을 준비하고 있습니다."}
          </p>
        )}

        {subscriptionState === "pending" ? (
          <p className="mt-6 border-l-2 border-hobun px-4 py-3 text-sm text-hobun" role="status" aria-live="polite">
            {english ? "Card registration is complete. Your membership starts after the first payment is confirmed." : "카드 등록이 완료되었습니다. 첫 결제가 확인되면 구독이 시작됩니다."}
          <Link className="ml-2 underline underline-offset-4" href={localePath("/account", locale)}>
              {english ? "Open account" : "계정 열기"}
            </Link>
          </p>
        ) : subscriptionState === "failed" ? (
          <p className="mt-6 text-sm text-hobun-dim" role="status" aria-live="polite">
            {english ? "Card registration did not complete. No subscription was started." : "카드 등록이 완료되지 않아 구독이 시작되지 않았습니다."}
          </p>
        ) : null}
        <p className="mt-8 text-xs leading-6 text-hobun-faint">
          {english
            ? "Cancel from the account page. Cancellation takes effect at the end of the paid period. Review the terms and renewal notice before subscribing."
            : "계정 페이지에서 해지할 수 있으며, 해지는 결제된 이용 기간이 끝날 때 적용됩니다. 가입 전에 약관과 자동 갱신 안내를 확인해 주세요."}
        </p>
      </main>
    </SceneShell>
  );
}
