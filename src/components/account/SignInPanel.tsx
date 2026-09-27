"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { accountAuthClient } from "@/lib/auth-client";
import { localePath, type Locale } from "@/i18n/locale";

type SocialProvider = "google" | "kakao" | "apple";
type ProviderAvailability = Readonly<Record<SocialProvider, boolean>>;
type FormStage = "email" | "code";

type TurnstileOptions = Readonly<{
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}>;

type TurnstileApi = Readonly<{
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}>;

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const COPY = {
  ko: {
    title: "LUMINA 계정",
    intro: "이메일 일회용 코드 또는 연결된 소셜 계정으로 로그인합니다. 비밀번호는 사용하지 않습니다.",
    email: "이메일",
    sendCode: "인증 코드 받기",
    code: "6자리 인증 코드",
    verify: "로그인",
    resend: "다른 코드 받기",
    terms: "이용약관에 동의합니다 (필수)",
    privacy: "개인정보처리방침에 동의합니다 (필수)",
    transfer: "개인정보의 국외 이전에 동의합니다 (필수)",
    termsLink: "이용약관",
    privacyLink: "개인정보처리방침",
    required: "계속하려면 필수 동의 항목을 확인해 주세요.",
    sent: "입력한 주소로 코드를 보냈습니다. 5분 안에 입력해 주세요.",
    genericError: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    consentError: "로그인은 됐지만 동의 내용을 저장하지 못했습니다. 아래에서 다시 제출해 주세요.",
    social: "소셜 계정으로 계속하기",
    busy: "처리 중…",
    captcha: "보안 확인을 완료해 주세요.",
    captchaUnavailable: "보안 확인을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
  },
  en: {
    title: "LUMINA account",
    intro: "Sign in with a one-time email code or a connected social account. Password sign-in is unavailable.",
    email: "Email",
    sendCode: "Send sign-in code",
    code: "6-digit code",
    verify: "Sign in",
    resend: "Send another code",
    terms: "I agree to the Terms of Service (required)",
    privacy: "I agree to the Privacy Policy (required)",
    transfer: "I agree to the international transfer of personal information (required)",
    termsLink: "Terms of Service",
    privacyLink: "Privacy Policy",
    required: "Review each required consent to continue.",
    sent: "A code was sent to this address. Enter it within 5 minutes.",
    genericError: "We couldn't complete the request. Please try again shortly.",
    consentError: "You are signed in, but we couldn't save the consent record. Submit it again below.",
    social: "Continue with a social account",
    busy: "Working…",
    captcha: "Complete the security check to continue.",
    captchaUnavailable: "The security check could not be loaded. Refresh the page and try again.",
  },
} as const;

function routeForLocale(locale: Locale, path: string): string {
  return localePath(path, locale);
}

