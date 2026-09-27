"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { z } from "zod";
import { localePath, type Locale } from "@/i18n/locale";

const checkoutSchema = z.object({
  subscriptionId: z.string().uuid(),
  customerKey: z.string().min(20).max(50),
  clientKey: z.string().min(1).max(200),
  successUrl: z.string().url(),
  failUrl: z.string().url(),
}).strict();

interface SubscriptionCheckoutButtonProps {
  readonly locale: Locale;
  readonly productKey: "lumina-plus-monthly" | "lumina-plus-yearly";
}

export function SubscriptionCheckoutButton({ locale, productKey }: SubscriptionCheckoutButtonProps) {
  const [terms, setTerms] = useState(false);
  const [renewal, setRenewal] = useState(false);
  const [price, setPrice] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(): Promise<void> {
    if (!terms || !renewal || !price) {
      setError("consent_required");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey,
          locale,
          acceptedSubscriptionTerms: true,
          acceptedAutomaticRenewal: true,
          acceptedRenewalPrice: true,
        }),
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
          ? value.error
          : "subscription_unavailable";
        throw new Error(reason);
      }
      const checkout = checkoutSchema.parse(value);
      const toss = await loadTossPayments(checkout.clientKey);
      const payment = toss.payment({ customerKey: checkout.customerKey });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: checkout.successUrl,
        failUrl: checkout.failUrl,
      });
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "subscription_unavailable";
      setError(["authentication_required", "consent_required", "subscription_exists"].includes(reason)
        ? reason
        : "subscription_unavailable");
      setPending(false);
    }
  }

  const english = locale !== "ko";
  return (
    <div className="mt-5 space-y-4 border border-hobun/30 bg-ink-950/60 p-5">
      <fieldset className="space-y-3 text-xs leading-relaxed text-hobun-dim" disabled={pending}>
        <legend className="sr-only">{english ? "Subscription notices" : "구독 안내 확인"}</legend>
        <label className="flex gap-3">
          <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.currentTarget.checked)} className="mt-0.5 accent-hobun" />
        <span>{english ? "I agree to the subscription terms." : "구독 약관에 동의합니다."} <a href={localePath("/terms", locale)} className="underline underline-offset-4">{english ? "Read terms" : "약관 보기"}</a></span>
        </label>
        <label className="flex gap-3">
          <input type="checkbox" checked={renewal} onChange={(event) => setRenewal(event.currentTarget.checked)} className="mt-0.5 accent-hobun" />
          <span>{english ? "I agree to automatic renewal and understand how to cancel." : "자동 갱신에 동의하며 해지 방법을 확인했습니다."}</span>
        </label>
        <label className="flex gap-3">
          <input type="checkbox" checked={price} onChange={(event) => setPrice(event.currentTarget.checked)} className="mt-0.5 accent-hobun" />
          <span>{english ? "I confirm the renewal price and billing interval shown above." : "위에 표시된 갱신 금액과 결제 주기를 확인했습니다."}</span>
        </label>
      </fieldset>
      <button
        type="button"
        onClick={() => void start()}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center border border-hobun bg-hobun px-5 text-sm font-medium text-ink-950 transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (english ? "Opening card registration…" : "카드 등록창 여는 중…") : (english ? "Continue to card registration" : "카드 등록 계속하기")}
      </button>
      {error ? (
        <p role="status" aria-live="polite" className="text-xs text-red-200">
          {error === "authentication_required"
            ? (english ? "Sign in before subscribing." : "구독하려면 먼저 로그인해 주세요.")
            : error === "consent_required"
              ? (english ? "Review your account notices and subscription consents." : "계정 동의와 구독 안내를 확인해 주세요.")
              : error === "subscription_exists"
                ? (english ? "An active or pending LUMINA+ subscription already exists." : "진행 중이거나 활성화된 LUMINA+ 구독이 있습니다.")
                : (english ? "Subscription checkout is unavailable. Please try again later." : "현재 구독을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.")}
        </p>
      ) : null}
    </div>
  );
}
