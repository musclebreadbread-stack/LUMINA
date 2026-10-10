import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SignOutButton } from "@/components/account/SignOutButton";
import { ClaimLocalData } from "@/components/account/ClaimLocalData";
import { ShareSavedResults } from "@/components/account/ShareSavedResults";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { SelfRefundButton } from "@/components/account/SelfRefundButton";
import { CancelSubscriptionButton } from "@/components/account/CancelSubscriptionButton";
import { MarketingOptIn } from "@/components/growth/MarketingOptIn";
import { intlLocale, isLocale, localePath, type Locale } from "@/i18n/locale";
import { isMemberAuthConfigured } from "@/server/auth";
import { getSignedInMember } from "@/server/auth/session";
import { isGrowthCapabilityEnabled } from "@/server/growth/featureGate";
import { getOwnMarketingPreference } from "@/server/growth/marketingPreference";
import { hasRequiredMemberConsents } from "@/server/member/consents";
import { getOwnSavedResults, listOwnShareLinks } from "@/server/member/dal";
import { listOwnBillingOrders } from "@/server/billing/service";
import { listOwnSubscriptions } from "@/server/billing/subscriptions";

export const metadata: Metadata = {
  title: "LUMINA Account",
  robots: { index: false, follow: false },
};

function routeForLocale(locale: Locale, path: string): string {
  return localePath(path, locale);
}