export function SignInPanel({
  locale,
  providers,
  captchaSiteKey,
}: {
  locale: Locale;
  providers: ProviderAvailability;
  captchaSiteKey: string;
}) {
  const copy = COPY[locale === "ko" ? "ko" : "en"];
  const router = useRouter();
  const captchaContainer = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<string | null>(null);
  const [stage, setStage] = useState<FormStage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [transferAccepted, setTransferAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [captchaScriptReady, setCaptchaScriptReady] = useState(false);
  const [captchaScriptFailed, setCaptchaScriptFailed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const allRequiredConsentsAccepted = termsAccepted && privacyAccepted && transferAccepted;

  useEffect(() => {
    const container = captchaContainer.current;
    const turnstile = window.turnstile;
    if (!captchaScriptReady || !container || !turnstile) return;

    captchaWidgetId.current = turnstile.render(container, {
      sitekey: captchaSiteKey,
      callback: (token) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
    });

    return () => {
      const widgetId = captchaWidgetId.current;
      if (widgetId) turnstile.remove(widgetId);
      captchaWidgetId.current = null;
    };
  }, [captchaScriptReady, captchaSiteKey]);

  function resetCaptcha(): void {
    setCaptchaToken("");
    if (captchaWidgetId.current) window.turnstile?.reset(captchaWidgetId.current);
  }

  async function saveConsents(): Promise<boolean> {
    const response = await fetch("/api/account/consents", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        terms: termsAccepted,
        privacy: privacyAccepted,
        overseasTransfer: transferAccepted,
      }),
    });
    return response.ok;
  }

  async function issueConsentGrant(): Promise<boolean> {
    const response = await fetch("/api/account/consents/grant", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms: true, privacy: true, overseasTransfer: true }),
    });
    if (!response.ok) setError(copy.genericError);
    return response.ok;
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!allRequiredConsentsAccepted) {
      setError(copy.required);
      return;
    }
    if (!captchaToken) {
      setError(captchaScriptFailed ? copy.captchaUnavailable : copy.captcha);
      return;
    }

    const verifiedCaptchaToken = captchaToken;
    setBusy(true);
    try {
      if (!(await issueConsentGrant())) return;
      const result = await accountAuthClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
        fetchOptions: { headers: { "x-captcha-response": verifiedCaptchaToken } },
      });
      if (result.error) {
        setError(copy.genericError);
      } else {
        setStage("code");
        setNotice(copy.sent);
      }
    } catch {
      setError(copy.genericError);
    } finally {
      resetCaptcha();
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!allRequiredConsentsAccepted) {
      setError(copy.required);
      return;
    }
    if (!captchaToken) {
      setError(captchaScriptFailed ? copy.captchaUnavailable : copy.captcha);
      return;
    }

    const verifiedCaptchaToken = captchaToken;
    setBusy(true);
    try {
      if (!(await issueConsentGrant())) return;
      const result = await accountAuthClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
        fetchOptions: { headers: { "x-captcha-response": verifiedCaptchaToken } },
      });
      if (result.error) {
        setError(copy.genericError);
        return;
      }
      const saved = await saveConsents();
      if (!saved) {
        setError(copy.consentError);
        router.replace(routeForLocale(locale, "/account/consent"));
        return;
      }
      router.replace(routeForLocale(locale, "/account"));
      router.refresh();
    } catch {
      setError(copy.genericError);
    } finally {
      resetCaptcha();
      setBusy(false);
    }
  }

  async function signInSocial(provider: SocialProvider) {
    setError("");
    setNotice("");
    if (!allRequiredConsentsAccepted) {
      setError(copy.required);
      return;
    }
    if (!captchaToken) {
      setError(captchaScriptFailed ? copy.captchaUnavailable : copy.captcha);
      return;
    }

    const verifiedCaptchaToken = captchaToken;
    setBusy(true);
    try {
      if (!(await issueConsentGrant())) return;
      const callbackURL = new URL(routeForLocale(locale, "/account/consent"), window.location.origin).toString();
      const result = await accountAuthClient.signIn.social({
        provider,
        callbackURL,
        fetchOptions: { headers: { "x-captcha-response": verifiedCaptchaToken } },
      });
      if (result.error) {
        setError(copy.genericError);
      } else if (result.data?.url) {
        window.location.assign(result.data.url);
      }
    } catch {
      setError(copy.genericError);
    } finally {
      resetCaptcha();
      setBusy(false);
    }
  }

  async function requestNewCode() {
    setError("");
    setNotice("");
    if (!allRequiredConsentsAccepted) {
      setError(copy.required);
      return;
    }
    if (!captchaToken) {
      setError(captchaScriptFailed ? copy.captchaUnavailable : copy.captcha);
      return;
    }
    const verifiedCaptchaToken = captchaToken;
    setBusy(true);
    try {
      if (!(await issueConsentGrant())) return;
      const result = await accountAuthClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
        fetchOptions: { headers: { "x-captcha-response": verifiedCaptchaToken } },
      });
      if (result.error) setError(copy.genericError);
      else setNotice(copy.sent);
    } catch {
      setError(copy.genericError);
    } finally {
      resetCaptcha();
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-700 bg-ink-900/40 p-5 sm:p-7">
      <h1 className="text-2xl font-medium text-hobun">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{copy.intro}</p>

      <div className="mt-6 space-y-3">
        <ConsentCheckbox checked={termsAccepted} onChange={setTermsAccepted} label={copy.terms} />
        <ConsentCheckbox checked={privacyAccepted} onChange={setPrivacyAccepted} label={copy.privacy} />
        <ConsentCheckbox checked={transferAccepted} onChange={setTransferAccepted} label={copy.transfer} />
        <div className="flex flex-wrap gap-x-4 gap-y-2 pl-7 text-xs text-hobun-faint">
          <a className="underline underline-offset-4" href={routeForLocale(locale, "/terms")}>{copy.termsLink}</a>
          <a className="underline underline-offset-4" href={routeForLocale(locale, "/privacy")}>{copy.privacyLink}</a>
        </div>
      </div>

      <div className="mt-6">
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onError={() => setCaptchaScriptFailed(true)}
          onLoad={() => setCaptchaScriptReady(true)}
        />
        <div
          ref={captchaContainer}
          className="min-h-[65px]"
          role="group"
          aria-label={locale !== "ko" ? "Security check" : "보안 확인"}
        />
        {captchaScriptFailed && <p className="mt-2 text-xs text-red-300" role="alert">{copy.captchaUnavailable}</p>}
      </div>

      <form className="mt-7 space-y-3" onSubmit={stage === "email" ? requestCode : verifyCode}>
        <label className="block text-sm text-hobun" htmlFor="account-email">{copy.email}</label>
        <input
          id="account-email"
          autoComplete="email"
          className="theme-control min-h-12 w-full px-3 text-sm"
          disabled={busy || stage === "code"}
          inputMode="email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
        {stage === "code" && (
          <>
            <label className="block pt-2 text-sm text-hobun" htmlFor="account-otp">{copy.code}</label>
            <input
              id="account-otp"
              autoComplete="one-time-code"
              className="theme-control min-h-12 w-full px-3 font-mono text-base tracking-[0.3em]"
              disabled={busy}
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              onChange={(event) => setOtp(event.currentTarget.value.replace(/\D/gu, "").slice(0, 6))}
              pattern="[0-9]{6}"
              required
              type="text"
              value={otp}
            />
          </>
        )}
        <button
          className="theme-control min-h-12 w-full border border-hobun bg-hobun px-4 text-sm font-medium text-ink-900 disabled:cursor-wait disabled:opacity-60"
          disabled={busy || !captchaToken || !email.trim() || (stage === "code" && otp.length !== 6)}
          type="submit"
        >
          {busy ? copy.busy : stage === "email" ? copy.sendCode : copy.verify}
        </button>
      </form>

      {stage === "code" && (
        <button
          className="mt-3 min-h-11 w-full text-sm text-hobun-faint underline underline-offset-4 disabled:opacity-50"
          disabled={busy}
          onClick={() => void requestNewCode()}
          type="button"
        >
          {copy.resend}
        </button>
      )}

      {(providers.google || providers.kakao || providers.apple) && (
        <div className="mt-8 border-t border-ink-700 pt-6">
          <p className="mb-3 text-xs text-hobun-faint">{copy.social}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {providers.google && <SocialButton label="Google" onClick={() => void signInSocial("google")} disabled={busy || !captchaToken} />}
            {providers.kakao && <SocialButton label="Kakao" onClick={() => void signInSocial("kakao")} disabled={busy || !captchaToken} />}
            {providers.apple && <SocialButton label="Apple" onClick={() => void signInSocial("apple")} disabled={busy || !captchaToken} />}
          </div>
        </div>
      )}

      <div className="mt-5 min-h-6 text-sm" aria-live="polite">
        {error && <p className="text-red-300" role="alert">{error}</p>}
        {!error && notice && <p className="text-hobun-dim">{notice}</p>}
      </div>
    </section>
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

function SocialButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      className="theme-control min-h-11 border border-ink-700 px-3 text-sm text-hobun hover:border-hobun-faint disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
