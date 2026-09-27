import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SignInPanel } from "@/components/account/SignInPanel";
import { isLocale, localePath } from "@/i18n/locale";
import { getMemberAuthCaptchaSiteKey, getMemberSocialProviders, isMemberAuthConfigured } from "@/server/auth";

export const metadata: Metadata = {
  title: "LUMINA Account",
  robots: { index: false, follow: false },
};

export default async function AccountSignInPage() {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const available = isMemberAuthConfigured();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <LocaleSwitcher />
      </header>
      <div className="py-10">
        {available ? (
          <SignInPanel
            locale={locale}
            providers={getMemberSocialProviders()}
            captchaSiteKey={getMemberAuthCaptchaSiteKey() ?? ""}
          />
        ) : (
          <section className="border border-ink-700 bg-ink-900/40 p-5 sm:p-7">
            <h1 className="text-2xl font-medium text-hobun">{locale !== "ko" ? "Member accounts are being prepared" : "회원 계정을 준비하고 있습니다"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {locale !== "ko"
                ? "Sign-in will open after the database, consent documents, and email delivery are ready."
                : "DB, 동의 문서와 이메일 발송 준비가 끝난 뒤 계정 기능을 시작합니다."}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