export default async function AccountPage() {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  if (!isMemberAuthConfigured()) redirect(routeForLocale(locale, "/account/sign-in"));

  const session = await getSignedInMember();
  if (!session) redirect(routeForLocale(locale, "/account/sign-in"));

  try {
    if (!(await hasRequiredMemberConsents(session.user.id))) {
      redirect(routeForLocale(locale, "/account/consent"));
    }
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <p className="mt-10 text-sm text-hobun-dim">
          {locale !== "ko" ? "Member data is temporarily unavailable. Please try again." : "회원 정보를 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."}
        </p>
      </main>
    );
  }

  const [billingOrdersResult, subscriptionsResult] = await Promise.allSettled([
    listOwnBillingOrders(),
    listOwnSubscriptions(),
  ]);
  const billingOrders = billingOrdersResult.status === "fulfilled" ? billingOrdersResult.value : null;
  const subscriptions = subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value : null;
  // Turning notifications off must stay reachable even after the sign-up gate closes.
  const marketingSignupOpen = isGrowthCapabilityEnabled("marketingRetention");
  const marketingPreference = await getOwnMarketingPreference(session.user.id).catch(() => null);

  const [savedResultsResult, shareLinksResult] = await Promise.allSettled([
    getOwnSavedResults(),
    listOwnShareLinks(),
  ]);
  const savedResults = savedResultsResult.status === "fulfilled" ? savedResultsResult.value : null;
  const shareLinks = shareLinksResult.status === "fulfilled" ? shareLinksResult.value : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <div className="flex items-center gap-3"><LocaleSwitcher /><SignOutButton locale={locale} /></div>
      </header>
      <section className="py-10">
        <p className="font-mono text-xs tracking-[0.2em] text-hobun-faint">ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-medium text-hobun">{locale !== "ko" ? "Your account" : "내 계정"}</h1>
        <p className="mt-4 text-sm text-hobun-dim">{session.user.email}</p>
        <a
          className="mt-5 inline-flex min-h-11 items-center border border-ink-700 px-4 text-sm text-hobun hover:border-hobun-faint"
          href="/api/account/export"
        >
          {locale !== "ko" ? "Export account data" : "계정 자료 내보내기"}
        </a>
        <h2 className="mt-8 text-lg font-medium text-hobun">{locale !== "ko" ? "Saved reports" : "저장한 리포트"}</h2>
        {savedResults === null ? (
          <div className="mt-3">
            <p className="text-sm text-hobun-dim" role="status">
              {locale !== "ko" ? "Saved reports are temporarily unavailable." : "\uC800\uC7A5\uD55C \uB9AC\uD3EC\uD2B8\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}
            </p>
            <Link href={routeForLocale(locale, "/account")} className="mt-3 inline-flex min-h-11 items-center text-xs text-hobun underline underline-offset-4">
              {locale !== "ko" ? "Reload account" : "\uACC4\uC815 \uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30"}
            </Link>
          </div>
        ) : savedResults.length > 0 ? (
          <ul className="mt-3 divide-y divide-ink-800 border-y border-ink-800">
            {savedResults.map((result) => (
              <li key={result.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span className="text-sm text-hobun">{result.analysisKey}</span>
                <time className="font-mono text-xs text-hobun-faint" dateTime={result.completedAt}>
                  {new Date(result.completedAt).toLocaleDateString(intlLocale(locale))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-hobun-dim">
            {locale !== "ko" ? "No reports have been added to this account yet." : "이 계정에 아직 저장한 리포트가 없습니다."}
          </p>
        )}
        <h2 className="mt-10 text-lg font-medium text-hobun">{locale !== "ko" ? "Purchases" : "구매 내역"}</h2>
        {billingOrders === null ? (
          <div className="mt-3 border border-ink-800 bg-ink-950/45 p-4">
            <p className="text-sm text-hobun-dim" role="status">
              {locale !== "ko" ? "Purchase history is temporarily unavailable." : "구매 내역을 일시적으로 불러올 수 없습니다."}
            </p>
            <Link href={routeForLocale(locale, "/account")} className="mt-3 inline-flex min-h-11 items-center text-xs text-hobun underline underline-offset-4">
              {locale !== "ko" ? "Reload purchase history" : "구매 내역 다시 불러오기"}
            </Link>
          </div>
        ) : billingOrders.length > 0 ? (
          <ul className="mt-3 divide-y divide-ink-800 border-y border-ink-800">
            {billingOrders.map((order) => {
              const canOpenReport = order.status === "paid" && order.productKey === "saju-2027";
              return (
                <li key={order.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-hobun">{order.productName}</p>
                      <p className="mt-1 font-mono text-xs text-hobun-faint">
                        {new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: order.currency }).format(order.amount)}
                        {" · "}{order.status}
                      </p>
                    </div>
                    {canOpenReport && order.id ? (
                      <Link href={routeForLocale(locale, "/premium/saju-2027/report")} className="text-xs text-hobun underline underline-offset-4">
                        {locale !== "ko" ? "Open report" : "리포트 열기"}
                      </Link>
                    ) : null}
                  </div>
                  {order.canSelfRefund ? <SelfRefundButton orderId={order.id} locale={locale} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-hobun-dim">{locale !== "ko" ? "No purchases yet." : "구매 내역이 없습니다."}</p>
        )}
        <ClaimLocalData locale={locale} />
        <section className="mt-10 border-t border-ink-800 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-hobun">{locale !== "ko" ? "Subscriptions" : "구독"}</h2>
              <p className="mt-2 text-xs text-hobun-faint">
                {locale !== "ko" ? "Manage renewals and cancel from this account." : "이 계정에서 갱신 내역을 확인하고 구독을 해지할 수 있습니다."}
              </p>
            </div>
            <Link href={routeForLocale(locale, "/plus")} className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun hover:border-hobun-faint">
              LUMINA+
            </Link>
          </div>
          {subscriptions === null ? (
            <div className="mt-3 border border-ink-800 bg-ink-950/45 p-4">
              <p className="text-sm text-hobun-dim" role="status">
                {locale !== "ko" ? "Subscription history is temporarily unavailable." : "구독 내역을 일시적으로 불러올 수 없습니다."}
              </p>
              <Link href={routeForLocale(locale, "/account/subscriptions")} className="mt-3 inline-flex min-h-11 items-center text-xs text-hobun underline underline-offset-4">
                {locale !== "ko" ? "Reload subscription history" : "구독 내역 다시 불러오기"}
              </Link>
            </div>
          ) : subscriptions.length > 0 ? (
            <ul className="mt-4 divide-y divide-ink-800 border-y border-ink-800">
              {subscriptions.map((subscription) => (
                <li key={subscription.id} className="py-4">
                  <p className="text-sm text-hobun">{subscription.productName}</p>
                  <p className="mt-1 text-xs text-hobun-faint">
                    {subscription.status}
                    {subscription.periodEnd
                      ? " · " + (locale !== "ko" ? "period ends " : "이용 종료 ") + new Date(subscription.periodEnd).toLocaleDateString(intlLocale(locale))
                      : ""}
                    {subscription.cancelAtPeriodEnd ? " · " + (locale !== "ko" ? "cancellation scheduled" : "해지 예약됨") : ""}
                  </p>
                  {subscription.status === "pending" || subscription.status === "active" || subscription.status === "past_due"
                    ? <CancelSubscriptionButton subscriptionId={subscription.id} locale={locale} />
                    : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-hobun-dim">{locale !== "ko" ? "No subscriptions." : "구독 내역이 없습니다."}</p>
          )}
        </section>
        {marketingPreference && (marketingSignupOpen || marketingPreference.status === "subscribed") ? (
          <section className="mt-10 border-t border-ink-800 pt-8">
            <h2 className="text-lg font-medium text-hobun">{locale !== "ko" ? "Notifications" : "알림"}</h2>
            <MarketingOptIn locale={locale} initialStatus={marketingPreference.status} canSubscribe={marketingSignupOpen} />
          </section>
        ) : null}
        {savedResults !== null && shareLinks !== null ? (
          <ShareSavedResults
            locale={locale}
            savedResults={savedResults.map((result) => ({
              id: result.id,
              analysisKey: result.analysisKey,
              completedAt: result.completedAt,
              locale: result.locale,
            }))}
            initialShareLinks={shareLinks.map((link) => ({
              id: link.id,
              createdAt: link.created_at,
              expiresAt: link.expires_at,
              revokedAt: link.revoked_at,
            }))}
          />
        ) : (
          <section className="mt-10 border-t border-ink-700 pt-8" aria-labelledby="account-share-title">
            <h2 id="account-share-title" className="text-lg font-medium text-hobun">
              {locale !== "ko" ? "Share a saved report" : "\uC800\uC7A5\uD55C \uB9AC\uD3EC\uD2B8 \uACF5\uC720"}
            </h2>
            <p className="mt-3 text-sm text-hobun-dim" role="status">
              {locale !== "ko" ? "Saved report sharing information is temporarily unavailable." : "\uB9AC\uD3EC\uD2B8 \uACF5\uC720 \uC815\uBCF4\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}
            </p>
            <Link href={routeForLocale(locale, "/account")} className="mt-3 inline-flex min-h-11 items-center text-xs text-hobun underline underline-offset-4">
              {locale !== "ko" ? "Reload sharing information" : "\uACF5\uC720 \uC815\uBCF4 \uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30"}
            </Link>
          </section>
        )}
        <DeleteAccountForm locale={locale} email={session.user.email} />
      </section>
    </main>
  );
}
