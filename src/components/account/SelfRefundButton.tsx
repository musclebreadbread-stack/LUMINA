"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/locale";

interface SelfRefundButtonProps {
  readonly orderId: string;
  readonly locale: Locale;
}

export function SelfRefundButton({ orderId, locale }: SelfRefundButtonProps) {
  const router = useRouter();
  const [reasonCode, setReasonCode] = useState("changed_mind");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitRefund(): Promise<void> {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/billing/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reasonCode }),
      });
      if (!response.ok) throw new Error("refund_failed");
      setMessage(locale !== "ko" ? "Refund confirmed." : "환불이 확인되었습니다.");
      router.refresh();
    } catch {
      setMessage(locale !== "ko"
        ? "Refund could not be confirmed. Contact support if the payment state is unclear."
        : "환불을 확인하지 못했습니다. 결제 상태가 불분명하면 고객 지원에 문의해 주세요.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor={`self-refund-reason-${orderId}`} className="sr-only">{locale !== "ko" ? "Refund reason" : "환불 사유"}</label>
      <select
        id={`self-refund-reason-${orderId}`}
        value={reasonCode}
        onChange={(event) => setReasonCode(event.currentTarget.value)}
        disabled={pending}
        className="min-h-10 border border-ink-700 bg-ink-950 px-2 text-xs text-hobun"
      >
        <option value="changed_mind">{locale !== "ko" ? "Changed my mind" : "구매 의사 변경"}</option>
        <option value="duplicate_purchase">{locale !== "ko" ? "Duplicate purchase" : "중복 결제"}</option>
        <option value="access_issue">{locale !== "ko" ? "Access issue" : "이용 문제"}</option>
      </select>
      <button
        type="button"
        onClick={() => void submitRefund()}
        disabled={pending}
        className="min-h-10 border border-ink-700 px-3 text-xs text-hobun hover:border-hobun disabled:opacity-60"
      >
        {pending ? (locale !== "ko" ? "Processing…" : "처리 중…") : (locale !== "ko" ? "Request refund" : "환불 요청")}
      </button>
      {message ? <p className="w-full text-xs text-hobun-faint" role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}
