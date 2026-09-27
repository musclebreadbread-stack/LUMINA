import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { intlLocale, isLocale } from "@/i18n/locale";
import { AdminRefundForm } from "@/components/admin/billing/AdminRefundForm";
import { getAdminAccess } from "@/server/admin/authorization";
import { getBillingKpiSummary, listBillingAdminOrders } from "@/server/billing/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing operations | LUMINA", robots: { index: false, follow: false } };

export default async function AdminBillingPage() {
  const access = await getAdminAccess();
  if (access.status !== "authorized") redirect("/admin/login");
  if (access.role !== "owner") redirect("/admin/analytics");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const [orders, kpis] = await Promise.all([
    listBillingAdminOrders().catch(() => null),
    getBillingKpiSummary().catch(() => null),
  ]);
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <header className="border-b border-ink-700 pb-5">
        <p className="font-mono text-xs tracking-[0.2em] text-hobun-faint">LUMINA · OPERATIONS</p>
        <h1 className="mt-3 text-3xl font-medium text-hobun">{locale !== "ko" ? "Billing" : "결제 관리"}</h1>
      </header>
      {kpis ? (
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={locale !== "ko" ? "Billing metrics" : "결제 지표"}>
          {([
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
        <p className="mt-3 text-[11px] leading-5 text-hobun-faint">
          {locale !== "ko"
            ? "Paying users (30 days): " + kpis.activePayers30d + " · AI cost rate: " +
              (kpis.aiCostSharePercent === null ? "needs finance-approved REPORTING_KRW_PER_USD" : kpis.aiCostSharePercent.toFixed(2) + "%") +
              " · estimated AI requests: " + (kpis.aiEstimatedRequests30d ?? "—")
            : "결제 고객(30일): " + kpis.activePayers30d + "명 · AI 원가율: " +
              (kpis.aiCostSharePercent === null ? "재무 승인 환율 REPORTING_KRW_PER_USD 필요" : kpis.aiCostSharePercent.toFixed(2) + "%") +
              " · 추정 AI 요청: " + (kpis.aiEstimatedRequests30d ?? "—") + "건"}
        </p>
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
                  <td className="py-4">{order.status === "paid" ? <AdminRefundForm orderId={order.id} locale={locale} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
