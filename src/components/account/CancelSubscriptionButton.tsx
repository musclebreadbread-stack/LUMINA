"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/locale";

interface CancelSubscriptionButtonProps {
  readonly subscriptionId: string;
  readonly locale: Locale;
}

export function CancelSubscriptionButton({ subscriptionId, locale }: CancelSubscriptionButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const english = locale !== "ko";

  async function cancel(): Promise<void> {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error("cancellation_unavailable");
      const status = typeof result === "object" && result !== null && "status" in result ? result.status : null;
      setMessage(status === "processing"
        ? (english ? "A current payment is finishing. Renewals have been stopped." : "진행 중인 결제 처리가 끝나는 대로 다음 갱신을 중단합니다.")
        : status === "scheduled"
          ? (english ? "Cancellation is scheduled for the end of this billing period." : "현재 결제 기간이 끝날 때 구독이 해지됩니다.")
          : (english ? "Subscription cancelled." : "구독이 해지되었습니다."));
      window.setTimeout(() => router.refresh(), 1_500);
    } catch {
      setMessage(english ? "We could not cancel the subscription. Please try again." : "구독을 해지하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => void cancel()}
        className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim hover:border-hobun-faint disabled:opacity-50"
      >
        {pending ? (english ? "Cancelling…" : "해지 처리 중…") : (english ? "Cancel subscription" : "구독 해지")}
      </button>
      {message ? <p className="mt-2 text-xs text-hobun-dim" role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}
