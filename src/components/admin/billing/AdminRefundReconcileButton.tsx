"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/locale";

interface AdminRefundReconcileButtonProps {
  readonly orderId: string;
  readonly locale: Locale;
}

export function AdminRefundReconcileButton({ orderId, locale }: AdminRefundReconcileButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reconcile(): Promise<void> {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing/refunds/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) {
        setMessage(locale !== "ko"
          ? "Completed cancellation was matched. Refresh the page to see the updated order."
          : "취소 완료 내역을 확인했습니다. 페이지를 새로고침해 주문 상태를 확인하세요.");
      } else {
        setMessage(locale !== "ko"
          ? "The provider state did not confirm a full refund. Check the order in Toss Payments."
          : "전액 취소를 확인하지 못했습니다. 토스페이먼츠에서 주문 상태를 확인하세요.");
      }
    } catch {
      setMessage(locale !== "ko"
        ? "The provider could not be checked. Try again or review the order in Toss Payments."
        : "결제사 상태를 조회하지 못했습니다. 다시 시도하거나 토스페이먼츠에서 확인하세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void reconcile()}
        disabled={pending}
        className="min-h-10 border border-ink-600 px-3 text-xs text-hobun hover:border-hobun disabled:opacity-60"
      >
        {pending
          ? (locale !== "ko" ? "Checking…" : "조회 중…")
          : (locale !== "ko" ? "Reconcile refund" : "취소 상태 대조")}
      </button>
      {message ? <span className="max-w-sm text-xs text-hobun-faint" role="status" aria-live="polite">{message}</span> : null}
    </div>
  );
}
