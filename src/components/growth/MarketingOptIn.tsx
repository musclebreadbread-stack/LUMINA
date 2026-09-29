"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { localePath, type Locale } from "@/i18n/locale";

/*
 * 광고성 정보(출시·판매 시작 알림) 수신 동의 UI — Track D8.
 *
 * 이 컴포넌트는 서버가 marketingRetention 게이트(FEATURE_MARKETING_RETENTION +
 * MARKETING_RETENTION_POLICY_APPROVED + MARKETING_RETENTION_POLICY_VERSION)를
 * 통과했을 때만 렌더한다. 아래 동의 문구는 법무 검토 전 초안이므로, 승인 변수를
 * 켜기 전에 반드시 법무가 확정한 문구로 교체해야 한다(.env.example 참고).
 * 문구에는 코드가 실제로 지키는 것(계정 이메일로만, 이 화면에서 언제든 해지)만
 * 적는다 — 보관 기간·발송 횟수처럼 코드가 강제하지 않는 약속은 넣지 않는다.
 */

const preferenceSchema = z.object({
  status: z.enum(["not_opted_in", "subscribed", "unsubscribed"]),
}).passthrough();

export type MarketingOptInStatus = z.infer<typeof preferenceSchema>["status"];

interface MarketingOptInProps {
  readonly locale: Locale;
  /** 로그인 후 돌아올 경로 — sanitizeReturnTo 허용 목록(/premium/*, /r/*) 안이어야 한다. 이미 로그인한 화면에서는 생략한다. */
  readonly returnTo?: string;
  /** 서버가 이미 알고 있으면(계정 화면) 전달해 첫 조회를 건너뛴다. */
  readonly initialStatus?: MarketingOptInStatus;
  /** 게이트가 닫힌 뒤에도 이미 신청한 회원이 해지할 수는 있어야 한다 — 그때는 false로 신청만 숨긴다. */
  readonly canSubscribe: boolean;
}

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "signed_out" }>
  | Readonly<{ kind: "ready"; subscribed: boolean }>
  | Readonly<{ kind: "unavailable" }>;

async function readStatus(response: Response): Promise<MarketingOptInStatus | null> {
  const value: unknown = await response.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(value);
  return parsed.success ? parsed.data.status : null;
}

export function MarketingOptIn({ locale, returnTo, initialStatus, canSubscribe }: MarketingOptInProps) {
  const english = locale !== "ko";
  const [view, setView] = useState<ViewState>(
    initialStatus === undefined ? { kind: "loading" } : { kind: "ready", subscribed: initialStatus === "subscribed" },
  );
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialStatus !== undefined) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/account/marketing-preference", { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) {
          setView({ kind: "signed_out" });
          return;
        }
        const status = response.ok ? await readStatus(response) : null;
        setView(status === null ? { kind: "unavailable" } : { kind: "ready", subscribed: status === "subscribed" });
      } catch {
        if (!controller.signal.aborted) setView({ kind: "unavailable" });
      }
    })();
    return () => controller.abort();
  }, [initialStatus]);

  async function update(subscribed: boolean): Promise<void> {
    setError(false);
    setPending(true);
    try {
      const response = await fetch("/api/account/marketing-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed }),
      });
      const status = response.ok ? await readStatus(response) : null;
      if (status === null) {
        setError(true);
        return;
      }
      setView({ kind: "ready", subscribed: status === "subscribed" });
      setAgreed(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const signInBase = localePath("/account/sign-in", locale);
  const signInHref = returnTo ? `${signInBase}?returnTo=${encodeURIComponent(returnTo)}` : signInBase;

  // 게이트가 닫혔고 이미 신청한 상태도 아니면 보여줄 것이 없다(신청은 못 받고 해지할 것도 없음).
  if (!canSubscribe && !(view.kind === "ready" && view.subscribed)) return null;

  return (
    <section aria-labelledby="marketing-opt-in-title" className="mt-4 border border-ink-700 bg-ink-950/45 p-4 text-xs leading-relaxed text-hobun-dim">
      <h3 id="marketing-opt-in-title" className="text-sm font-medium text-hobun">
        {english ? "Get notified when sales open" : "판매 시작 알림 받기"}
      </h3>
      <p className="mt-2">
        {english
          ? "We can email your account address when this report goes on sale. This is marketing information, and you can turn it off at any time from this screen."
          : "이 리포트 판매가 시작되면 계정 이메일로 알려드릴 수 있습니다. 광고성 정보에 해당하며, 이 화면에서 언제든 해지할 수 있습니다."}
      </p>

      {view.kind === "loading" ? (
        <p className="mt-3 text-hobun-faint" role="status">{english ? "Checking your sign-up…" : "신청 상태 확인 중…"}</p>
      ) : null}

      {view.kind === "signed_out" ? (
        <p className="mt-3">
          <Link href={signInHref} className="text-hobun underline underline-offset-4">
            {english ? "Sign in to sign up for the notification" : "알림을 신청하려면 로그인해 주세요"}
          </Link>
        </p>
      ) : null}

      {view.kind === "unavailable" ? (
        <p className="mt-3 text-red-200" role="status">
          {english ? "The notification sign-up is unavailable right now. Please try again later." : "지금은 알림 신청을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."}
        </p>
      ) : null}

      {view.kind === "ready" && view.subscribed ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-hobun" role="status">{english ? "You're signed up for the notification." : "알림을 신청하셨습니다."}</p>
          <button
            type="button"
            onClick={() => void update(false)}
            disabled={pending}
            className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun disabled:opacity-50"
          >
            {english ? "Turn off the notification" : "알림 해지"}
          </button>
        </div>
      ) : null}

      {view.kind === "ready" && !view.subscribed && canSubscribe ? (
        <fieldset className="mt-3 space-y-3" disabled={pending}>
          <legend className="sr-only">{english ? "Marketing consent" : "광고성 정보 수신 동의"}</legend>
          <label className="flex gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.currentTarget.checked)}
              className="mt-0.5 accent-hobun"
            />
            <span>
              {english
                ? "(Optional) I agree to receive marketing information about product launches and the start of sales at my account email."
                : "(선택) 제품 출시·판매 시작 안내 등 광고성 정보를 계정 이메일로 받는 데 동의합니다."}
            </span>
          </label>
          <button
            type="button"
            onClick={() => void update(true)}
            disabled={!agreed || pending}
            className="theme-control inline-flex min-h-11 items-center border border-hobun bg-hobun px-4 text-xs font-medium text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {english ? "Sign up for the notification" : "알림 신청"}
          </button>
        </fieldset>
      ) : null}

      {error ? (
        <p className="mt-3 text-red-200" role="status">
          {english ? "We couldn't save your choice. Please try again." : "선택을 저장하지 못했습니다. 다시 시도해 주세요."}
        </p>
      ) : null}
    </section>
  );
}
