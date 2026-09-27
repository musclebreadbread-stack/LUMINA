import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CancelSubscriptionButton } from "@/components/account/CancelSubscriptionButton";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { intlLocale, isLocale, localePath, type Locale } from "@/i18n/locale";
import { getSignedInMember } from "@/server/auth/session";
import { isMemberAuthConfigured } from "@/server/auth";
import { listOwnSubscriptions } from "@/server/billing/subscriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage subscriptions | LUMINA",
  robots: { index: false, follow: false },
};

function signInPath(locale: Locale): string {
  return localePath("/account/sign-in", locale);
}

export default async function ManageSubscriptionsPage() {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const english = locale !== "ko";
  if (!isMemberAuthConfigured()) redirect(signInPath(locale));
  const member = await getSignedInMember();
  if (!member) redirect(signInPath(locale));
  const subscriptions = await listOwnSubscriptions().catch(() => null);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-700 py-5">
        <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <LocaleSwitcher />
      </header>
      <section className="py-10">
        <p className="font-mono text-xs tracking-[0.2em] text-hobun-faint">LUMINA+</p>
        <h1 className="mt-3 text-3xl font-medium text-hobun">{english ? "Manage subscriptions" : "구독 관리"}</h1>
        <p className="mt-3 text-sm leading-6 text-hobun-dim">
          {english
            ? "You can cancel here without changing your account settings. Cancellation stops future renewals."
            : "계정 설정을 변경하지 않고 여기서 구독을 해지할 수 있습니다. 해지하면 다음 자동 갱신이 중단됩니다."}
        </p>
        {subscriptions === null ? (
          <p className="mt-8 text-sm text-hobun-dim" role="status">
            {english ? "Subscription details are temporarily unavailable." : "구독 정보를 일시적으로 확인할 수 없습니다."}
          </p>
        ) : subscriptions.length > 0 ? (
          <ul className="mt-8 divide-y divide-ink-800 border-y border-ink-800">
            {subscriptions.map((subscription) => (
              <li key={subscription.id} className="py-5">
                <p className="text-sm text-hobun">{subscription.productName}</p>
                <p className="mt-2 text-xs text-hobun-faint">
                  {subscription.status}
                  {subscription.periodEnd
                    ? " · " + (english ? "period ends " : "이용 종료 ") + new Date(subscription.periodEnd).toLocaleDateString(intlLocale(locale))
                    : ""}
                  {subscription.cancelAtPeriodEnd ? " · " + (english ? "renewal stopped" : "갱신 중단됨") : ""}
                </p>
                {subscription.status === "pending" || subscription.status === "active" || subscription.status === "past_due"
                  ? <CancelSubscriptionButton subscriptionId={subscription.id} locale={locale} />
                  : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-sm text-hobun-dim">{english ? "No subscriptions." : "구독 내역이 없습니다."}</p>
        )}
      <Link href={localePath("/account", locale)} className="mt-8 inline-flex min-h-11 items-center text-xs text-hobun underline underline-offset-4">
          {english ? "Back to account" : "계정으로 돌아가기"}
        </Link>
      </section>
    </main>
  );
}
