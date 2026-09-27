"use client";

import { useState } from "react";
import Link from "next/link";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { z } from "zod";
import { localePath, type Locale } from "@/i18n/locale";

const orderResponseSchema = z.object({
  orderId: z.string().uuid(),
  orderName: z.string().min(1).max(100),
  amount: z.number().int().positive(),
  currency: z.literal("KRW"),
  customerKey: z.string().min(20).max(128),
  clientKey: z.string().min(1).max(200),
  successUrl: z.string().url(),
  failUrl: z.string().url(),
}).strict();

interface CheckoutButtonProps {
  readonly locale: Locale;
}

type CheckoutError = "authentication_required" | "consent_required" | "payment_state_invalid" | "billing_unavailable" | "profile_required";

export function CheckoutButton({ locale }: CheckoutButtonProps) {
  const [terms, setTerms] = useState(false);
  const [withdrawalNotice, setWithdrawalNotice] = useState(false);
  const [euWaiver, setEuWaiver] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);

  async function startCheckout(): Promise<void> {
    if (!terms || !withdrawalNotice) {
      setError("payment_state_invalid");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey: "saju-2027",
          locale,
          acceptedPurchaseTerms: true,
          acceptedWithdrawalNotice: true,
          acceptedEuWithdrawalWaiver: euWaiver,
        }),
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
          ? value.error
          : "billing_unavailable";
        throw new Error(reason);
      }
      const order = orderResponseSchema.parse(value);
      const toss = await loadTossPayments(order.clientKey);
      const payment = toss.payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: order.currency, value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: order.successUrl,
        failUrl: order.failUrl,
      });
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "billing_unavailable";
      setError(reason === "authentication_required" || reason === "consent_required" || reason === "payment_state_invalid" || reason === "profile_required"
        ? reason
        : "billing_unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 max-w-xl border border-hobun/30 bg-ink-950/60 p-5">
      <fieldset className="space-y-3 text-xs leading-relaxed text-hobun-dim" disabled={pending}>
        <legend className="sr-only">{locale !== "ko" ? "Purchase notices" : "구매 안내 확인"}</legend>
        <label className="flex gap-3">
          <input checked={terms} onChange={(event) => setTerms(event.currentTarget.checked)} type="checkbox" className="mt-0.5 accent-hobun" />
          <span>{locale !== "ko" ? "I agree to the purchase terms." : "구매 약관에 동의합니다."}</span>
        </label>
        <label className="flex gap-3">
          <input checked={withdrawalNotice} onChange={(event) => setWithdrawalNotice(event.currentTarget.checked)} type="checkbox" className="mt-0.5 accent-hobun" />
          <span>{locale !== "ko" ? "I understand the digital content and withdrawal notice." : "디지털 콘텐츠 및 청약철회 안내를 확인했습니다."}</span>
        </label>
        <label className="flex gap-3">
          <input checked={euWaiver} onChange={(event) => setEuWaiver(event.currentTarget.checked)} type="checkbox" className="mt-0.5 accent-hobun" />
          <span>{locale !== "ko" ? "EU consumers: I request immediate digital delivery and acknowledge the applicable withdrawal right may end when delivery begins." : "EU 소비자 해당 시: 즉시 디지털 콘텐츠 제공을 요청하며 제공 개시 후 적용되는 철회권 제한을 확인합니다."}</span>
        </label>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center border border-hobun bg-hobun px-5 text-sm font-medium text-ink-950 transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (locale !== "ko" ? "Opening checkout…" : "결제창 여는 중…") : (locale !== "ko" ? "Continue to checkout" : "결제 계속하기")}
        </button>
        <Link href={localePath("/refund-policy", locale)} className="text-xs text-hobun-faint underline underline-offset-4">
          {locale !== "ko" ? "Refund policy" : "환불 안내"}
        </Link>
        {error === "authentication_required" ? (
        <Link href={localePath("/account/sign-in", locale)} className="text-xs text-hobun underline underline-offset-4">
            {locale !== "ko" ? "Sign in" : "로그인"}
          </Link>
        ) : null}
        {error === "profile_required" ? (
        <Link href={localePath("/account", locale)} className="text-xs text-hobun underline underline-offset-4">
            {locale !== "ko" ? "Save your birth profile" : "출생 프로필 저장하기"}
          </Link>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-xs text-red-200" role="status" aria-live="polite">
          {error === "authentication_required"
            ? (locale !== "ko" ? "Sign in before purchasing." : "구매하려면 먼저 로그인해 주세요.")
            : error === "consent_required"
              ? (locale !== "ko" ? "Review the current account notices before purchasing." : "구매 전에 계정 동의 내용을 확인해 주세요.")
              : error === "payment_state_invalid"
                ? (locale !== "ko" ? "Review the purchase notice and try again." : "구매 안내를 확인한 뒤 다시 시도해 주세요.")
                : error === "profile_required"
                  ? (locale !== "ko" ? "Save your own birth profile before purchasing." : "구매 전에 내 출생 프로필을 계정에 저장해 주세요.")
                : (locale !== "ko" ? "Checkout is unavailable. Please try again later." : "현재 결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.")}
        </p>
      ) : null}
    </div>
  );
}
