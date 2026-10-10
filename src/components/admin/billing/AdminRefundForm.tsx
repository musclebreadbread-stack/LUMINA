"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/locale";

interface AdminRefundFormProps {
  readonly orderId: string;
  readonly locale: Locale;
  /**
   * True for an order already stuck in 'refunding' (its Toss cancel call
   * previously timed out). reserveAdminRefund's "already refunding" branch
   * reuses the existing reservation's stored reason and reattempts the same
   * cancel call — the reason picked here is ignored server-side, so this mode
   * hides the dropdown and labels the action as a retry rather than a new
   * refund, to avoid implying a fresh reason gets recorded.
   */
  readonly isRetry?: boolean;
}

const RETRY_REASON_CODE = "retry";

export function AdminRefundForm({ orderId, locale, isRetry = false }: AdminRefundFormProps) {
  const [reasonCode, setReasonCode] = useState("manual_review");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refund(): Promise<void> {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reasonCode: isRetry ? RETRY_REASON_CODE : reasonCode }),
      });
      if (!response.ok) throw new Error("refund_failed");
      setMessage(isRetry
        ? (locale !== "ko" ? "Refund retry confirmed." : "환불 재시도를 처리했습니다.")
        : (locale !== "ko" ? "Refund confirmed." : "환불을 처리했습니다."));
    } catch {
      setMessage(locale !== "ko" ? "Refund could not be confirmed. Check the order state." : "환불을 확인하지 못했습니다. 주문 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isRetry ? null : (
        <>
          <label className="sr-only" htmlFor={`refund-reason-${orderId}`}>{locale !== "ko" ? "Refund reason" : "환불 사유"}</label>
          <select
            id={`refund-reason-${orderId}`}
            value={reasonCode}
            onChange={(event) => setReasonCode(event.currentTarget.value)}
            disabled={pending}
            className="min-h-10 border border-ink-700 bg-ink-950 px-2 text-xs text-hobun"
          >
            <option value="manual_review">{locale !== "ko" ? "Manual review" : "수동 검토"}</option>
            <option value="customer_support">{locale !== "ko" ? "Customer support" : "고객 지원"}</option>
            <option value="duplicate_purchase">{locale !== "ko" ? "Duplicate purchase" : "중복 결제"}</option>
          </select>
        </>
      )}
      <button
        type="button"
        onClick={() => void refund()}
        disabled={pending}
        className="min-h-10 border border-ink-600 px-3 text-xs text-hobun hover:border-hobun disabled:opacity-60"
      >
        {pending
          ? (locale !== "ko" ? "Processing…" : "처리 중…")
          : isRetry
            ? (locale !== "ko" ? "Retry refund" : "환불 재시도")
            : (locale !== "ko" ? "Refund" : "환불")}
      </button>
      {message ? <span className="text-xs text-hobun-faint" role="status" aria-live="polite">{message}</span> : null}
    </div>
  );
}
