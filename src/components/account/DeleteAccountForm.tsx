"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearProfile } from "@/lib/profile";
import { deleteAllPortraitSnapshots } from "@/lib/integratedPortrait/vault.client";
import type { Locale } from "@/i18n/locale";

export function DeleteAccountForm({ locale, email }: { readonly locale: Locale; readonly email: string }) {
  const router = useRouter();
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const text = locale !== "ko"
    ? {
        title: "Delete account",
        body: "This permanently deletes your account, saved profile, reports, consent records, and share links. Enter the account email to confirm.",
        email: "Account email",
        submit: "Permanently delete account",
        working: "Deleting…",
        mismatch: "The email did not match this account. Nothing was deleted.",
        pendingOrder: "Wait until the pending checkout expires, then try again. This prevents an in-flight payment from being separated from your account.",
        failed: "The account could not be deleted. Please try again.",
        done: "Your account data was deleted.",
        localFailure: "Some data in this browser could not be cleared. Remove this site's local storage and IndexedDB data in browser settings.",
      }
    : {
        title: "계정 삭제",
        body: "계정, 저장 프로필과 리포트, 동의 기록, 공유 링크를 영구 삭제합니다. 확인을 위해 계정 이메일을 입력해 주세요.",
        email: "계정 이메일",
        submit: "계정 영구 삭제",
        working: "삭제 중…",
        mismatch: "이메일이 계정과 일치하지 않습니다. 삭제된 데이터는 없습니다.",
        pendingOrder: "진행 중인 결제 요청이 만료된 뒤 다시 시도해 주세요. 결제와 계정 기록이 분리되는 일을 막습니다.",
        failed: "계정을 삭제하지 못했습니다. 다시 시도해 주세요.",
        done: "계정 데이터가 삭제됐습니다.",
        localFailure: "이 브라우저의 일부 데이터는 지우지 못했습니다. 브라우저 설정에서 이 사이트의 로컬 저장소와 IndexedDB 데이터를 삭제해 주세요.",
      };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationEmail }),
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 400 && typeof payload === "object" && payload !== null && "error" in payload && payload.error === "confirmation_did_not_match") {
        setMessage(text.mismatch);
        return;
      }
      if (response.status === 409 && typeof payload === "object" && payload !== null && "error" in payload && payload.error === "pending_payment_order") {
        setMessage(text.pendingOrder);
        return;
      }
      if (!response.ok) throw new Error("Account deletion failed");

      clearProfile();
      const localResult = await deleteAllPortraitSnapshots();
      setDeleted(true);
      setConfirmationEmail("");
      setMessage(localResult.ok ? text.done : `${text.done} ${text.localFailure}`);
      router.refresh();
    } catch {
      setMessage(text.failed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mt-12 border-t border-ink-700 pt-8" aria-labelledby="account-delete-title">
      <h2 id="account-delete-title" className="text-lg font-medium text-hobun">{text.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{text.body}</p>
      <form onSubmit={(event) => void submit(event)} className="mt-5 max-w-lg space-y-3">
        <label className="block">
          <span className="mb-2 block text-xs text-hobun-faint">{text.email}</span>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={working || deleted}
            value={confirmationEmail}
            onChange={(event) => setConfirmationEmail(event.target.value)}
            className="min-h-11 w-full border border-ink-700 bg-ink-900 px-3 text-sm text-hobun focus:border-hobun focus:outline-none disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={working || deleted || confirmationEmail.trim().toLocaleLowerCase("en-US") !== email.trim().toLocaleLowerCase("en-US")}
          className="inline-flex min-h-11 items-center border border-hwa/50 px-4 text-xs text-hwa transition-colors hover:border-hwa disabled:cursor-not-allowed disabled:opacity-40"
        >
          {working ? text.working : text.submit}
        </button>
        {message ? <p role="status" className="text-sm text-hobun-dim">{message}</p> : null}
      </form>
    </section>
  );
}
