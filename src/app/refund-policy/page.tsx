import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { BusinessInfoFooter } from "@/components/commerce/BusinessInfoFooter";
import { isLocale, localePath } from "@/i18n/locale";

export const metadata: Metadata = {
  title: "Refund policy | LUMINA",
  robots: { index: true, follow: true },
};

export default async function RefundPolicyPage() {
  const value = await getLocale();
  const locale = isLocale(value) ? value : "ko";
  const english = locale !== "ko";
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink-700 py-5">
        <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <Link href={localePath("/premium/saju-2027", locale)} className="text-xs text-hobun-faint underline underline-offset-4">
          {english ? "2027 report" : "2027 리포트"}
        </Link>
      </header>
      <article className="prose prose-invert max-w-none py-10 text-hobun-dim">
        <h1 className="text-3xl font-medium text-hobun">{english ? "Refund and withdrawal policy" : "환불 및 청약철회 안내"}</h1>
        {english ? (
          <>
            <p>This page describes the proposed digital content refund process. Purchases stay disabled until the seller information, final terms, and payment provider setup have been reviewed and approved.</p>
            <h2>Before delivery</h2>
            <p>Contact the seller using the details below to request cancellation before the report is opened. Requests are reviewed under applicable consumer law.</p>
            <h2>After delivery</h2>
            <p>Digital content may be excluded from withdrawal only where the law allows it and the required notice and separate consent were obtained before delivery. Statutory rights are not limited by this draft notice.</p>
            <h2>Payment issues</h2>
            <p>If payment was captured but access was not granted, contact the seller with the order number. Do not send card numbers or security codes.</p>
          </>
        ) : (
          <>
            <p>이 문서는 디지털 콘텐츠 환불 절차의 초안입니다. 판매자 정보, 최종 약관, 결제 제공자 설정을 검토·승인하기 전에는 구매가 비활성 상태로 유지됩니다.</p>
            <h2>콘텐츠 열람 전</h2>
            <p>리포트를 열기 전에 취소를 요청하려면 아래 판매자 연락처로 문의해 주세요. 관련 소비자 법령에 따라 요청을 확인합니다.</p>
            <h2>콘텐츠 제공 후</h2>
            <p>법령이 허용하고 제공 전에 필요한 고지와 별도 동의를 받은 경우에만 디지털 콘텐츠의 청약철회가 제한될 수 있습니다. 이 초안은 법정 권리를 제한하지 않습니다.</p>
            <h2>결제 문제</h2>
            <p>결제되었지만 이용 권한이 부여되지 않았다면 주문번호와 함께 문의해 주세요. 카드번호나 보안 코드는 보내지 마세요.</p>
          </>
        )}
      </article>
      <BusinessInfoFooter />
    </main>
  );
}
