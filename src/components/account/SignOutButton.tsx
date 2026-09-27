"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountAuthClient } from "@/lib/auth-client";
import { localePath, type Locale } from "@/i18n/locale";

export function SignOutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = locale !== "ko"
    ? { label: "Sign out", busy: "Signing out…", error: "We couldn't sign you out. Please try again." }
    : { label: "로그아웃", busy: "로그아웃 중…", error: "로그아웃하지 못했습니다. 다시 시도해 주세요." };

  async function signOut() {
    setError("");
    setBusy(true);
    try {
      const result = await accountAuthClient.signOut();
      if (result.error) {
        setError(copy.error);
        return;
      }
      router.replace(localePath("/account/sign-in", locale));
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        className="theme-control min-h-11 border border-ink-700 px-4 text-sm text-hobun disabled:opacity-50"
        disabled={busy}
        onClick={() => void signOut()}
        type="button"
      >
        {busy ? copy.busy : copy.label}
      </button>
      {error && <p className="mt-2 text-xs text-red-300" role="alert">{error}</p>}
    </div>
  );
}
