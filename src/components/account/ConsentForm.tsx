"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { localePath, type Locale } from "@/i18n/locale";

const COPY = {
  ko: {
    title: "필수 동의 확인",
    intro: "계정 기능을 사용하려면 최신 약관과 개인정보처리방침, 국외 이전 안내에 동의해야 합니다.",
    terms: "이용약관에 동의합니다 (필수)",
    privacy: "개인정보처리방침에 동의합니다 (필수)",
    transfer: "개인정보의 국외 이전에 동의합니다 (필수)",
    save: "동의 저장하고 계속하기",
    error: "동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    required: "계속하려면 필수 동의 항목을 모두 선택해 주세요.",
    termsLink: "이용약관",
    privacyLink: "개인정보처리방침",
    busy: "저장 중…",
  },
  en: {
    title: "Review required consents",
    intro: "To use member features, agree to the current Terms, Privacy Policy, and international transfer notice.",
    terms: "I agree to the Terms of Service (required)",
    privacy: "I agree to the Privacy Policy (required)",
    transfer: "I agree to the international transfer of personal information (required)",
    save: "Save consents and continue",
    error: "We couldn't save your consents. Please try again shortly.",
    required: "Select every required consent to continue.",
    termsLink: "Terms of Service",
    privacyLink: "Privacy Policy",
    busy: "Saving…",
  },
} as const;

function routeForLocale(locale: Locale, path: string): string {
  return localePath(path, locale);
}

export function ConsentForm({ locale }: { locale: Locale }) {
  const copy = COPY[locale === "ko" ? "ko" : "en"];
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!terms || !privacy || !transfer) {
      setError(copy.required);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/account/consents", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms, privacy, overseasTransfer: transfer }),
      });
      if (!response.ok) {
        setError(copy.error);
        return;
      }
      router.replace(routeForLocale(locale, "/account"));
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="border border-ink-700 bg-ink-900/40 p-5 sm:p-7" onSubmit={submit}>
      <h1 className="text-2xl font-medium text-hobun">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{copy.intro}</p>
      <div className="mt-6 space-y-3">
        <ConsentCheckbox checked={terms} onChange={setTerms} label={copy.terms} />
        <ConsentCheckbox checked={privacy} onChange={setPrivacy} label={copy.privacy} />
        <ConsentCheckbox checked={transfer} onChange={setTransfer} label={copy.transfer} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 pl-7 text-xs text-hobun-faint">
        <a className="underline underline-offset-4" href={routeForLocale(locale, "/terms")}>{copy.termsLink}</a>
        <a className="underline underline-offset-4" href={routeForLocale(locale, "/privacy")}>{copy.privacyLink}</a>
      </div>
      <button
        className="theme-control mt-7 min-h-12 w-full border border-hobun bg-hobun px-4 text-sm font-medium text-ink-900 disabled:cursor-wait disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? copy.busy : copy.save}
      </button>
      <div className="mt-4 min-h-6 text-sm" aria-live="polite">
        {error && <p className="text-red-300" role="alert">{error}</p>}
      </div>
    </form>
  );
}

function ConsentCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-hobun-dim">
      <input
        checked={checked}
        className="mt-1 size-4 accent-hobun"
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
