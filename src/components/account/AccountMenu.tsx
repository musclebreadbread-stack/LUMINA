"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { accountAuthClient } from "@/lib/auth-client";
import { localePath, type Locale } from "@/i18n/locale";
import { SignOutButton } from "./SignOutButton";

type MenuState = "idle" | "loading" | "signed_out" | "signed_in" | "error";

interface AccountMenuProps {
  readonly locale: Locale;
}

/**
 * 모든 페이지 하단에 놓이는 계정 메뉴(Track C4). 펼치기 전에는 아무 요청도 보내지
 * 않는다 — 방문마다 세션을 조회하면 익명 방문 대부분이 쓸모없는 요청을 한 번씩 더
 * 치르므로, 세션 상태는 메뉴를 처음 열 때 한 번만 확인한다.
 */
export function AccountMenu({ locale }: AccountMenuProps) {
  const t = useTranslations("nav");
  const [state, setState] = useState<MenuState>("idle");

  async function loadSession(): Promise<void> {
    setState("loading");
    try {
      const result = await accountAuthClient.getSession();
      setState(result.data?.user ? "signed_in" : "signed_out");
    } catch {
      setState("error");
    }
  }

  return (
    <details
      className="group relative"
      onToggle={(event) => {
        if (event.currentTarget.open && (state === "idle" || state === "error")) void loadSession();
      }}
    >
      <summary className="cursor-pointer list-none text-hobun-faint underline-offset-4 hover:text-hobun hover:underline focus-visible:text-hobun">
        {t("account")}
      </summary>
      <div className="mt-2 flex min-w-56 flex-col items-start gap-2 border border-ink-700 bg-ink-950/80 p-3">
        {state === "loading" ? <p className="text-hobun-faint" role="status">{t("accountChecking")}</p> : null}
        {state === "error" ? <p className="text-red-200" role="status">{t("accountUnavailable")}</p> : null}
        {state === "signed_out" ? (
          <Link href={localePath("/account/sign-in", locale)} className="text-hobun underline underline-offset-4">
            {t("accountSignIn")}
          </Link>
        ) : null}
        {state === "signed_in" ? (
          <>
            <Link href={localePath("/account", locale)} className="text-hobun underline underline-offset-4">
              {t("accountMyPage")}
            </Link>
            <Link href={localePath("/account/subscriptions", locale)} className="text-hobun underline underline-offset-4">
              {t("accountSubscriptions")}
            </Link>
            <SignOutButton locale={locale} />
          </>
        ) : null}
      </div>
    </details>
  );
}
