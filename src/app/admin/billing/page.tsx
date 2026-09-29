import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { intlLocale, isLocale } from "@/i18n/locale";
import { AdminRefundForm } from "@/components/admin/billing/AdminRefundForm";
import { getAdminAccess } from "@/server/admin/authorization";
import { getBillingChannelSummary, getBillingKpiSummary, listBillingAdminOrders } from "@/server/billing/service";
import { getMarketingSubscriberCounts } from "@/server/growth/marketingPreference";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing operations | LUMINA", robots: { index: false, follow: false } };

export default async function AdminBillingPage() {
  const access = await getAdminAccess();
  if (access.status !== "authorized") redirect("/admin/login");
  if (access.role !== "owner") redirect("/admin/analytics");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const [orders, kpis, channels, notifySignups] = await Promise.all([
    listBillingAdminOrders().catch(() => null),
    getBillingKpiSummary().catch(() => null),
    getBillingChannelSummary().catch(() => null),
    getMarketingSubscriberCounts().catch(() => null),
  ]);
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <header className="border-b border-ink-700 pb-5">
        <p className="font-mono text-xs tracking-[0.2em] text-hobun-faint">LUMINA · OPERATIONS</p>
        <h1 className="mt-3 text-3xl font-medium text-hobun">{locale !== "ko" ? "Billing" : "결제 관리"}</h1>
      </header>
      {kpis ? (
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={locale !== "ko" ? "Billing metrics" : "결제 지표"}>
          {([
            [locale !== "ko" ? "Net revenue · 30 days" : "순매출 · 최근 30일", new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(kpis.netRevenue30dKrw)],
            [locale !== "ko" ? "MRR · KRW" : "월 반복 매출 · KRW", new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(kpis.mrrKrw)],
            [locale !== "ko" ? "ARPPU · 30 days" : "결제 고객당 매출 · 30일", kpis.arppuKrw === null ? "—" : new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(kpis.arppuKrw)],
            [locale !== "ko" ? "Refund rate · 30 days" : "환불률 · 30일", kpis.refundRatePercent === null ? "—" : kpis.refundRatePercent.toFixed(1) + "%"],
            [locale !== "ko" ? "AI cost · 30 days" : "AI 원가 · 30일", kpis.aiCostUsd30d === null ? "—" : new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "USD", maximumFractionDigits: 3 }).format(kpis.aiCostUsd30d)],
          ] as const).map(([label, value]) => (
            <article key={label} className="border border-ink-800 bg-ink-950/45 p-4">
              <h2 className="text-[10px] text-hobun-faint">{label}</h2>
              <p className="mt-2 font-mono text-lg text-hobun">{value}</p>
            </article>
          ))}
        </section>
      ) : null}
      {kpis ? (
        <div className="mt-3 space-y-1 text-[11px] leading-5 text-hobun-faint">
          <p>
            {locale !== "ko"
              ? "Net revenue is KRW orders paid in the last 30 days minus succeeded refunds. Paying users: " + kpis.activePayers30d + " · AI cost rate: " +
                (kpis.aiCostSharePercent === null ? "needs finance-approved REPORTING_KRW_PER_USD" : kpis.aiCostSharePercent.toFixed(2) + "%") +
                " · estimated AI requests: " + (kpis.aiEstimatedRequests30d ?? "—")
              : "순매출은 최근 30일 내 결제된 KRW 주문에서 성공 처리된 환불을 뺀 값입니다. 결제 고객: " + kpis.activePayers30d + "명 · AI 원가율: " +
                (kpis.aiCostSharePercent === null ? "재무 승인 환율 REPORTING_KRW_PER_USD 필요" : kpis.aiCostSharePercent.toFixed(2) + "%") +
                " · 추정 AI 요청: " + (kpis.aiEstimatedRequests30d ?? "—") + "건"}
          </p>
        </div>
      ) : null}
      {notifySignups !== null ? (
        <p className="mt-3 text-[11px] leading-5 text-hobun-faint">
          {locale !== "ko"
            ? "Launch-notification sign-ups (marketing consent): " + notifySignups.subscribed + " subscribed · " + notifySignups.unsubscribed + " opted out"
            : "출시 알림 신청(광고성 정보 수신 동의): 수신 " + notifySignups.subscribed + "명 · 해지 " + notifySignups.unsubscribed + "명"}
        </p>
      ) : null}
      {channels !== null ? (
        <section className="mt-8" aria-label={locale !== "ko" ? "Revenue by channel" : "채널별 매출"}>
          <h2 className="text-sm font-medium text-hobun">{locale !== "ko" ? "Revenue by channel · 30 days" : "채널별 매출 · 최근 30일"}</h2>
          <p className="mt-1 text-[11px] leading-5 text-hobun-faint">
            {locale !== "ko"
              ? "First-touch channel of paid KRW orders, gross of refunds. \"(none)\" = no UTM tag (organic or direct); \"(unattributed)\" = no attribution recorded (analytics not accepted, or an order from before this report)."
              : "결제된 KRW 주문의 첫 유입 채널(환불 차감 전 총액)입니다. \"(none)\" = UTM 태그 없음(오가닉·직접 유입), \"(unattributed)\" = 유입 정보 없음(분석 동의 미수락 또는 이 집계 이전 주문)."}
          </p>
          {channels.length === 0 ? (
            <p className="mt-3 text-xs text-hobun-dim">{locale !== "ko" ? "No paid orders in the last 30 days." : "최근 30일 결제 주문이 없습니다."}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">{locale !== "ko" ? "Paid orders by first-touch channel" : "첫 유입 채널별 결제 주문"}</caption>
                <thead>
                  <tr className="border-y border-ink-700 text-hobun-faint">
                    <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Source" : "유입원"}</th>
                    <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Landing page" : "랜딩 페이지"}</th>
                    <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Paid orders" : "결제 건수"}</th>
                    <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Gross" : "총 결제액"}</th>
                    <th scope="col" className="py-3">{locale !== "ko" ? "Refunded" : "환불 건수"}</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row) => (
                    <tr key={`${row.source}|${row.landingPath}`} className="border-b border-ink-800 text-hobun-dim">
                      <td className="py-3 pr-4 font-mono">{row.source}</td>
                      <td className="py-3 pr-4 font-mono">{row.landingPath}</td>
                      <td className="py-3 pr-4">{row.paidOrders}</td>
                      <td className="py-3 pr-4">{new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(row.grossKrw)}</td>
                      <td className="py-3">{row.refundedOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
      {orders === null ? (
        <p className="mt-8 text-sm text-hobun-dim">{locale !== "ko" ? "Billing data is unavailable." : "결제 데이터를 불러올 수 없습니다."}</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-hobun-dim">{locale !== "ko" ? "No orders yet." : "주문이 없습니다."}</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">{locale !== "ko" ? "Recent billing orders" : "최근 결제 주문"}</caption>
            <thead>
              <tr className="border-y border-ink-700 text-hobun-faint">
                <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Order" : "주문"}</th>
                <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Product" : "상품"}</th>
                <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Amount" : "금액"}</th>
                <th scope="col" className="py-3 pr-4">{locale !== "ko" ? "Status" : "상태"}</th>
                <th scope="col" className="py-3">{locale !== "ko" ? "Action" : "작업"}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-ink-800 align-top text-hobun-dim">
                  <td className="py-4 pr-4 font-mono">{order.id}<span className="mt-1 block text-hobun-faint">{order.createdAt}</span></td>
                  <td className="py-4 pr-4">{order.productName}</td>
                  <td className="py-4 pr-4">{new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: order.currency }).format(order.amount)}</td>
                  <td className="py-4 pr-4">{order.status}{order.viewedAt ? <span className="mt-1 block text-hobun-faint">{locale !== "ko" ? "Viewed" : "열람"}</span> : null}</td>
                  <td className="py-4">
                    {order.status === "paid" ? (
                      <AdminRefundForm orderId={order.id} locale={locale} />
                    ) : order.status === "refunding" ? (
                      <AdminRefundForm orderId={order.id} locale={locale} isRetry />
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
